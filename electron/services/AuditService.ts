import { getDb } from '../database/index'
import type { SessionUser } from '../database/repositories/AuthRepository'

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGED'
  | 'CREATE_FACILITY'
  | 'UPDATE_FACILITY'
  | 'DELETE_FACILITY'
  | 'ADD_DRAWDOWN'
  | 'ADD_REPAYMENT'
  | 'RENEW_FACILITY'
  | 'SUBSIDIARY_REPAY'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DEACTIVATE_USER'
  | 'RESET_PASSWORD'
  | 'CREATE_GROUP'
  | 'DELETE_GROUP'
  | 'IMPORT_DATA'
  | 'EXPORT_DATA'

export function writeAudit(
  user: SessionUser | { id: string; username: string } | null,
  action: AuditAction,
  entityType?: string,
  entityId?: string,
  detail?: unknown
): void {
  try {
    getDb()
      .prepare(`
        INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, detail)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        user?.id ?? null,
        user?.username ?? 'system',
        action,
        entityType ?? null,
        entityId ?? null,
        detail ? JSON.stringify(detail) : null
      )
  } catch {
    // Never let audit errors crash the main action
    console.error('[Audit] Failed to write audit entry:', action)
  }
}
