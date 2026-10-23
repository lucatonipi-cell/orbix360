import { db } from "../client";
import { newId, newToken } from "../../lib/ids";
import { createHash } from "node:crypto";

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export const apiKeysRepo = {
  create(userId: string, name: string): { record: ApiKey; plainKey: string } {
    const secret = newToken(24);
    const prefix = secret.slice(0, 8);
    const plainKey = `orbix_${secret}`;
    const id = newId("key");
    db.prepare(
      `INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix) VALUES (?, ?, ?, ?, ?)`
    ).run(id, userId, name, hashKey(plainKey), prefix);
    return { record: this.findById(id)!, plainKey };
  },

  findById(id: string): ApiKey | undefined {
    return db.prepare(`SELECT * FROM api_keys WHERE id = ?`).get(id) as
      | ApiKey
      | undefined;
  },

  listByUser(userId: string): ApiKey[] {
    return db
      .prepare(`SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`)
      .all(userId) as ApiKey[];
  },

  findByPlainKey(plainKey: string): ApiKey | undefined {
    return db
      .prepare(`SELECT * FROM api_keys WHERE key_hash = ?`)
      .get(hashKey(plainKey)) as ApiKey | undefined;
  },

  touchLastUsed(id: string): void {
    db.prepare(
      `UPDATE api_keys SET last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
    ).run(id);
  },

  delete(id: string, userId: string): boolean {
    const result = db
      .prepare(`DELETE FROM api_keys WHERE id = ? AND user_id = ?`)
      .run(id, userId);
    return result.changes > 0;
  },
};
