import { useContext } from 'react'
import { AuthContext } from './AuthContext'
import type { SessionUser } from '../../shared/types/api'

export function useAuth() {
  return useContext(AuthContext)
}

export function usePermissions() {
  const { currentUser } = useContext(AuthContext)

  return {
    canWrite: currentUser?.role === 'Admin' || currentUser?.role === 'Manager',
    canDelete: currentUser?.role === 'Admin',
    canManageUsers: currentUser?.role === 'Admin',
    canViewAuditLog: currentUser?.role === 'Admin' || currentUser?.role === 'Auditor',
    canExport: true, // all roles
    hasRole: (role: SessionUser['role']) => currentUser?.role === role,
  }
}
