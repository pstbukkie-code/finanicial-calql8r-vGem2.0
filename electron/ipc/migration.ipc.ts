import { ipcMain } from 'electron'
import { MIGRATION } from '../../shared/ipc-channels'
import { AuthService } from '../services/AuthService'
import { MigrationService } from '../services/MigrationService'

export function registerMigrationHandlers(): void {
  ipcMain.handle(MIGRATION.IS_NEEDED, (_e) => {
    return MigrationService.isMigrationNeeded()
  })

  ipcMain.handle(MIGRATION.IMPORT_LOCALSTORAGE, (_e, data: unknown) => {
    // Migration runs on behalf of whoever is in session, or 'system' if called
    // before login (first-ever launch with existing localStorage data)
    const user = AuthService.checkSession()
    const userId = user?.id ?? 'system'
    MigrationService.importLocalStorage(data as Parameters<typeof MigrationService.importLocalStorage>[0], userId)
    return { ok: true }
  })
}
