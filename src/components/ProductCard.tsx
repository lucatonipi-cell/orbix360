import React from "react";
import type { Product } from "../db/repositories/products.repo";

const STATUS_LABEL: Record<Product["status"], string> = {
  draft: "Rascunho",
  processing: "A processar",
  ready: "Pronto",
};

export function ProductCard({
  product,
  imageCount,
  coverUrl,
}: {
  product: Product;
  imageCount: number;
  coverUrl: string | null;
}) {
  const date = new Date(product.updated_at).toLocaleDateString("pt-PT");
  return (
    <div className="card product-card">
      <a href={`/products/${product.id}`} className="product-card-thumb">
        {coverUrl ? (
          <img src={coverUrl} alt={product.name} loading="lazy" />
        ) : (
          <span className="product-card-thumb-empty">Sem imagens</span>
        )}
      </a>
      <div className="product-card-body">
        <a href={`/products/${product.id}`} className="product-card-title">
          {product.name}
        </a>
        <span className={`badge badge-${product.status}`}>{STATUS_LABEL[product.status]}</span>
        <span className="product-card-meta">
          {imageCount} {imageCount === 1 ? "imagem" : "imagens"} · {date}
        </span>
      </div>
      <div className="product-card-actions">
        <a href={`/products/${product.id}`} className="btn btn-secondary btn-sm">Abrir</a>
        <a href={`/products/${product.id}/edit`} className="btn btn-secondary btn-sm">Editar</a>
        <form
          method="POST"
          action={`/products/${product.id}/delete`}
          data-confirm="Eliminar este produto e todas as imagens associadas?"
        >
          <button type="submit" className="btn btn-danger btn-sm">Eliminar</button>
        </form>
      </div>
    </div>
  );
}
