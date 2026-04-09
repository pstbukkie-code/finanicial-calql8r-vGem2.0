import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { AUTH, FACILITIES, CONFIG, ADMIN, MIGRATION } from '../shared/ipc-channels'

const api = {
  auth: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke(AUTH.LOGIN, username, password),
    logout: () =>
      ipcRenderer.invoke(AUTH.LOGOUT),
    checkSession: () =>
      ipcRenderer.invoke(AUTH.CHECK_SESSION),
    changePassword: (oldPw: string, newPw: string) =>
      ipcRenderer.invoke(AUTH.CHANGE_PASSWORD, oldPw, newPw),
  },

  facilities: {
    getAll: () =>
      ipcRenderer.invoke(FACILITIES.GET_ALL),
    create: (f: unknown) =>
      ipcRenderer.invoke(FACILITIES.CREATE, f),
    update: (f: unknown) =>
      ipcRenderer.invoke(FACILITIES.UPDATE, f),
    delete: (id: string) =>
      ipcRenderer.invoke(FACILITIES.DELETE, id),
    addDrawdown: (facilityId: string, drawdown: unknown) =>
      ipcRenderer.invoke(FACILITIES.ADD_DRAWDOWN, facilityId, drawdown),
    addRepayment: (facilityId: string, repayment: unknown, drawdownUpdates: unknown) =>
      ipcRenderer.invoke(FACILITIES.ADD_REPAYMENT, facilityId, repayment, drawdownUpdates),
    renewFacility: (oldId: string, renewalData: unknown) =>
      ipcRenderer.invoke(FACILITIES.RENEW, oldId, renewalData),
    subsidiaryRepay: (facilityId: string, drawdownId: string, amount: number) =>
      ipcRenderer.invoke(FACILITIES.SUBSIDIARY_REPAY, facilityId, drawdownId, amount),
  },

  config: {
    getCurrencies: () =>
      ipcRenderer.invoke(CONFIG.GET_CURRENCIES),
    setCurrencies: (currencies: unknown) =>
      ipcRenderer.invoke(CONFIG.SET_CURRENCIES, currencies),
    getBanks: () =>
      ipcRenderer.invoke(CONFIG.GET_BANKS),
    addBank: (name: string) =>
      ipcRenderer.invoke(CONFIG.ADD_BANK, name),
    removeBank: (name: string) =>
      ipcRenderer.invoke(CONFIG.REMOVE_BANK, name),
    getSubsidiaries: () =>
      ipcRenderer.invoke(CONFIG.GET_SUBSIDIARIES),
    addSubsidiary: (name: string) =>
      ipcRenderer.invoke(CONFIG.ADD_SUBSIDIARY, name),
    removeSubsidiary: (name: string) =>
      ipcRenderer.invoke(CONFIG.REMOVE_SUBSIDIARY, name),
  },

  admin: {
    getUsers: () =>
      ipcRenderer.invoke(ADMIN.GET_USERS),
    createUser: (user: unknown) =>
      ipcRenderer.invoke(ADMIN.CREATE_USER, user),
    updateUser: (id: string, changes: unknown) =>
      ipcRenderer.invoke(ADMIN.UPDATE_USER, id, changes),
    deactivateUser: (id: string) =>
      ipcRenderer.invoke(ADMIN.DEACTIVATE_USER, id),
    resetPassword: (id: string, newPassword: string) =>
      ipcRenderer.invoke(ADMIN.RESET_PASSWORD, id, newPassword),
    getGroups: () =>
      ipcRenderer.invoke(ADMIN.GET_GROUPS),
    createGroup: (name: string) =>
      ipcRenderer.invoke(ADMIN.CREATE_GROUP, name),
    deleteGroup: (id: string) =>
      ipcRenderer.invoke(ADMIN.DELETE_GROUP, id),
    getAuditLog: (filters: unknown) =>
      ipcRenderer.invoke(ADMIN.GET_AUDIT_LOG, filters),
  },

  migration: {
    isMigrationNeeded: () =>
      ipcRenderer.invoke(MIGRATION.IS_NEEDED),
    importLocalStorage: (data: unknown) =>
      ipcRenderer.invoke(MIGRATION.IMPORT_LOCALSTORAGE, data),
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Preload context bridge error:', error)
  }
}
