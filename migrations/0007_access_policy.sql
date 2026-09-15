CREATE TABLE IF NOT EXISTS access_policy (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  max_uses INTEGER NOT NULL CHECK (max_uses > 0 AND max_uses <= 1000),
  valid_days INTEGER NOT NULL CHECK (valid_days > 0 AND valid_days <= 3650),
  updated_at TEXT NOT NULL
);
