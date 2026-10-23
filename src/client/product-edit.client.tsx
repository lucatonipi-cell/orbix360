import React from "react";
import { createRoot } from "react-dom/client";
import { ProductEditorApp } from "../components/ProductEditorApp";

const dataEl = document.getElementById("__DATA__");
const data = dataEl ? JSON.parse(dataEl.textContent || "{}") : {};

const mount = document.getElementById("editor-mount");
if (mount) {
  const root = createRoot(mount);
  root.render(
    <ProductEditorApp
      productId={data.product.id}
      initialImages={data.images}
      initialRows={data.rows}
      initialSequence={data.sequence}
    />
  );
}
