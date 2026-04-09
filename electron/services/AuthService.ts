import bcrypt from 'bcryptjs'
import { safeStorage } from 'electron'
import { AuthRepository, type SessionUser } from '../database/repositories/AuthRepository'
import { writeAudit } from './AuditService'

const TOKEN_STORAGE_KEY = 'creditdesk_session_token'

export const AuthService = {
  async login(
    username: string,
    password: string
  ): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
    const user = AuthRepository.findByUsername(username)
    if (!user) {
      writeAudit(null, 'LOGIN_FAILED', 'auth', undefined, { username })
      return { ok: false, error: 'Invalid username or password' }
    }

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      writeAudit({ id: user.id, username: user.username }, 'LOGIN_FAILED', 'auth', user.id)
      return { ok: false, error: 'Invalid username or password' }
    }

    const token = AuthRepository.createSession(user.id)
    this.storeToken(token)

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      groupId: user.group_id,
    }

    writeAudit(sessionUser, 'LOGIN', 'auth', user.id)
    return { ok: true, user: sessionUser }
  },

  logout(user: SessionUser): void {
    const token = this.getStoredToken()
    if (token) {
      AuthRepository.revokeSession(token)
      this.clearToken()
    }
    writeAudit(user, 'LOGOUT', 'auth', user.id)
  },

  checkSession(): SessionUser | null {
    const token = this.getStoredToken()
    if (!token) return null
    const user = AuthRepository.validateSession(token)
    if (!user) this.clearToken()
    return user
  },

  async changePassword(
    user: SessionUser,
    oldPassword: string,
    newPassword: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const dbUser = AuthRepository.findById(user.id)
    if (!dbUser) return { ok: false, error: 'User not found' }

    const match = await bcrypt.compare(oldPassword, dbUser.password_hash)
    if (!match) return { ok: false, error: 'Current password is incorrect' }

    const newHash = await bcrypt.hash(newPassword, 12)
    AuthRepository.updatePassword(user.id, newHash)
    AuthRepository.revokeAllForUser(user.id)
    this.clearToken()

    writeAudit(user, 'PASSWORD_CHANGED', 'auth', user.id)
    return { ok: true }
  },

  // ── Token stored in OS-encrypted safeStorage ───────────────────────────────

  storeToken(token: string): void {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(token)
      // Store base64-encoded so we can write it to a text config
      const { writeFileSync, mkdirSync } = require('fs')
      const { app } = require('electron')
      const { join } = require('path')
      const dir = app.getPath('userData')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, TOKEN_STORAGE_KEY + '.bin'), encrypted)
    }
  },

  getStoredToken(): string | null {
    try {
      const { readFileSync, existsSync } = require('fs')
      const { app } = require('electron')
      const { join } = require('path')
      const filePath = join(app.getPath('userData'), TOKEN_STORAGE_KEY + '.bin')
      if (!existsSync(filePath)) return null
      const encrypted = readFileSync(filePath)
      return safeStorage.decryptString(encrypted)
    } catch {
      return null
    }
  },

  clearToken(): void {
    try {
      const { unlinkSync, existsSync } = require('fs')
      const { app } = require('electron')
      const { join } = require('path')
      const filePath = join(app.getPath('userData'), TOKEN_STORAGE_KEY + '.bin')
      if (existsSync(filePath)) unlinkSync(filePath)
    } catch {
      // ignore
    }
  },
}
