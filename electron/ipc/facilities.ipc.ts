import { ipcMain } from 'electron'
import { FACILITIES } from '../../shared/ipc-channels'
import { AuthService } from '../services/AuthService'
import { FacilityRepository } from '../database/repositories/FacilityRepository'
import { writeAudit } from '../services/AuditService'
import type { SessionUser } from '../database/repositories/AuthRepository'

type Role = SessionUser['role']

function requireAuth(): SessionUser {
  const user = AuthService.checkSession()
  if (!user) throw new Error('Not authenticated')
  return user
}

function requireRole(user: SessionUser, ...roles: Role[]): void {
  if (!roles.includes(user.role)) {
    throw new Error(`Role '${user.role}' is not permitted to perform this action`)
  }
}

export function registerFacilityHandlers(): void {
  ipcMain.handle(FACILITIES.GET_ALL, (_e) => {
    requireAuth()
    return FacilityRepository.getAll()
  })

  ipcMain.handle(FACILITIES.CREATE, (_e, facility: unknown) => {
    const user = requireAuth()
    requireRole(user, 'Admin', 'Manager')
    const result = FacilityRepository.create(facility as Record<string, unknown>, user.id)
    writeAudit(user, 'CREATE_FACILITY', 'facility', (facility as Record<string, unknown>).id as string)
    return result
  })

  ipcMain.handle(FACILITIES.UPDATE, (_e, facility: unknown) => {
    const user = requireAuth()
    requireRole(user, 'Admin', 'Manager')
    const f = facility as Record<string, unknown>
    const before = FacilityRepository.getById(f.id as string)
    const result = FacilityRepository.update(f, user.id)
    writeAudit(user, 'UPDATE_FACILITY', 'facility', f.id as string, { before, after: f })
    return result
  })

  ipcMain.handle(FACILITIES.DELETE, (_e, id: string) => {
    const user = requireAuth()
    requireRole(user, 'Admin')
    const before = FacilityRepository.getById(id)
    FacilityRepository.delete(id)
    writeAudit(user, 'DELETE_FACILITY', 'facility', id, { before })
    return { ok: true }
  })

  ipcMain.handle(FACILITIES.ADD_DRAWDOWN, (_e, facilityId: string, drawdown: unknown) => {
    const user = requireAuth()
    requireRole(user, 'Admin', 'Manager')
    const result = FacilityRepository.addDrawdown(
      facilityId,
      drawdown as Record<string, unknown>,
      user.id
    )
    writeAudit(user, 'ADD_DRAWDOWN', 'drawdown', (drawdown as Record<string, unknown>).id as string, { facilityId })
    return result
  })

  ipcMain.handle(
    FACILITIES.ADD_REPAYMENT,
    (_e, facilityId: string, repayment: unknown, drawdownUpdates: unknown) => {
      const user = requireAuth()
      requireRole(user, 'Admin', 'Manager')
      const result = FacilityRepository.addRepayment(
        facilityId,
        repayment as Record<string, unknown>,
        drawdownUpdates as { id: string; repaid: number }[],
        user.id
      )
      writeAudit(user, 'ADD_REPAYMENT', 'repayment', (repayment as Record<string, unknown>).id as string, { facilityId })
      return result
    }
  )

  ipcMain.handle(FACILITIES.RENEW, (_e, oldId: string, renewalData: unknown) => {
    const user = requireAuth()
    requireRole(user, 'Admin', 'Manager')
    const result = FacilityRepository.renewFacility(
      oldId,
      renewalData as Record<string, unknown>,
      user.id
    )
    writeAudit(user, 'RENEW_FACILITY', 'facility', oldId, { renewalData })
    return result
  })

  ipcMain.handle(
    FACILITIES.SUBSIDIARY_REPAY,
    (_e, facilityId: string, drawdownId: string, amount: number) => {
      const user = requireAuth()
      requireRole(user, 'Admin', 'Manager')
      const result = FacilityRepository.subsidiaryRepay(facilityId, drawdownId, amount, user.id)
      writeAudit(user, 'SUBSIDIARY_REPAY', 'drawdown', drawdownId, { facilityId, amount })
      return result
    }
  )
}
