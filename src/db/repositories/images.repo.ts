import { db } from "../client";
import { newId } from "../../lib/ids";
import { transaction } from "../client";
import { naturalCompare } from "../../lib/image-processing/naturalSort";

export interface ImageRow {
  id: string;
  product_id: string;
  row_id: string;
  filename: string;
  original_url: string;
  thumbnail_url: string;
  medium_url: string;
  large_url: string;
  width: number;
  height: number;
  file_size: number;
  sort_order: number;
  created_at: string;
}

export const imagesRepo = {
  create(input: Omit<ImageRow, "id" | "created_at">): ImageRow {
    const id = newId("img");
    db.prepare(
      `INSERT INTO images (id, product_id, row_id, filename, original_url, thumbnail_url, medium_url, large_url, width, height, file_size, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.product_id,
      input.row_id,
      input.filename,
      input.original_url,
      input.thumbnail_url,
      input.medium_url,
      input.large_url,
      input.width,
      input.height,
      input.file_size,
      input.sort_order
    );
    return this.findById(id)!;
  },

  findById(id: string): ImageRow | undefined {
    return db.prepare(`SELECT * FROM images WHERE id = ?`).get(id) as
      | ImageRow
      | undefined;
  },

  /** All images of a product, across every row — ordered by row then position. */
  listByProduct(productId: string): ImageRow[] {
    return db
      .prepare(
        `SELECT i.* FROM images i
         LEFT JOIN sequence_rows r ON r.id = i.row_id
         WHERE i.product_id = ?
         ORDER BY COALESCE(r.row_order, 0) ASC, i.sort_order ASC`
      )
      .all(productId) as ImageRow[];
  },

  listByRow(rowId: string): ImageRow[] {
    return db
      .prepare(`SELECT * FROM images WHERE row_id = ? ORDER BY sort_order ASC`)
      .all(rowId) as ImageRow[];
  },

  nextSortOrder(rowId: string): number {
    const row = db
      .prepare(`SELECT COALESCE(MAX(sort_order), -1) as m FROM images WHERE row_id = ?`)
      .get(rowId) as { m: number };
    return row.m + 1;
  },

  /** Reorders the frames within a single row (rows never mix frame order). */
  reorder(rowId: string, orderedIds: string[]): void {
    transaction(() => {
      orderedIds.forEach((imageId, index) => {
        db.prepare(
          `UPDATE images SET sort_order = ? WHERE id = ? AND row_id = ?`
        ).run(index, imageId, rowId);
      });
    });
  },

  delete(id: string, productId: string): boolean {
    const result = db
      .prepare(`DELETE FROM images WHERE id = ? AND product_id = ?`)
      .run(id, productId);
    return result.changes > 0;
  },

  countByProduct(productId: string): number {
    const row = db
      .prepare(`SELECT COUNT(*) as c FROM images WHERE product_id = ?`)
      .get(productId) as { c: number };
    return row.c;
  },

  countByUser(userId: string): number {
    const row = db
      .prepare(
        `SELECT COUNT(*) as c FROM images i JOIN products p ON p.id = i.product_id WHERE p.user_id = ?`
      )
      .get(userId) as { c: number };
    return row.c;
  },

  totalBytesForUser(userId: string): number {
    const row = db
      .prepare(
        `SELECT COALESCE(SUM(i.file_size), 0) as s FROM images i JOIN products p ON p.id = i.product_id WHERE p.user_id = ?`
      )
      .get(userId) as { s: number };
    return row.s;
  },

  /**
   * Re-sorts every image of a *row* by natural filename order (so "img2"
   * comes before "img10"). Called after each upload completes — uploads
   * race concurrently on the client, so arrival order does not reflect
   * filename order. A later manual drag-and-drop reorder simply overwrites
   * sort_order again and is never touched by this function. Scoped to a
   * single row so uploading more frames to one angle never reshuffles
   * another angle's already-arranged frames.
   */
  renormalizeByFilename(rowId: string): void {
    const rows = this.listByRow(rowId);
    const sorted = [...rows].sort((a, b) => naturalCompare(a.filename, b.filename));
    transaction(() => {
      sorted.forEach((row, index) => {
        db.prepare(`UPDATE images SET sort_order = ? WHERE id = ?`).run(index, row.id);
      });
    });
  },

  coverForProduct(productId: string): ImageRow | undefined {
    const rows = this.listByProduct(productId);
    return rows[0];
  },
};
