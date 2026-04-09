import { ipcMain } from 'electron'
import { AUTH } from '../../shared/ipc-channels'
import { AuthService } from '../services/AuthService'

export function registerAuthHandlers(): void {
  ipcMain.handle(AUTH.LOGIN, async (_e, username: string, password: string) => {
    return AuthService.login(username, password)
  })

  ipcMain.handle(AUTH.LOGOUT, (_e) => {
    const user = AuthService.checkSession()
    if (user) AuthService.logout(user)
    return { ok: true }
  })

  ipcMain.handle(AUTH.CHECK_SESSION, (_e) => {
    return AuthService.checkSession()
  })

  ipcMain.handle(AUTH.CHANGE_PASSWORD, async (_e, oldPw: string, newPw: string) => {
    const user = AuthService.checkSession()
    if (!user) return { ok: false, error: 'Not authenticated' }
    if (!newPw || newPw.length < 8) return { ok: false, error: 'Password must be at least 8 characters' }
    return AuthService.changePassword(user, oldPw, newPw)
  })
}
