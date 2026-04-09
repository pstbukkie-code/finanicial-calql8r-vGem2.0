import { registerAuthHandlers } from './auth.ipc'
import { registerFacilityHandlers } from './facilities.ipc'
import { registerConfigHandlers } from './config.ipc'
import { registerAdminHandlers } from './admin.ipc'
import { registerMigrationHandlers } from './migration.ipc'

export function registerAllHandlers(): void {
  registerAuthHandlers()
  registerFacilityHandlers()
  registerConfigHandlers()
  registerAdminHandlers()
  registerMigrationHandlers()
}
