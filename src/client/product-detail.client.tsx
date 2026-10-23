import React from "react";
import { createRoot } from "react-dom/client";
import { Viewer360 } from "../components/Viewer360";
import { createAnalyticsTracker } from "./analytics";

const dataEl = document.getElementById("__DATA__");
const data = dataEl ? JSON.parse(dataEl.textContent || "{}") : {};
const productId = window.location.pathname.split("/")[2];
const tracker = createAnalyticsTracker(productId);

const mount = document.getElementById("viewer-mount");
if (mount) {
  const images: any[] = data.images || [];
  const rowDefs: any[] = data.rows && data.rows.length ? data.rows : [{ id: "default", label: "Nível", row_order: 0 }];
  const rows = rowDefs.map((row) => ({
    id: row.id,
    label: row.label,
    frames: images
      .filter((img) => (row.id === "default" ? !img.row_id || img.row_id === row.id : img.row_id === row.id))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({ thumbnailUrl: img.thumbnail_url, mediumUrl: img.medium_url, largeUrl: img.large_url })),
  }));
  const seq = data.sequence || {};
  const settings = {
    autoRotate: !!seq.auto_rotate,
    rotateSpeed: seq.rotate_speed || "normal",
    zoomEnabled: !!seq.zoom_enabled,
    fullscreenEnabled: !!seq.fullscreen_enabled,
    controlsEnabled: !!seq.controls_enabled,
    background: seq.background || "#ffffff",
  };
  const root = createRoot(mount);
  root.render(
    <Viewer360 rows={rows} settings={settings} onInteraction={(k) => tracker.trackInteraction(k)} />
  );
}
