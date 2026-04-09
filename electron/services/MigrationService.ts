import { FacilityRepository } from '../database/repositories/FacilityRepository'
import { ConfigRepository } from '../database/repositories/ConfigRepository'
import { getDb } from '../database/index'

interface LocalStorageExport {
  facilities?: unknown[]
  banks?: string[]
  subsidiaries?: string[]
  currencies?: { code: string; rate: number }[]
}

export const MigrationService = {
  isMigrationNeeded(): boolean {
    const done = ConfigRepository.getAppConfig('migration_v1_done')
    return done === null
  },

  importLocalStorage(data: LocalStorageExport, userId: string): void {
    const db = getDb()

    db.transaction(() => {
      // Import currencies
      if (data.currencies?.length) {
        ConfigRepository.setCurrencies(data.currencies)
      }

      // Import banks
      for (const bank of data.banks ?? []) {
        ConfigRepository.addBank(bank)
      }

      // Import subsidiaries
      for (const sub of data.subsidiaries ?? []) {
        ConfigRepository.addSubsidiary(sub)
      }

      // Import facilities (with their nested drawdowns and repayments)
      for (const fac of data.facilities ?? []) {
        try {
          FacilityRepository.create(fac as Record<string, unknown>, userId)
        } catch (err) {
          console.error('[Migration] Failed to import facility:', (fac as Record<string, unknown>).id, err)
        }
      }

      ConfigRepository.setAppConfig('migration_v1_done', new Date().toISOString())
    })()

    console.log('[Migration] localStorage data imported successfully')
  },
}
