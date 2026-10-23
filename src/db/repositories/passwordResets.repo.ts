import { db } from "../client";
import { newId } from "../../lib/ids";

export interface PasswordReset {
  id: string;
  user_id: string;
  expires_at: string;
  used: number;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export const passwordResetsRepo = {
  create(userId: string): PasswordReset {
    const id = newId("reset");
    const expiresAt = new Date(Date.now() + ONE_HOUR_MS).toISOString();
    db.prepare(
      `INSERT INTO password_resets (id, user_id, expires_at) VALUES (?, ?, ?)`
    ).run(id, userId, expiresAt);
    return { id, user_id: userId, expires_at: expiresAt, used: 0 };
  },

  findValid(id: string): PasswordReset | undefined {
    const reset = db
      .prepare(`SELECT * FROM password_resets WHERE id = ?`)
      .get(id) as PasswordReset | undefined;
    if (!reset) return undefined;
    if (reset.used || new Date(reset.expires_at).getTime() < Date.now()) {
      return undefined;
    }
    return reset;
  },

  markUsed(id: string): void {
    db.prepare(`UPDATE password_resets SET used = 1 WHERE id = ?`).run(id);
  },
};
