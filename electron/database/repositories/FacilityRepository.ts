import { getDb } from '../index'

/** Reconstitutes a full facility object by merging its row data with
 *  current drawdowns and repayments from their own tables. */
function hydrateFacility(row: Record<string, unknown>): unknown {
  const db = getDb()
  const facility = JSON.parse(row.data as string)
  facility.id = row.id
  facility.loanNumber = row.loan_number

  const drawdownRows = db
    .prepare('SELECT data FROM drawdowns WHERE facility_id = ? ORDER BY created_at ASC')
    .all(row.id as string)
  facility.drawdowns = drawdownRows.map((d: Record<string, unknown>) =>
    JSON.parse(d.data as string)
  )

  const repaymentRows = db
    .prepare('SELECT data FROM repayments WHERE facility_id = ? ORDER BY created_at ASC')
    .all(row.id as string)
  facility.repayments = repaymentRows.map((r: Record<string, unknown>) =>
    JSON.parse(r.data as string)
  )

  return facility
}

export const FacilityRepository = {
  getAll(): unknown[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM facilities ORDER BY created_at ASC').all()
    return (rows as Record<string, unknown>[]).map(hydrateFacility)
  },

  create(facility: Record<string, unknown>, userId: string): unknown {
    const db = getDb()
    const { id, loanNumber, drawdowns, repayments, ...rest } = facility
    db.prepare(`
      INSERT INTO facilities (id, loan_number, data, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, loanNumber ?? null, JSON.stringify(rest), userId, userId)

    // Persist initial drawdowns/repayments if any (e.g. from import)
    const insertDD = db.prepare(
      'INSERT INTO drawdowns (id, facility_id, data, created_by) VALUES (?, ?, ?, ?)'
    )
    const insertRP = db.prepare(
      'INSERT INTO repayments (id, facility_id, data, created_by) VALUES (?, ?, ?, ?)'
    )
    db.transaction(() => {
      for (const d of (drawdowns as Record<string, unknown>[]) ?? []) {
        insertDD.run(d.id, id, JSON.stringify(d), userId)
      }
      for (const r of (repayments as Record<string, unknown>[]) ?? []) {
        insertRP.run(r.id, id, JSON.stringify(r), userId)
      }
    })()

    return this.getById(id as string)
  },

  update(facilityPartial: Record<string, unknown>, userId: string): unknown {
    const db = getDb()
    const { id, loanNumber, drawdowns: _d, repayments: _r, ...rest } = facilityPartial
    db.prepare(`
      UPDATE facilities
      SET data = json_patch(data, ?), loan_number = COALESCE(?, loan_number),
          updated_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(rest), loanNumber ?? null, userId, id)
    return this.getById(id as string)
  },

  delete(id: string): void {
    getDb().prepare('DELETE FROM facilities WHERE id = ?').run(id)
  },

  getById(id: string): unknown {
    const db = getDb()
    const row = db.prepare('SELECT * FROM facilities WHERE id = ?').get(id)
    if (!row) throw new Error(`Facility ${id} not found`)
    return hydrateFacility(row as Record<string, unknown>)
  },

  addDrawdown(facilityId: string, drawdown: Record<string, unknown>, userId: string): unknown {
    const db = getDb()
    db.prepare(
      'INSERT INTO drawdowns (id, facility_id, data, created_by) VALUES (?, ?, ?, ?)'
    ).run(drawdown.id, facilityId, JSON.stringify(drawdown), userId)

    // Touch facility updated_at
    db.prepare("UPDATE facilities SET updated_at = datetime('now'), updated_by = ? WHERE id = ?")
      .run(userId, facilityId)

    return this.getById(facilityId)
  },

  addRepayment(
    facilityId: string,
    repayment: Record<string, unknown>,
    drawdownUpdates: { id: string; repaid: number }[],
    userId: string
  ): unknown {
    const db = getDb()
    db.transaction(() => {
      db.prepare(
        'INSERT INTO repayments (id, facility_id, data, created_by) VALUES (?, ?, ?, ?)'
      ).run(repayment.id, facilityId, JSON.stringify(repayment), userId)

      // Apply FIFO repaid updates to each affected drawdown's data blob
      for (const { id, repaid } of drawdownUpdates) {
        const row = db.prepare('SELECT data FROM drawdowns WHERE id = ?').get(id) as
          | Record<string, unknown>
          | undefined
        if (!row) continue
        const d = JSON.parse(row.data as string)
        d.repaid = repaid
        db.prepare('UPDATE drawdowns SET data = ? WHERE id = ?').run(
          JSON.stringify(d),
          id
        )
      }

      db.prepare("UPDATE facilities SET updated_at = datetime('now'), updated_by = ? WHERE id = ?")
        .run(userId, facilityId)
    })()

    return this.getById(facilityId)
  },

  subsidiaryRepay(
    facilityId: string,
    drawdownId: string,
    amount: number,
    userId: string
  ): unknown {
    const db = getDb()
    const row = db.prepare('SELECT data FROM drawdowns WHERE id = ?').get(drawdownId) as
      | Record<string, unknown>
      | undefined
    if (!row) throw new Error(`Drawdown ${drawdownId} not found`)
    const d = JSON.parse(row.data as string)
    d.subsidiaryRepaid = (d.subsidiaryRepaid || 0) + amount
    db.prepare('UPDATE drawdowns SET data = ? WHERE id = ?').run(JSON.stringify(d), drawdownId)
    db.prepare("UPDATE facilities SET updated_at = datetime('now'), updated_by = ? WHERE id = ?")
      .run(userId, facilityId)
    return this.getById(facilityId)
  },

  renewFacility(
    oldId: string,
    renewalData: Record<string, unknown>,
    userId: string
  ): { old: unknown; new: unknown } {
    const db = getDb()
    const oldFac = this.getById(oldId) as Record<string, unknown>

    db.transaction(() => {
      // Mark old facility as Renewed
      const oldData = JSON.parse(
        (db.prepare('SELECT data FROM facilities WHERE id = ?').get(oldId) as Record<string, unknown>).data as string
      )
      oldData.status = 'Renewed'
      oldData.remarks = `${oldData.remarks || ''}\nRenewed on ${renewalData.startDate}`
      db.prepare("UPDATE facilities SET data = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?")
        .run(JSON.stringify(oldData), userId, oldId)

      // Create new facility carrying over drawdowns and repayments
      const newId = 'F' + Date.now()
      const { drawdowns: _d, repayments: _r, id: _id, loanNumber: _ln, ...restOld } = oldFac
      const newData = {
        ...restOld,
        ...renewalData,
        status: 'Active',
        remarks: `Renewal of facility ${oldFac.facilityName}`,
      }
      const newLoanNumber = `LN-${String(Date.now()).slice(-6)}`
      db.prepare(`
        INSERT INTO facilities (id, loan_number, data, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(newId, newLoanNumber, JSON.stringify(newData), userId, userId)

      // Copy drawdowns and repayments to the new facility
      const dds = db.prepare('SELECT * FROM drawdowns WHERE facility_id = ?').all(oldId)
      const rps = db.prepare('SELECT * FROM repayments WHERE facility_id = ?').all(oldId)
      for (const d of dds as Record<string, unknown>[]) {
        db.prepare(
          'INSERT INTO drawdowns (id, facility_id, data, created_by) VALUES (?, ?, ?, ?)'
        ).run('D' + Date.now() + Math.random(), newId, d.data, userId)
      }
      for (const r of rps as Record<string, unknown>[]) {
        db.prepare(
          'INSERT INTO repayments (id, facility_id, data, created_by) VALUES (?, ?, ?, ?)'
        ).run('R' + Date.now() + Math.random(), newId, r.data, userId)
      }
    })()

    return {
      old: this.getById(oldId),
      new: this.getById('F' + Date.now()), // approximate — caller uses getAll() to refresh
    }
  },
}
