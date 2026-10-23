import { db } from "../client";
import { newId } from "../../lib/ids";

export type EventType = "view" | "rotate" | "zoom" | "fullscreen";

export interface AnalyticsEvent {
  id: string;
  product_id: string;
  event_type: EventType;
  session_id: string;
  device: string | null;
  browser: string | null;
  created_at: string;
}

export interface AnalyticsSession {
  id: string;
  product_id: string;
  started_at: string;
  ended_at: string | null;
  rotation_count: number;
  device: string | null;
  browser: string | null;
}

export const analyticsRepo = {
  recordEvent(
    productId: string,
    eventType: EventType,
    sessionId: string,
    device: string | null,
    browser: string | null
  ): void {
    db.prepare(
      `INSERT INTO analytics_events (id, product_id, event_type, session_id, device, browser)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(newId("evt"), productId, eventType, sessionId, device, browser);
  },

  startSession(productId: string, sessionId: string, device: string | null, browser: string | null): void {
    db.prepare(
      `INSERT INTO analytics_sessions (id, product_id, device, browser) VALUES (?, ?, ?, ?)`
    ).run(sessionId, productId, device, browser);
  },

  touchSession(sessionId: string, incrementRotation: boolean): void {
    db.prepare(
      `UPDATE analytics_sessions SET ended_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
       rotation_count = rotation_count + ? WHERE id = ?`
    ).run(incrementRotation ? 1 : 0, sessionId);
  },

  statsForProduct(productId: string) {
    const views = db
      .prepare(`SELECT COUNT(*) as c FROM analytics_events WHERE product_id = ? AND event_type = 'view'`)
      .get(productId) as { c: number };
    const interactions = db
      .prepare(
        `SELECT COUNT(*) as c FROM analytics_events WHERE product_id = ? AND event_type IN ('rotate','zoom','fullscreen')`
      )
      .get(productId) as { c: number };
    const avg = db
      .prepare(
        `SELECT AVG((julianday(COALESCE(ended_at, started_at)) - julianday(started_at)) * 86400) as avg_seconds
         FROM analytics_sessions WHERE product_id = ?`
      )
      .get(productId) as { avg_seconds: number | null };

    return {
      views: views.c,
      interactions: interactions.c,
      avgViewingSeconds: Math.round(avg.avg_seconds ?? 0),
    };
  },

  statsForUser(userId: string) {
    const row = db
      .prepare(
        `SELECT COUNT(*) as c FROM analytics_events e
         JOIN products p ON p.id = e.product_id
         WHERE p.user_id = ? AND e.event_type = 'view'`
      )
      .get(userId) as { c: number };
    return { totalViews: row.c };
  },
};
