// Additive migration 0001; test-cloud.mjs checks this against the SQL source.
export const schema = [
  "-- Additive and safe to run again. Never clears existing learning records.\nCREATE TABLE IF NOT EXISTS cloud_users (\n  id TEXT PRIMARY KEY, google_sub TEXT NOT NULL UNIQUE, email TEXT NOT NULL,\n  created_at INTEGER NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS cloud_sessions (\n  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES cloud_users(id),\n  expires_at INTEGER NOT NULL\n)",
  "CREATE INDEX IF NOT EXISTS cloud_sessions_expiry ON cloud_sessions(expires_at)",
  "CREATE TABLE IF NOT EXISTS cloud_oauth (\n  state_hash TEXT PRIMARY KEY, verifier TEXT NOT NULL, nonce TEXT NOT NULL,\n  expires_at INTEGER NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS cloud_progress (\n  user_id TEXT PRIMARY KEY REFERENCES cloud_users(id), revision INTEGER NOT NULL,\n  raw TEXT NOT NULL, updated_at INTEGER NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS cloud_history (\n  user_id TEXT NOT NULL REFERENCES cloud_users(id), revision INTEGER NOT NULL,\n  raw TEXT NOT NULL, updated_at INTEGER NOT NULL,\n  PRIMARY KEY(user_id, revision)\n)",
  "CREATE TABLE IF NOT EXISTS cloud_limits (\n  bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL\n)"
];
