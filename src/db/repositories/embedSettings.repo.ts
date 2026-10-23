import { db } from "../client";
import { newId } from "../../lib/ids";

export interface EmbedSettings {
  id: string;
  product_id: string;
  default_width: string;
  default_height: string;
  responsive: number;
  created_at: string;
}

export const embedSettingsRepo = {
  findByProduct(productId: string): EmbedSettings | undefined {
    return db
      .prepare(`SELECT * FROM embed_settings WHERE product_id = ?`)
      .get(productId) as EmbedSettings | undefined;
  },

  ensure(productId: string): EmbedSettings {
    const existing = this.findByProduct(productId);
    if (existing) return existing;
    const id = newId("embed");
    db.prepare(
      `INSERT INTO embed_settings (id, product_id) VALUES (?, ?)`
    ).run(id, productId);
    return this.findByProduct(productId)!;
  },

  update(
    productId: string,
    fields: Partial<Pick<EmbedSettings, "default_width" | "default_height" | "responsive">>
  ): EmbedSettings {
    const existing = this.ensure(productId);
    const merged = { ...existing, ...fields };
    db.prepare(
      `UPDATE embed_settings SET default_width=?, default_height=?, responsive=? WHERE product_id=?`
    ).run(merged.default_width, merged.default_height, merged.responsive, productId);
    return this.findByProduct(productId)!;
  },
};
