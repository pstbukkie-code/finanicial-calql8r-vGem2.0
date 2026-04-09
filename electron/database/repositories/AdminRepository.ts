import { getDb } from '../index'
import { randomUUID } from 'crypto'

export interface UserRow {
  id: string
  username: string
  display_name: string
  email: string | null
  role: 'Admin' | 'Manager' | 'Viewer' | 'Auditor'
  group_id: string | null
  group_name: string | null
  is_active: number
  created_at: string
  last_login: string | null
}

export interface AuditFilters {
  userId?: string
  entityType?: string
  fromDate?: string
  toDate?: string
  limit?: number
  offset?: number
}

export const AdminRepository = {
  // ── Users ──────────────────────────────────────────────────────────────────

  getUsers(): UserRow[] {
    return getDb().prepare(`
      SELECT u.id, u.username, u.display_name, u.email, u.role,
             u.group_id, g.name AS group_name, u.is_active, u.created_at, u.last_login
      FROM users u
      LEFT JOIN groups g ON g.id = u.group_id
      ORDER BY u.created_at ASC
    `).all() as UserRow[]
  },

  createUser(user: {
    username: string
    displayName: string
    email?: string
    passwordHash: string
    role: string
    groupId?: string
  }): UserRow {
    const db = getDb()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO users (id, username, display_name, email, password_hash, role, group_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      user.username,
      user.displayName,
      user.email ?? null,
      user.passwordHash,
      user.role,
      user.groupId ?? null
    )
    return this.getUserById(id)!
  },

  getUserById(id: string): UserRow | undefined {
    return getDb().prepare(`
      SELECT u.id, u.username, u.display_name, u.email, u.role,
             u.group_id, g.name AS group_name, u.is_active, u.created_at, u.last_login
      FROM users u
      LEFT JOIN groups g ON g.id = u.group_id
      WHERE u.id = ?
    `).get(id) as UserRow | undefined
  },

  updateUser(id: string, changes: Partial<{
    displayName: string
    email: string
    role: string
    groupId: string | null
  }>): UserRow {
    const db = getDb()
    if (changes.displayName !== undefined)
      db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(changes.displayName, id)
    if (changes.email !== undefined)
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(changes.email, id)
    if (changes.role !== undefined)
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(changes.role, id)
    if (changes.groupId !== undefined)
      db.prepare('UPDATE users SET group_id = ? WHERE id = ?').run(changes.groupId, id)
    return this.getUserById(id)!
  },

  deactivateUser(id: string): void {
    getDb().prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id)
    // Revoke all active sessions
    getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(id)
  },

  // ── Groups ─────────────────────────────────────────────────────────────────

  getGroups(): { id: string; name: string; memberCount: number }[] {
    return getDb().prepare(`
      SELECT g.id, g.name,
             COUNT(u.id) AS memberCount
      FROM groups g
      LEFT JOIN users u ON u.group_id = g.id AND u.is_active = 1
      GROUP BY g.id
      ORDER BY g.name ASC
    `).all() as { id: string; name: string; memberCount: number }[]
  },

  createGroup(name: string): { id: string; name: string } {
    const db = getDb()
    const id = randomUUID()
    db.prepare('INSERT INTO groups (id, name) VALUES (?, ?)').run(id, name)
    return { id, name }
  },

  deleteGroup(id: string): void {
    getDb().prepare('UPDATE users SET group_id = NULL WHERE group_id = ?').run(id)
    getDb().prepare('DELETE FROM groups WHERE id = ?').run(id)
  },

  // ── Audit Log ──────────────────────────────────────────────────────────────

  getAuditLog(filters: AuditFilters = {}): unknown[] {
    const conditions: string[] = []
    const params: unknown[] = []

    if (filters.userId) {
      conditions.push('user_id = ?')
      params.push(filters.userId)
    }
    if (filters.entityType) {
      conditions.push('entity_type = ?')
      params.push(filters.entityType)
    }
    if (filters.fromDate) {
      conditions.push('occurred_at >= ?')
      params.push(filters.fromDate)
    }
    if (filters.toDate) {
      conditions.push('occurred_at <= ?')
      params.push(filters.toDate)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = filters.limit ?? 200
    const offset = filters.offset ?? 0

    return getDb()
      .prepare(
        `SELECT * FROM audit_log ${where} ORDER BY occurred_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset)
  },
}
