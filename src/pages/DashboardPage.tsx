import React from "react";
import { renderDocument } from "./Document";
import { AppLayout } from "./AppLayout";
import type { Product } from "../db/repositories/products.repo";

export interface DashboardData {
  userName: string;
  productCount: number;
  imageCount: number;
  totalViews: number;
  storageBytes: number;
  recentProducts: Product[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1024;
    unit++;
  } while (value >= 1024 && unit < units.length - 1);
  return `${value.toFixed(1)} ${units[unit]}`;
}

export function renderDashboardPage(data: DashboardData) {
  return renderDocument({
    title: "Dashboard",
    children: (
      <AppLayout
        activePath="/dashboard"
        userName={data.userName}
        title="Dashboard"
        actions={
          <>
            <a href="/products/new" className="btn btn-primary">+ Novo produto</a>
            <a href="/products" className="btn btn-secondary">Ver produtos</a>
          </>
        }
      >
        <div className="stat-grid">
          <div className="card stat-tile">
            <div className="stat-tile-label">Produtos</div>
            <div className="stat-tile-value">{data.productCount}</div>
          </div>
          <div className="card stat-tile">
            <div className="stat-tile-label">Imagens</div>
            <div className="stat-tile-value">{data.imageCount}</div>
          </div>
          <div className="card stat-tile">
            <div className="stat-tile-label">Visualizações 360º</div>
            <div className="stat-tile-value">{data.totalViews}</div>
          </div>
          <div className="card stat-tile">
            <div className="stat-tile-label">Armazenamento usado</div>
            <div className="stat-tile-value">{formatBytes(data.storageBytes)}</div>
          </div>
        </div>

        <div className="section-heading" style={{ marginTop: 32 }}>
          <h2>Últimos produtos</h2>
        </div>
        {data.recentProducts.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-title">Ainda não tens produtos</div>
            <p>Cria o teu primeiro produto para começares a fazer upload de imagens.</p>
            <a href="/products/new" className="btn btn-primary" style={{ marginTop: 16 }}>
              + Novo produto
            </a>
          </div>
        ) : (
          <div className="card">
            {data.recentProducts.map((p) => (
              <div key={p.id} className="activity-item" style={{ padding: "12px 20px" }}>
                <span>▣</span>
                <div>
                  <a href={`/products/${p.id}`} style={{ fontWeight: 600 }}>{p.name}</a>
                  <div className="muted">
                    Criado em {new Date(p.created_at).toLocaleDateString("pt-PT")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppLayout>
    ),
  });
}
