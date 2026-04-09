import { ipcMain } from 'electron'
import { ADMIN } from '../../shared/ipc-channels'
import { AuthService } from '../services/AuthService'
import { AdminRepository, type AuditFilters } from '../database/repositories/AdminRepository'
import { AuthRepository } from '../database/repositories/AuthRepository'
import { writeAudit } from '../services/AuditService'
import bcrypt from 'bcryptjs'

function requireAdmin() {
  const user = AuthService.checkSession()
  if (!user) throw new Error('Not authenticated')
  if (user.role !== 'Admin') throw new Error('Admin role required')
  return user
}

function requireAdminOrAuditor() {
  const user = AuthService.checkSession()
  if (!user) throw new Error('Not authenticated')
  if (!['Admin', 'Auditor'].includes(user.role)) throw new Error('Admin or Auditor role required')
  return user
}

export function registerAdminHandlers(): void {
  // ── Users ────────────────────────────────────────────────────────────────

  ipcMain.handle(ADMIN.GET_USERS, (_e) => {
    requireAdmin()
    return AdminRepository.getUsers()
  })

  ipcMain.handle(ADMIN.CREATE_USER, async (_e, user: unknown) => {
    const admin = requireAdmin()
    const u = user as {
      username: string
      displayName: string
      email?: string
      password: string
      role: string
      groupId?: string
    }
    const hash = await bcrypt.hash(u.password, 12)
    const created = AdminRepository.createUser({ ...u, passwordHash: hash })
    writeAudit(admin, 'CREATE_USER', 'user', created.id, { username: created.username, role: created.role })
    return created
  })

  ipcMain.handle(ADMIN.UPDATE_USER, (_e, id: string, changes: unknown) => {
    const admin = requireAdmin()
    const updated = AdminRepository.updateUser(id, changes as Parameters<typeof AdminRepository.updateUser>[1])
    writeAudit(admin, 'UPDATE_USER', 'user', id, changes)
    return updated
  })

  ipcMain.handle(ADMIN.DEACTIVATE_USER, (_e, id: string) => {
    const admin = requireAdmin()
    // Prevent deactivating the last active admin
    const users = AdminRepository.getUsers()
    const activeAdmins = users.filter((u) => u.role === 'Admin' && u.is_active === 1)
    if (activeAdmins.length === 1 && activeAdmins[0].id === id) {
      throw new Error('Cannot deactivate the last active Admin account')
    }
    AdminRepository.deactivateUser(id)
    writeAudit(admin, 'DEACTIVATE_USER', 'user', id)
    return { ok: true }
  })

  ipcMain.handle(ADMIN.RESET_PASSWORD, async (_e, id: string, newPassword: string) => {
    const admin = requireAdmin()
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }
    const hash = await bcrypt.hash(newPassword, 12)
    AuthRepository.updatePassword(id, hash)
    AuthRepository.revokeAllForUser(id)
    writeAudit(admin, 'RESET_PASSWORD', 'user', id)
    return { ok: true }
  })

  // ── Groups ────────────────────────────────────────────────────────────────

  ipcMain.handle(ADMIN.GET_GROUPS, (_e) => {
    requireAdmin()
    return AdminRepository.getGroups()
  })

  ipcMain.handle(ADMIN.CREATE_GROUP, (_e, name: string) => {
    const admin = requireAdmin()
    const group = AdminRepository.createGroup(name)
    writeAudit(admin, 'CREATE_GROUP', 'group', group.id, { name })
    return group
  })

  ipcMain.handle(ADMIN.DELETE_GROUP, (_e, id: string) => {
    const admin = requireAdmin()
    AdminRepository.deleteGroup(id)
    writeAudit(admin, 'DELETE_GROUP', 'group', id)
    return { ok: true }
  })

  // ── Audit Log ─────────────────────────────────────────────────────────────

  ipcMain.handle(ADMIN.GET_AUDIT_LOG, (_e, filters: unknown) => {
    requireAdminOrAuditor()
    return AdminRepository.getAuditLog(filters as AuditFilters)
  })
}
