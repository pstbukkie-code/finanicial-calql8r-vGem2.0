-- Core data tables: facilities, drawdowns, repayments, currencies, banks, subsidiaries

CREATE TABLE IF NOT EXISTS facilities (
  id          TEXT PRIMARY KEY,
  loan_number TEXT,
  data        TEXT NOT NULL,  -- full JSON blob of the facility object
  created_by  TEXT,
  updated_by  TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drawdowns (
  id          TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  data        TEXT NOT NULL,  -- full JSON blob of the drawdown object
  created_by  TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS repayments (
  id          TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  data        TEXT NOT NULL,  -- full JSON blob of the repayment object
  created_by  TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS currencies (
  code  TEXT PRIMARY KEY,
  rate  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS banks (
  name  TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS subsidiaries (
  name  TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drawdowns_facility ON drawdowns(facility_id);
CREATE INDEX IF NOT EXISTS idx_repayments_facility ON repayments(facility_id);
