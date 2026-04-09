/**
 * Single source of truth for all IPC channel names used by both the
 * Electron main process (electron/ipc/) and the renderer (window.api via preload).
 */

export const AUTH = {
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  CHECK_SESSION: 'auth:checkSession',
  CHANGE_PASSWORD: 'auth:changePassword',
} as const

export const FACILITIES = {
  GET_ALL: 'facilities:getAll',
  CREATE: 'facilities:create',
  UPDATE: 'facilities:update',
  DELETE: 'facilities:delete',
  ADD_DRAWDOWN: 'facilities:addDrawdown',
  ADD_REPAYMENT: 'facilities:addRepayment',
  RENEW: 'facilities:renewFacility',
  SUBSIDIARY_REPAY: 'facilities:subsidiaryRepay',
} as const

export const CONFIG = {
  GET_CURRENCIES: 'config:getCurrencies',
  SET_CURRENCIES: 'config:setCurrencies',
  GET_BANKS: 'config:getBanks',
  ADD_BANK: 'config:addBank',
  REMOVE_BANK: 'config:removeBank',
  GET_SUBSIDIARIES: 'config:getSubsidiaries',
  ADD_SUBSIDIARY: 'config:addSubsidiary',
  REMOVE_SUBSIDIARY: 'config:removeSubsidiary',
} as const

export const ADMIN = {
  GET_USERS: 'admin:getUsers',
  CREATE_USER: 'admin:createUser',
  UPDATE_USER: 'admin:updateUser',
  DEACTIVATE_USER: 'admin:deactivateUser',
  RESET_PASSWORD: 'admin:resetPassword',
  GET_GROUPS: 'admin:getGroups',
  CREATE_GROUP: 'admin:createGroup',
  DELETE_GROUP: 'admin:deleteGroup',
  GET_AUDIT_LOG: 'admin:getAuditLog',
} as const

export const MIGRATION = {
  IS_NEEDED: 'migration:isMigrationNeeded',
  IMPORT_LOCALSTORAGE: 'migration:importLocalStorage',
} as const
