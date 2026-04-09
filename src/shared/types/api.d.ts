/**
 * TypeScript declarations for window.api — the contextBridge surface
 * exposed by the Electron preload script.
 */

export interface SessionUser {
  id: string
  username: string
  displayName: string
  role: 'Admin' | 'Manager' | 'Viewer' | 'Auditor'
  groupId: string | null
}

export interface Currency {
  code: string
  rate: number
}

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

export interface GroupRow {
  id: string
  name: string
  memberCount: number
}

export interface AuditEntry {
  id: number
  user_id: string | null
  username: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  detail: string | null
  occurred_at: string
}

export interface AuditFilters {
  userId?: string
  entityType?: string
  fromDate?: string
  toDate?: string
  limit?: number
  offset?: number
}

declare global {
  interface Window {
    api: {
      auth: {
        login(
          username: string,
          password: string
        ): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }>
        logout(): Promise<{ ok: boolean }>
        checkSession(): Promise<SessionUser | null>
        changePassword(
          oldPw: string,
          newPw: string
        ): Promise<{ ok: true } | { ok: false; error: string }>
      }

      facilities: {
        getAll(): Promise<unknown[]>
        create(f: unknown): Promise<unknown>
        update(f: unknown): Promise<unknown>
        delete(id: string): Promise<{ ok: boolean }>
        addDrawdown(facilityId: string, drawdown: unknown): Promise<unknown>
        addRepayment(
          facilityId: string,
          repayment: unknown,
          drawdownUpdates: unknown
        ): Promise<unknown>
        renewFacility(oldId: string, renewalData: unknown): Promise<{ old: unknown; new: unknown }>
        subsidiaryRepay(
          facilityId: string,
          drawdownId: string,
          amount: number
        ): Promise<unknown>
      }

      config: {
        getCurrencies(): Promise<Currency[]>
        setCurrencies(currencies: Currency[]): Promise<{ ok: boolean }>
        getBanks(): Promise<string[]>
        addBank(name: string): Promise<string[]>
        removeBank(name: string): Promise<string[]>
        getSubsidiaries(): Promise<string[]>
        addSubsidiary(name: string): Promise<string[]>
        removeSubsidiary(name: string): Promise<string[]>
      }

      admin: {
        getUsers(): Promise<UserRow[]>
        createUser(user: {
          username: string
          displayName: string
          email?: string
          password: string
          role: string
          groupId?: string
        }): Promise<UserRow>
        updateUser(
          id: string,
          changes: Partial<{ displayName: string; email: string; role: string; groupId: string | null }>
        ): Promise<UserRow>
        deactivateUser(id: string): Promise<{ ok: boolean }>
        resetPassword(id: string, newPassword: string): Promise<{ ok: boolean }>
        getGroups(): Promise<GroupRow[]>
        createGroup(name: string): Promise<GroupRow>
        deleteGroup(id: string): Promise<{ ok: boolean }>
        getAuditLog(filters: AuditFilters): Promise<AuditEntry[]>
      }

      migration: {
        isMigrationNeeded(): Promise<boolean>
        importLocalStorage(data: {
          facilities?: unknown[]
          banks?: string[]
          subsidiaries?: string[]
          currencies?: Currency[]
        }): Promise<{ ok: boolean }>
      }
    }
  }
}
