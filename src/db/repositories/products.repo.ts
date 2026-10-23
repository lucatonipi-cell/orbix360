import { db } from "../client";
import { newId } from "../../lib/ids";

export interface Product {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string;
  status: "draft" | "processing" | "ready";
  cover_image_id: string | null;
  created_at: string;
  updated_at: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "produto";
}

export const productsRepo = {
  create(userId: string, name: string, description: string): Product {
    const id = newId("prod");
    const base = slugify(name);
    let slug = base;
    let n = 1;
    while (
      db
        .prepare(`SELECT 1 FROM products WHERE user_id = ? AND slug = ?`)
        .get(userId, slug)
    ) {
      slug = `${base}-${++n}`;
    }
    db.prepare(
      `INSERT INTO products (id, user_id, name, slug, description) VALUES (?, ?, ?, ?, ?)`
    ).run(id, userId, name, slug, description);
    return this.findById(id, userId)!;
  },

  findById(id: string, userId: string): Product | undefined {
    return db
      .prepare(`SELECT * FROM products WHERE id = ? AND user_id = ?`)
      .get(id, userId) as Product | undefined;
  },

  /** Lookup without ownership check — only for public viewer/embed routes. */
  findByIdPublic(id: string): Product | undefined {
    return db.prepare(`SELECT * FROM products WHERE id = ?`).get(id) as
      | Product
      | undefined;
  },

  listByUser(userId: string): Product[] {
    return db
      .prepare(`SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC`)
      .all(userId) as Product[];
  },

  update(
    id: string,
    userId: string,
    fields: Partial<Pick<Product, "name" | "description" | "status" | "cover_image_id">>
  ): Product | undefined {
    const existing = this.findById(id, userId);
    if (!existing) return undefined;
    const merged = { ...existing, ...fields };
    db.prepare(
      `UPDATE products SET name = ?, description = ?, status = ?, cover_image_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ? AND user_id = ?`
    ).run(merged.name, merged.description, merged.status, merged.cover_image_id, id, userId);
    return this.findById(id, userId);
  },

  delete(id: string, userId: string): boolean {
    const result = db
      .prepare(`DELETE FROM products WHERE id = ? AND user_id = ?`)
      .run(id, userId);
    return result.changes > 0;
  },

  touch(id: string): void {
    db.prepare(
      `UPDATE products SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
    ).run(id);
  },
};
