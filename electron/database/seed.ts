import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const DEFAULT_BANKS = [
  'Access Bank',
  'First Bank of Nigeria',
  'Guaranty Trust Bank',
  'United Bank for Africa',
  'Zenith Bank',
  'Stanbic IBTC',
  'Standard Chartered',
  'Citibank Nigeria',
]

const DEFAULT_SUBSIDIARIES = [
  'Upstream',
  'Downstream',
  'Gas & Power',
  'Corporate Finance',
  'Treasury',
  'Refining',
  'Corporate',
]

const DEFAULT_CURRENCIES = [
  { code: 'NGN', rate: 1 },
  { code: 'USD', rate: 1580 },
]

export function seedDefaults(db: Database.Database): void {
  const alreadySeeded = db
    .prepare("SELECT value FROM app_config WHERE key = 'seeded_v1'")
    .get()

  if (alreadySeeded) return

  const insertBank = db.prepare('INSERT OR IGNORE INTO banks (name) VALUES (?)')
  const insertSub = db.prepare('INSERT OR IGNORE INTO subsidiaries (name) VALUES (?)')
  const insertCcy = db.prepare(
    'INSERT OR IGNORE INTO currencies (code, rate) VALUES (?, ?)'
  )

  db.transaction(() => {
    for (const bank of DEFAULT_BANKS) insertBank.run(bank)
    for (const sub of DEFAULT_SUBSIDIARIES) insertSub.run(sub)
    for (const ccy of DEFAULT_CURRENCIES) insertCcy.run(ccy.code, ccy.rate)

    // Create default Admin group
    const adminGroupId = randomUUID()
    db.prepare('INSERT OR IGNORE INTO groups (id, name) VALUES (?, ?)').run(
      adminGroupId,
      'Administrators'
    )

    // Create default admin user — password must be changed on first login
    const adminId = randomUUID()
    const hash = bcrypt.hashSync('Admin@123', 12)
    db.prepare(`
      INSERT OR IGNORE INTO users
        (id, username, display_name, email, password_hash, role, group_id)
      VALUES (?, ?, ?, ?, ?, 'Admin', ?)
    `).run(adminId, 'admin', 'System Administrator', '', hash, adminGroupId)

    db.prepare("INSERT INTO app_config (key, value) VALUES ('seeded_v1', datetime('now'))").run()
  })()

  console.log('[DB] Seeded default data and admin user (admin / Admin@123)')
}
