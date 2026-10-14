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
