-- Daily Report System: shared store for sent reports and their voice messages.
CREATE TABLE IF NOT EXISTS reports (
  id       TEXT PRIMARY KEY,
  site     TEXT NOT NULL,
  zone     TEXT NOT NULL,
  by_uid   TEXT NOT NULL,
  form     TEXT NOT NULL,
  date     TEXT NOT NULL,          -- YYYY-MM-DD, the reporting day
  status   TEXT NOT NULL,
  created  INTEGER NOT NULL,
  sent_at  INTEGER,
  updated  INTEGER NOT NULL,       -- client edit time, newest wins
  received INTEGER NOT NULL,       -- server time, drives incremental pulls
  data     TEXT NOT NULL           -- JSON answers
);
CREATE INDEX IF NOT EXISTS reports_site_received ON reports (site, received);
CREATE INDEX IF NOT EXISTS reports_site_date ON reports (site, date);

CREATE TABLE IF NOT EXISTS clips (
  id      TEXT PRIMARY KEY,
  type    TEXT NOT NULL,
  size    INTEGER NOT NULL,
  body    BLOB NOT NULL,
  created INTEGER NOT NULL
);

-- ===== v2: full DRS (shared data, sign-in, media) =====
CREATE TABLE IF NOT EXISTS kv (
  k    TEXT PRIMARY KEY,
  v    TEXT NOT NULL,
  ts   INTEGER NOT NULL,       -- server time of the last write; pulls ask for ts > since
  site TEXT,                   -- set for per-site keys "@V1S2/…"
  uid  TEXT,                   -- set for personal keys "@u:EP1001/…"
  by_uid TEXT
);
CREATE INDEX IF NOT EXISTS kv_ts ON kv (ts);
CREATE INDEX IF NOT EXISTS kv_site_ts ON kv (site, ts);

CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  pin_hash TEXT, pin_salt TEXT,
  must_change INTEGER NOT NULL DEFAULT 1,
  failed INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, uid TEXT NOT NULL, created INTEGER NOT NULL, last_seen INTEGER NOT NULL, expires INTEGER NOT NULL, ua TEXT
);
CREATE INDEX IF NOT EXISTS sessions_uid ON sessions (uid);
CREATE TABLE IF NOT EXISTS passkeys (
  id TEXT PRIMARY KEY, uid TEXT NOT NULL, public_key TEXT NOT NULL, counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT, device TEXT, created INTEGER NOT NULL, last_used INTEGER
);
CREATE INDEX IF NOT EXISTS passkeys_uid ON passkeys (uid);
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY, challenge TEXT NOT NULL, uid TEXT, kind TEXT NOT NULL, expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
  id TEXT NOT NULL, part INTEGER NOT NULL, type TEXT NOT NULL, size INTEGER NOT NULL, parts INTEGER NOT NULL,
  site TEXT, uid TEXT, body BLOB NOT NULL, created INTEGER NOT NULL, PRIMARY KEY (id, part)
);
