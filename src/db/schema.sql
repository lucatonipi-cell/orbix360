PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS password_resets (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'draft',
  cover_image_id  TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);

CREATE TABLE IF NOT EXISTS images (
  id            TEXT PRIMARY KEY,
  product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  original_url  TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  medium_url    TEXT NOT NULL,
  large_url     TEXT NOT NULL,
  width         INTEGER NOT NULL,
  height        INTEGER NOT NULL,
  file_size     INTEGER NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_images_product ON images(product_id, sort_order);

-- A "row" is one horizontal ring of frames captured at a given vertical
-- angle (e.g. "Nível", "De cima", "De baixo"). A product with a single row
-- behaves exactly like a classic single-axis 360; with several rows the
-- viewer also responds to vertical drag to switch between angles.
CREATE TABLE IF NOT EXISTS sequence_rows (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  row_order  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_sequence_rows_product ON sequence_rows(product_id, row_order);

CREATE TABLE IF NOT EXISTS sequences_360 (
  id                  TEXT PRIMARY KEY,
  product_id          TEXT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  frame_count         INTEGER NOT NULL DEFAULT 0,
  auto_rotate         INTEGER NOT NULL DEFAULT 1,
  rotate_speed        TEXT NOT NULL DEFAULT 'normal',
  zoom_enabled        INTEGER NOT NULL DEFAULT 1,
  fullscreen_enabled  INTEGER NOT NULL DEFAULT 1,
  controls_enabled    INTEGER NOT NULL DEFAULT 1,
  background          TEXT NOT NULL DEFAULT '#ffffff',
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS embed_settings (
  id             TEXT PRIMARY KEY,
  product_id     TEXT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  default_width  TEXT NOT NULL DEFAULT '100%',
  default_height TEXT NOT NULL DEFAULT '600',
  responsive     INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS api_keys (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL,
  key_prefix   TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_used_at TEXT
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  session_id TEXT NOT NULL,
  device     TEXT,
  browser    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_analytics_product ON analytics_events(product_id, event_type);

CREATE TABLE IF NOT EXISTS analytics_sessions (
  id              TEXT PRIMARY KEY,
  product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  started_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ended_at        TEXT,
  rotation_count  INTEGER NOT NULL DEFAULT 0,
  device          TEXT,
  browser         TEXT
);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_product ON analytics_sessions(product_id);
