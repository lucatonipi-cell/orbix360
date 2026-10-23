import { db, transaction } from "../client";
import { newId } from "../../lib/ids";

export interface SequenceRow {
  id: string;
  product_id: string;
  label: string;
  row_order: number;
  created_at: string;
}

export const sequenceRowsRepo = {
  listByProduct(productId: string): SequenceRow[] {
    return db
      .prepare(`SELECT * FROM sequence_rows WHERE product_id = ? ORDER BY row_order ASC`)
      .all(productId) as SequenceRow[];
  },

  findById(id: string, productId: string): SequenceRow | undefined {
    return db
      .prepare(`SELECT * FROM sequence_rows WHERE id = ? AND product_id = ?`)
      .get(id, productId) as SequenceRow | undefined;
  },

  create(productId: string, label: string): SequenceRow {
    const id = newId("row");
    const maxOrder = db
      .prepare(`SELECT COALESCE(MAX(row_order), -1) as m FROM sequence_rows WHERE product_id = ?`)
      .get(productId) as { m: number };
    db.prepare(
      `INSERT INTO sequence_rows (id, product_id, label, row_order) VALUES (?, ?, ?, ?)`
    ).run(id, productId, label, maxOrder.m + 1);
    return this.findById(id, productId)!;
  },

  /** Returns the product's first row, creating a default one if none exists yet. */
  ensureDefault(productId: string): SequenceRow {
    const existing = this.listByProduct(productId);
    if (existing.length > 0) return existing[0];
    return this.create(productId, "Nível");
  },

  rename(id: string, productId: string, label: string): void {
    db.prepare(`UPDATE sequence_rows SET label = ? WHERE id = ? AND product_id = ?`).run(label, id, productId);
  },

  reorder(productId: string, orderedIds: string[]): void {
    transaction(() => {
      orderedIds.forEach((id, index) => {
        db.prepare(`UPDATE sequence_rows SET row_order = ? WHERE id = ? AND product_id = ?`).run(
          index,
          id,
          productId
        );
      });
    });
  },

  delete(id: string, productId: string): boolean {
    const result = db.prepare(`DELETE FROM sequence_rows WHERE id = ? AND product_id = ?`).run(id, productId);
    return result.changes > 0;
  },
};
