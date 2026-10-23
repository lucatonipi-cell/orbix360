import React from "react";
import { renderDocument } from "./Document";
import { AppLayout } from "./AppLayout";
import { EmbedCode } from "../components/EmbedCode";
import type { Product } from "../db/repositories/products.repo";
import type { ImageRow } from "../db/repositories/images.repo";
import type { SequenceRow } from "../db/repositories/sequenceRows.repo";
import type { Sequence360 } from "../db/repositories/sequences.repo";
import type { EmbedSettings } from "../db/repositories/embedSettings.repo";

export interface ProductDetailData {
  userName: string;
  product: Product;
  images: ImageRow[];
  rows: SequenceRow[];
  sequence: Sequence360;
  embed: EmbedSettings;
  stats: { views: number; interactions: number; avgViewingSeconds: number };
  publicBaseUrl: string;
}

export function renderProductDetailPage(data: ProductDetailData) {
  return renderDocument({
    title: data.product.name,
    data: { images: data.images, rows: data.rows, sequence: data.sequence },
    scripts: ["/assets/product-detail.client.js"],
    children: (
      <AppLayout
        activePath="/products"
        userName={data.userName}
        title={data.product.name}
        actions={<a href={`/products/${data.product.id}/edit`} className="btn btn-primary">Editar</a>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }} className="detail-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="card card-padded">
              <div id="viewer-mount">
                <p className="muted">A carregar visualizador…</p>
              </div>
            </div>

            <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <div className="card stat-tile">
                <div className="stat-tile-label">Views</div>
                <div className="stat-tile-value">{data.stats.views}</div>
              </div>
              <div className="card stat-tile">
                <div className="stat-tile-label">Interactions</div>
                <div className="stat-tile-value">{data.stats.interactions}</div>
              </div>
              <div className="card stat-tile">
                <div className="stat-tile-label">Average viewing time</div>
                <div className="stat-tile-value">{data.stats.avgViewingSeconds}s</div>
              </div>
            </div>

            <div className="card card-padded">
              <div className="section-heading">
                <h2>Imagens ({data.images.length})</h2>
              </div>
              {data.rows.length > 1 ? (
                data.rows.map((row) => {
                  const rowImages = data.images.filter((img) => img.row_id === row.id);
                  if (rowImages.length === 0) return null;
                  return (
                    <div key={row.id} style={{ marginBottom: 16 }}>
                      <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>{row.label}</div>
                      <div className="frame-timeline">
                        {rowImages.map((img, i) => (
                          <div key={img.id} className="frame-tile" style={{ cursor: "default" }}>
                            <img src={img.thumbnail_url} alt={`Frame ${i + 1}`} />
                            <span className="frame-tile-index">{String(i + 1).padStart(2, "0")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="frame-timeline">
                  {data.images.map((img, i) => (
                    <div key={img.id} className="frame-tile" style={{ cursor: "default" }}>
                      <img src={img.thumbnail_url} alt={`Frame ${i + 1}`} />
                      <span className="frame-tile-index">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card card-padded">
              <h2 style={{ marginBottom: 8 }}>Detalhes</h2>
              <p className="muted" style={{ fontSize: 13 }}>{data.product.description || "Sem descrição."}</p>
              <div className="settings-row">
                <span className="settings-row-label">Slug</span>
                <span className="muted">{data.product.slug}</span>
              </div>
              <div className="settings-row">
                <span className="settings-row-label">Criado</span>
                <span className="muted">{new Date(data.product.created_at).toLocaleDateString("pt-PT")}</span>
              </div>
            </div>
            <EmbedCode
              productId={data.product.id}
              publicBaseUrl={data.publicBaseUrl}
              width={data.embed.default_width}
              height={data.embed.default_height}
              responsive={!!data.embed.responsive}
            />
          </div>
        </div>
        <style>{`@media (max-width: 900px) { .detail-grid { grid-template-columns: 1fr !important; } }`}</style>
      </AppLayout>
    ),
  });
}
