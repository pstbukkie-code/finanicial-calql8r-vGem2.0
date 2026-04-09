import { ipcMain } from 'electron'
import { CONFIG } from '../../shared/ipc-channels'
import { AuthService } from '../services/AuthService'
import { ConfigRepository } from '../database/repositories/ConfigRepository'

function requireAuth() {
  const user = AuthService.checkSession()
  if (!user) throw new Error('Not authenticated')
  return user
}

export function registerConfigHandlers(): void {
  ipcMain.handle(CONFIG.GET_CURRENCIES, (_e) => {
    requireAuth()
    return ConfigRepository.getCurrencies()
  })

  ipcMain.handle(CONFIG.SET_CURRENCIES, (_e, currencies: unknown) => {
    const user = requireAuth()
    if (!['Admin', 'Manager'].includes(user.role)) {
      throw new Error('Insufficient permissions')
    }
    ConfigRepository.setCurrencies(currencies as { code: string; rate: number }[])
    return { ok: true }
  })

  ipcMain.handle(CONFIG.GET_BANKS, (_e) => {
    requireAuth()
    return ConfigRepository.getBanks()
  })

  ipcMain.handle(CONFIG.ADD_BANK, (_e, name: string) => {
    const user = requireAuth()
    if (!['Admin', 'Manager'].includes(user.role)) throw new Error('Insufficient permissions')
    ConfigRepository.addBank(name)
    return ConfigRepository.getBanks()
  })

  ipcMain.handle(CONFIG.REMOVE_BANK, (_e, name: string) => {
    const user = requireAuth()
    if (!['Admin'].includes(user.role)) throw new Error('Insufficient permissions')
    ConfigRepository.removeBank(name)
    return ConfigRepository.getBanks()
  })

  ipcMain.handle(CONFIG.GET_SUBSIDIARIES, (_e) => {
    requireAuth()
    return ConfigRepository.getSubsidiaries()
  })

  ipcMain.handle(CONFIG.ADD_SUBSIDIARY, (_e, name: string) => {
    const user = requireAuth()
    if (!['Admin', 'Manager'].includes(user.role)) throw new Error('Insufficient permissions')
    ConfigRepository.addSubsidiary(name)
    return ConfigRepository.getSubsidiaries()
  })

  ipcMain.handle(CONFIG.REMOVE_SUBSIDIARY, (_e, name: string) => {
    const user = requireAuth()
    if (!['Admin'].includes(user.role)) throw new Error('Insufficient permissions')
    ConfigRepository.removeSubsidiary(name)
    return ConfigRepository.getSubsidiaries()
  })
}
