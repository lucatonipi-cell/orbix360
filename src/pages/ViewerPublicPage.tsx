import React from "react";
import { renderDocument } from "./Document";
import type { ImageRow } from "../db/repositories/images.repo";
import type { SequenceRow } from "../db/repositories/sequenceRows.repo";
import type { Sequence360 } from "../db/repositories/sequences.repo";

export function renderViewerPublicPage(opts: {
  productName: string;
  images: ImageRow[];
  rows: SequenceRow[];
  sequence: Sequence360;
}) {
  return renderDocument({
    title: opts.productName,
    bodyClassName: "viewer-public-page",
    data: { images: opts.images, rows: opts.rows, sequence: opts.sequence },
    scripts: ["/assets/viewer-public.client.js"],
    children: (
      <div id="viewer-mount" style={{ width: "100%" }}>
        <p className="muted" style={{ textAlign: "center" }}>A carregar…</p>
      </div>
    ),
  });
}

export function renderViewerNotFoundPage() {
  return renderDocument({
    title: "Não encontrado",
    bodyClassName: "viewer-public-page",
    children: (
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Visualizador não encontrado</h1>
        <p className="muted">Este produto não existe ou ainda não tem uma sequência 360º.</p>
      </div>
    ),
  });
}
