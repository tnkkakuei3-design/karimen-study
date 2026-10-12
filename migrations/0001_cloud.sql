-- Additive and safe to run again. Never clears existing learning records.
CREATE TABLE IF NOT EXISTS cloud_users (
  id TEXT PRIMARY KEY, google_sub TEXT NOT NULL UNIQUE, email TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS cloud_sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES cloud_users(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS cloud_sessions_expiry ON cloud_sessions(expires_at);
CREATE TABLE IF NOT EXISTS cloud_oauth (
  state_hash TEXT PRIMARY KEY, verifier TEXT NOT NULL, nonce TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS cloud_progress (
  user_id TEXT PRIMARY KEY REFERENCES cloud_users(id), revision INTEGER NOT NULL,
  raw TEXT NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS cloud_history (
  user_id TEXT NOT NULL REFERENCES cloud_users(id), revision INTEGER NOT NULL,
  raw TEXT NOT NULL, updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, revision)
);
CREATE TABLE IF NOT EXISTS cloud_limits (
  bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
