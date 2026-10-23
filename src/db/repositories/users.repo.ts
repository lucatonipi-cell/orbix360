import { db } from "../client";
import { newId } from "../../lib/ids";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
}

export const usersRepo = {
  create(email: string, passwordHash: string, name: string): User {
    const id = newId("user");
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)`
    ).run(id, email.toLowerCase().trim(), passwordHash, name);
    return this.findById(id)!;
  },

  findByEmail(email: string): User | undefined {
    return db
      .prepare(`SELECT * FROM users WHERE email = ?`)
      .get(email.toLowerCase().trim()) as User | undefined;
  },

  findById(id: string): User | undefined {
    return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as
      | User
      | undefined;
  },

  updatePassword(userId: string, passwordHash: string): void {
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(
      passwordHash,
      userId
    );
  },
};
