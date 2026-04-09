import { getDb } from '../index'
import { randomBytes } from 'crypto'

export interface DbUser {
  id: string
  username: string
  display_name: string
  email: string | null
  password_hash: string
  role: 'Admin' | 'Manager' | 'Viewer' | 'Auditor'
  group_id: string | null
  is_active: number
  created_at: string
  last_login: string | null
}

export interface SessionUser {
  id: string
  username: string
  displayName: string
  role: 'Admin' | 'Manager' | 'Viewer' | 'Auditor'
  groupId: string | null
}

export const AuthRepository = {
  findByUsername(username: string): DbUser | undefined {
    return getDb()
      .prepare('SELECT * FROM users WHERE username = ? AND is_active = 1')
      .get(username) as DbUser | undefined
  },

  findById(id: string): DbUser | undefined {
    return getDb()
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as DbUser | undefined
  },

  /** Creates a new 8-hour session token and returns it. */
  createSession(userId: string): string {
    const db = getDb()
    const token = randomBytes(48).toString('hex')
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

    db.prepare(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
    ).run(token, userId, expiresAt)

    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(userId)

    return token
  },

  /** Returns the session user if the token exists and has not expired. */
  validateSession(token: string): SessionUser | null {
    const db = getDb()
    const row = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.role, u.group_id, s.expires_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND u.is_active = 1
    `).get(token) as (DbUser & { expires_at: string }) | undefined

    if (!row) return null
    if (new Date(row.expires_at) < new Date()) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
      return null
    }

    // Slide the expiry window
    const newExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    db.prepare('UPDATE sessions SET expires_at = ? WHERE token = ?').run(newExpiry, token)

    return {
      id: row.id,
      username: row.username,
      displayName: (row as unknown as Record<string, string>).display_name,
      role: row.role,
      groupId: row.group_id,
    }
  },

  revokeSession(token: string): void {
    getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token)
  },

  revokeAllForUser(userId: string): void {
    getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
  },

  updatePassword(userId: string, newHash: string): void {
    getDb()
      .prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newHash, userId)
  },
}
