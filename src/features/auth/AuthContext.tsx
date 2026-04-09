import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { SessionUser } from '../../shared/types/api'

interface AuthContextValue {
  currentUser: SessionUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  isLoading: true,
  login: async () => ({ ok: false, error: 'Not ready' }),
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount: restore session from the encrypted OS token store
  useEffect(() => {
    window.api.auth
      .checkSession()
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const result = await window.api.auth.login(username, password)
    if (result.ok) {
      setCurrentUser(result.user)
      // Check if a localStorage migration is needed and run it transparently
      try {
        const needed = await window.api.migration.isMigrationNeeded()
        if (needed) {
          const data = {
            facilities: JSON.parse(localStorage.getItem('my_facilities') || '[]'),
            banks: JSON.parse(localStorage.getItem('my_banks') || '[]'),
            subsidiaries: JSON.parse(localStorage.getItem('my_bus') || '[]'),
            currencies: JSON.parse(localStorage.getItem('my_currencies') || '[]'),
          }
          await window.api.migration.importLocalStorage(data)
          // Clear localStorage after successful migration
          localStorage.removeItem('my_facilities')
          localStorage.removeItem('my_banks')
          localStorage.removeItem('my_bus')
          localStorage.removeItem('my_currencies')
        }
      } catch (err) {
        console.warn('[Migration] localStorage migration failed:', err)
      }
      return { ok: true }
    }
    return { ok: false, error: result.error }
  }, [])

  const logout = useCallback(async () => {
    await window.api.auth.logout()
    setCurrentUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
