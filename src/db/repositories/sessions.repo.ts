import { db } from "../client";

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const sessionsRepo = {
  create(token: string, userId: string): Session {
    const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();
    db.prepare(
      `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`
    ).run(token, userId, expiresAt);
    return { id: token, user_id: userId, expires_at: expiresAt, created_at: new Date().toISOString() };
  },

  findValid(token: string): Session | undefined {
    const session = db
      .prepare(`SELECT * FROM sessions WHERE id = ?`)
      .get(token) as Session | undefined;
    if (!session) return undefined;
    if (new Date(session.expires_at).getTime() < Date.now()) {
      this.destroy(token);
      return undefined;
    }
    return session;
  },

  destroy(token: string): void {
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(token);
  },
};
