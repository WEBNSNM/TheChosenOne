CREATE TABLE IF NOT EXISTS access_codes (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  encrypted_code TEXT NOT NULL,
  code_suffix TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'issued', 'active', 'exhausted', 'expired', 'disabled')),
  max_uses INTEGER NOT NULL DEFAULT 10 CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0 AND used_count <= max_uses),
  valid_days INTEGER NOT NULL DEFAULT 7 CHECK (valid_days > 0),
  order_reference TEXT,
  note TEXT,
  issued_at TEXT,
  redeemed_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_access_codes_status ON access_codes(status);
CREATE INDEX IF NOT EXISTS idx_access_codes_code_suffix ON access_codes(code_suffix);
CREATE INDEX IF NOT EXISTS idx_access_codes_order_reference ON access_codes(order_reference);
CREATE INDEX IF NOT EXISTS idx_access_codes_expires_at ON access_codes(expires_at);

CREATE TABLE IF NOT EXISTS access_sessions (
  id TEXT PRIMARY KEY,
  access_code_id TEXT NOT NULL,
  access_code_hash TEXT NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  revoked_at TEXT,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (access_code_id) REFERENCES access_codes(id)
);

CREATE INDEX IF NOT EXISTS idx_access_sessions_access_code_id ON access_sessions(access_code_id);
CREATE INDEX IF NOT EXISTS idx_access_sessions_access_code_hash ON access_sessions(access_code_hash);
CREATE INDEX IF NOT EXISTS idx_access_sessions_revoked_at ON access_sessions(revoked_at);
CREATE INDEX IF NOT EXISTS idx_access_sessions_last_seen_at ON access_sessions(last_seen_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_sessions_one_active_browser ON access_sessions(access_code_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS access_usage_logs (
  id TEXT PRIMARY KEY,
  access_code_id TEXT NOT NULL,
  session_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  model_endpoint TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL CHECK (state IN ('reserved', 'consumed', 'released')),
  error_category TEXT NOT NULL DEFAULT ''
    CHECK (error_category IN ('', 'timeout', 'provider_error', 'validation_error', 'cancelled', 'unknown')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (access_code_id) REFERENCES access_codes(id),
  FOREIGN KEY (session_id) REFERENCES access_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_access_usage_logs_access_code_id ON access_usage_logs(access_code_id);
CREATE INDEX IF NOT EXISTS idx_access_usage_logs_session_id ON access_usage_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_access_usage_logs_state ON access_usage_logs(state);
