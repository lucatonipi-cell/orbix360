import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "orbix360.db");

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

export function runMigrations(): void {
  const schemaPath = path.join(process.cwd(), "src", "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
  runAdditiveMigrations();
}

/**
 * Additive, idempotent migrations for columns introduced after a table
 * already existed in deployed databases. `CREATE TABLE IF NOT EXISTS` in
 * schema.sql can't add a column to a table that's already there, so new
 * columns are ALTERed in here, guarded by a check against the live schema.
 */
function runAdditiveMigrations(): void {
  const imageColumns = db.prepare(`PRAGMA table_info(images)`).all() as Array<{ name: string }>;
  if (!imageColumns.some((c) => c.name === "row_id")) {
    db.exec(`ALTER TABLE images ADD COLUMN row_id TEXT REFERENCES sequence_rows(id)`);
  }

  // Backfill: any product that has images but no row yet gets a single
  // default row, and its existing images are attached to it — this is what
  // makes older single-axis products keep working unchanged.
  const productsNeedingDefaultRow = db
    .prepare(
      `SELECT DISTINCT i.product_id AS id FROM images i
       WHERE i.row_id IS NULL
       AND NOT EXISTS (SELECT 1 FROM sequence_rows r WHERE r.product_id = i.product_id)`
    )
    .all() as Array<{ id: string }>;

  for (const { id: productId } of productsNeedingDefaultRow) {
    const rowId = `row_${productId}_default`;
    db.prepare(
      `INSERT OR IGNORE INTO sequence_rows (id, product_id, label, row_order) VALUES (?, ?, 'Nível', 0)`
    ).run(rowId, productId);
    db.prepare(`UPDATE images SET row_id = ? WHERE product_id = ? AND row_id IS NULL`).run(rowId, productId);
  }
}

/** Wraps a function in a SQLite transaction, rolling back on error. */
export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
