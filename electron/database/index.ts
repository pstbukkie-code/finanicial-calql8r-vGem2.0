import Database from 'better-sqlite3'
import { app } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, mkdirSync, existsSync } from 'fs'

let db: Database.Database

/**
 * Resolve the database file path.
 * Priority order:
 *  1. Custom path stored in app userData config
 *  2. NNPC OneDrive-synced SharePoint folder (shared across all users)
 *  3. App userData fallback (local-only)
 */
function resolveDbPath(): string {
  const userDataPath = app.getPath('userData')
  const configFile = join(userDataPath, 'db-path.txt')

  // 1. Custom path (set via Admin > Settings)
  if (existsSync(configFile)) {
    const custom = readFileSync(configFile, 'utf-8').trim()
    if (custom && existsSync(dirname(custom))) return custom
  }

  // 2. NNPC OneDrive SharePoint shared folder
  const oneDrivePath = join(
    app.getPath('home'),
    'OneDrive - Nigerian National Petroleum Company Limited',
    'Shared Documents',
    'CreditDesk'
  )
  if (existsSync(oneDrivePath)) {
    return join(oneDrivePath, 'creditdesk.db')
  }

  // 3. Local fallback
  mkdirSync(userDataPath, { recursive: true })
  return join(userDataPath, 'creditdesk.db')
}

function runMigrations(database: Database.Database): void {
  // Create a migrations tracking table if it doesn't exist
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `)

  const migrationsDir = join(__dirname, 'migrations')
  const migrationFiles = ['001_core.sql', '002_auth.sql', '003_audit.sql']

  const applied = database
    .prepare('SELECT name FROM _migrations')
    .all()
    .map((r: Record<string, unknown>) => r.name as string)

  for (const file of migrationFiles) {
    if (applied.includes(file)) continue
    const sql = readFileSync(join(migrationsDir, file), 'utf-8')
    database.exec(sql)
    database.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file)
    console.log(`[DB] Applied migration: ${file}`)
  }
}

export function initDatabase(): void {
  const dbPath = resolveDbPath()

  // Ensure the parent directory exists
  mkdirSync(dirname(dbPath), { recursive: true })

  db = new Database(dbPath)

  // Performance and safety pragmas
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')

  runMigrations(db)

  // Seed default data and admin user on first run
  const { seedDefaults } = require('./seed')
  seedDefaults(db)

  console.log(`[DB] Connected: ${dbPath}`)
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}
