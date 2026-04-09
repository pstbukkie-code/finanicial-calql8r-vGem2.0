import { getDb } from '../index'

export const ConfigRepository = {
  getCurrencies(): { code: string; rate: number }[] {
    return getDb().prepare('SELECT code, rate FROM currencies ORDER BY code').all() as {
      code: string
      rate: number
    }[]
  },

  setCurrencies(currencies: { code: string; rate: number }[]): void {
    const db = getDb()
    const upsert = db.prepare(
      'INSERT INTO currencies (code, rate) VALUES (?, ?) ON CONFLICT(code) DO UPDATE SET rate = excluded.rate'
    )
    db.transaction(() => {
      for (const c of currencies) upsert.run(c.code, c.rate)
    })()
  },

  getBanks(): string[] {
    return (
      getDb().prepare('SELECT name FROM banks ORDER BY name').all() as { name: string }[]
    ).map((r) => r.name)
  },

  addBank(name: string): void {
    getDb().prepare('INSERT OR IGNORE INTO banks (name) VALUES (?)').run(name)
  },

  removeBank(name: string): void {
    getDb().prepare('DELETE FROM banks WHERE name = ?').run(name)
  },

  getSubsidiaries(): string[] {
    return (
      getDb()
        .prepare('SELECT name FROM subsidiaries ORDER BY name')
        .all() as { name: string }[]
    ).map((r) => r.name)
  },

  addSubsidiary(name: string): void {
    getDb().prepare('INSERT OR IGNORE INTO subsidiaries (name) VALUES (?)').run(name)
  },

  removeSubsidiary(name: string): void {
    getDb().prepare('DELETE FROM subsidiaries WHERE name = ?').run(name)
  },

  getAppConfig(key: string): string | null {
    const row = getDb()
      .prepare('SELECT value FROM app_config WHERE key = ?')
      .get(key) as { value: string } | undefined
    return row?.value ?? null
  },

  setAppConfig(key: string, value: string): void {
    getDb()
      .prepare(
        'INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      )
      .run(key, value)
  },
}
