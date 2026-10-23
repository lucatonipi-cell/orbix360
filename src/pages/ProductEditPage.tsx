import React from "react";
import { renderDocument } from "./Document";
import { AppLayout } from "./AppLayout";
import type { Product } from "../db/repositories/products.repo";
import type { ImageRow } from "../db/repositories/images.repo";
import type { SequenceRow } from "../db/repositories/sequenceRows.repo";
import type { Sequence360 } from "../db/repositories/sequences.repo";

export interface ProductEditData {
  userName: string;
  product: Product;
  images: ImageRow[];
  rows: SequenceRow[];
  sequence: Sequence360;
}

export function renderProductEditPage(data: ProductEditData) {
  return renderDocument({
    title: `Editar · ${data.product.name}`,
    data: {
      product: data.product,
      images: data.images,
      rows: data.rows,
      sequence: data.sequence,
    },
    scripts: ["/assets/product-edit.client.js"],
    children: (
      <AppLayout
        activePath="/products"
        userName={data.userName}
        title={`Editor 360 · ${data.product.name}`}
        actions={<a href={`/products/${data.product.id}`} className="btn btn-secondary">Ver produto</a>}
      >
        <div id="editor-mount">
          <p className="muted">A carregar editor…</p>
        </div>
      </AppLayout>
    ),
  });
}
