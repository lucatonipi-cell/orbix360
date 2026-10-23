import { db } from "../client";
import { newId } from "../../lib/ids";

export interface Sequence360 {
  id: string;
  product_id: string;
  frame_count: number;
  auto_rotate: number;
  rotate_speed: "slow" | "normal" | "fast";
  zoom_enabled: number;
  fullscreen_enabled: number;
  controls_enabled: number;
  background: string;
  created_at: string;
  updated_at: string;
}

export type Sequence360Input = Partial<
  Pick<
    Sequence360,
    | "frame_count"
    | "auto_rotate"
    | "rotate_speed"
    | "zoom_enabled"
    | "fullscreen_enabled"
    | "controls_enabled"
    | "background"
  >
>;

export const sequencesRepo = {
  findByProduct(productId: string): Sequence360 | undefined {
    return db
      .prepare(`SELECT * FROM sequences_360 WHERE product_id = ?`)
      .get(productId) as Sequence360 | undefined;
  },

  upsert(productId: string, input: Sequence360Input): Sequence360 {
    const existing = this.findByProduct(productId);
    if (!existing) {
      const id = newId("seq");
      db.prepare(
        `INSERT INTO sequences_360 (id, product_id, frame_count, auto_rotate, rotate_speed, zoom_enabled, fullscreen_enabled, controls_enabled, background)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        productId,
        input.frame_count ?? 0,
        input.auto_rotate ?? 1,
        input.rotate_speed ?? "normal",
        input.zoom_enabled ?? 1,
        input.fullscreen_enabled ?? 1,
        input.controls_enabled ?? 1,
        input.background ?? "#ffffff"
      );
      return this.findByProduct(productId)!;
    }
    const merged = { ...existing, ...input };
    db.prepare(
      `UPDATE sequences_360 SET frame_count=?, auto_rotate=?, rotate_speed=?, zoom_enabled=?, fullscreen_enabled=?, controls_enabled=?, background=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE product_id = ?`
    ).run(
      merged.frame_count,
      merged.auto_rotate,
      merged.rotate_speed,
      merged.zoom_enabled,
      merged.fullscreen_enabled,
      merged.controls_enabled,
      merged.background,
      productId
    );
    return this.findByProduct(productId)!;
  },
};
