-- Immutable audit log for all user actions

CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT,
  username    TEXT,
  action      TEXT NOT NULL,    -- e.g. 'CREATE_FACILITY', 'ADD_DRAWDOWN', 'LOGIN'
  entity_type TEXT,             -- e.g. 'facility', 'drawdown', 'user'
  entity_id   TEXT,
  detail      TEXT,             -- JSON: { before, after } for edits; descriptive for others
  occurred_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
