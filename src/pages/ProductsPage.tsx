import React from "react";
import { renderDocument } from "./Document";
import { AppLayout } from "./AppLayout";
import { ProductCard } from "../components/ProductCard";
import type { Product } from "../db/repositories/products.repo";

export interface ProductListItem {
  product: Product;
  imageCount: number;
  coverUrl: string | null;
}

export function renderProductsPage(userName: string, items: ProductListItem[]) {
  return renderDocument({
    title: "Produtos",
    children: (
      <AppLayout
        activePath="/products"
        userName={userName}
        title="Produtos"
        actions={<a href="/products/new" className="btn btn-primary">+ Novo produto</a>}
      >
        {items.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-state-title">Ainda não tens produtos</div>
            <p>Cria um produto e faz upload das fotografias para gerares o teu primeiro 360º.</p>
            <a href="/products/new" className="btn btn-primary" style={{ marginTop: 16 }}>
              + Novo produto
            </a>
          </div>
        ) : (
          <div className="product-grid">
            {items.map((item) => (
              <ProductCard
                key={item.product.id}
                product={item.product}
                imageCount={item.imageCount}
                coverUrl={item.coverUrl}
              />
            ))}
          </div>
        )}
      </AppLayout>
    ),
  });
}

export function renderNewProductPage(userName: string, error?: string) {
  return renderDocument({
    title: "Novo produto",
    children: (
      <AppLayout activePath="/products" userName={userName} title="Novo produto">
        <div className="card card-padded" style={{ maxWidth: 480 }}>
          {error && <div className="form-error-banner">{error}</div>}
          <form method="POST" action="/products/new">
            <div className="field">
              <label htmlFor="name">Nome do produto</label>
              <input id="name" name="name" type="text" required autoFocus placeholder="Ex: Ténis Runner X" />
            </div>
            <div className="field">
              <label htmlFor="description">Descrição</label>
              <textarea id="description" name="description" rows={4} placeholder="Opcional" />
            </div>
            <button type="submit" className="btn btn-primary">Criar produto</button>
          </form>
        </div>
      </AppLayout>
    ),
  });
}
