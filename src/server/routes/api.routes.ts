import type { Router } from "../router";
import { json, type Ctx } from "../context";
import { requireAuthApi } from "../middleware/requireAuthApi";
import { productsRepo } from "../../db/repositories/products.repo";
import { imagesRepo } from "../../db/repositories/images.repo";
import { sequencesRepo } from "../../db/repositories/sequences.repo";
import { embedSettingsRepo } from "../../db/repositories/embedSettings.repo";
import { analyticsRepo, type EventType } from "../../db/repositories/analytics.repo";
import { newId } from "../../lib/ids";
import { detectImageMime, processImage } from "../../lib/image-processing/processImage";
import { requireString, oneOf, ValidationError } from "../../lib/validation/validators";
import { storage, keyFromUrl } from "../../lib/storage";
import type { ImageRow } from "../../db/repositories/images.repo";
import { sequenceRowsRepo } from "../../db/repositories/sequenceRows.repo";

async function deleteImageFiles(image: ImageRow): Promise<void> {
  await Promise.all(
    [image.original_url, image.thumbnail_url, image.medium_url, image.large_url].map((url) =>
      storage.delete(keyFromUrl(url)).catch(() => {})
    )
  );
}

function publicBaseUrl(ctx: Ctx): string {
  const host = ctx.req.headers.host ?? "localhost";
  const proto = (ctx.req.headers["x-forwarded-proto"] as string) ?? "http";
  return `${proto}://${host}`;
}

export function registerApiRoutes(router: Router) {
  // ---- Products ----

  router.get("/api/products", (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    json(ctx, 200, { products: productsRepo.listByUser(user.id) });
  });

  router.post("/api/products", (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    try {
      const name = requireString(ctx.body.name, "name", { min: 2, max: 140 });
      const description = typeof ctx.body.description === "string" ? ctx.body.description : "";
      const product = productsRepo.create(user.id, name, description);
      sequencesRepo.upsert(product.id, {});
      embedSettingsRepo.ensure(product.id);
      json(ctx, 201, { product });
    } catch (err) {
      json(ctx, 400, { error: err instanceof ValidationError ? err.message : "Pedido inválido." });
    }
  });

  router.get("/api/products/:id", (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const product = productsRepo.findById(ctx.params.id, user.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    json(ctx, 200, { product, images: imagesRepo.listByProduct(product.id) });
  });

  router.put("/api/products/:id", (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const existing = productsRepo.findById(ctx.params.id, user.id);
    if (!existing) return json(ctx, 404, { error: "Produto não encontrado." });
    const product = productsRepo.update(ctx.params.id, user.id, {
      name: typeof ctx.body.name === "string" ? ctx.body.name : existing.name,
      description: typeof ctx.body.description === "string" ? ctx.body.description : existing.description,
      status: existing.status,
      cover_image_id: existing.cover_image_id,
    });
    json(ctx, 200, { product });
  });

  router.delete("/api/products/:id", async (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const product = productsRepo.findById(ctx.params.id, user.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    const images = imagesRepo.listByProduct(product.id);
    productsRepo.delete(product.id, user.id);
    await Promise.all(images.map(deleteImageFiles));
    json(ctx, 200, { ok: true });
  });

  // ---- Rows (vertical angles / axes) ----

  router.get("/api/products/:id/rows", (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const product = productsRepo.findById(ctx.params.id, user.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    json(ctx, 200, { rows: sequenceRowsRepo.listByProduct(product.id) });
  });

  router.post("/api/products/:id/rows", (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const product = productsRepo.findById(ctx.params.id, user.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    try {
      const label = requireString(ctx.body.label, "label", { min: 1, max: 60 });
      json(ctx, 201, { row: sequenceRowsRepo.create(product.id, label) });
    } catch (err) {
      json(ctx, 400, { error: err instanceof ValidationError ? err.message : "Pedido inválido." });
    }
  });

  router.patch("/api/products/:id/rows/reorder", (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const product = productsRepo.findById(ctx.params.id, user.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    const orderedIds = Array.isArray(ctx.body.orderedIds) ? (ctx.body.orderedIds as string[]) : [];
    if (!orderedIds.length) return json(ctx, 400, { error: "orderedIds é obrigatório." });
    sequenceRowsRepo.reorder(product.id, orderedIds);
    json(ctx, 200, { rows: sequenceRowsRepo.listByProduct(product.id) });
  });

  router.delete("/api/products/:id/rows/:rowId", async (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const product = productsRepo.findById(ctx.params.id, user.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    const images = imagesRepo.listByRow(ctx.params.rowId);
    // Images reference the row via a foreign key (no cascade), so their DB
    // rows must be removed before the row itself can be deleted.
    for (const image of images) imagesRepo.delete(image.id, product.id);
    const deleted = sequenceRowsRepo.delete(ctx.params.rowId, product.id);
    if (!deleted) return json(ctx, 404, { error: "Linha não encontrada." });
    await Promise.all(images.map(deleteImageFiles));
    json(ctx, 200, { ok: true });
  });

  // ---- Images ----

  router.get("/api/products/:id/images", (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const product = productsRepo.findById(ctx.params.id, user.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    json(ctx, 200, { images: imagesRepo.listByProduct(product.id) });
  });

  router.post("/api/products/:id/images", async (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const product = productsRepo.findById(ctx.params.id, user.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });

    const file = ctx.files.find((f) => f.fieldName === "image") ?? ctx.files[0];
    if (!file) return json(ctx, 400, { error: "Nenhum ficheiro enviado." });

    const mime = detectImageMime(file.data);
    if (!mime) return json(ctx, 400, { error: "Formato de imagem não suportado (usa JPG, PNG ou WEBP)." });
    if (file.data.length > 25 * 1024 * 1024) return json(ctx, 400, { error: "Imagem demasiado grande (máx. 25MB)." });

    // The row (angle/axis) this frame belongs to — falls back to the
    // product's default row for API clients that don't send one.
    const requestedRowId = typeof ctx.body.row_id === "string" ? ctx.body.row_id : undefined;
    const row = (requestedRowId && sequenceRowsRepo.findById(requestedRowId, product.id)) || sequenceRowsRepo.ensureDefault(product.id);

    try {
      const imageId = newId("img");
      const processed = await processImage(file.data, `${user.id}/${product.id}/${imageId}`, file.filename);
      const image = imagesRepo.create({
        product_id: product.id,
        row_id: row.id,
        filename: file.filename,
        original_url: processed.originalUrl,
        thumbnail_url: processed.thumbnailUrl,
        medium_url: processed.mediumUrl,
        large_url: processed.largeUrl,
        width: processed.width,
        height: processed.height,
        file_size: processed.fileSize,
        sort_order: imagesRepo.nextSortOrder(row.id),
      });
      // Uploads race concurrently on the client, so re-apply natural
      // filename ordering (within this row only) after each insert.
      imagesRepo.renormalizeByFilename(row.id);
      if (!product.cover_image_id) {
        productsRepo.update(product.id, user.id, { cover_image_id: image.id });
      }
      productsRepo.touch(product.id);

      // Auto-detect a 360 sequence once this row has enough frames.
      const rowImages = imagesRepo.listByRow(row.id);
      if (rowImages.length >= 8) {
        const allImages = imagesRepo.listByProduct(product.id);
        sequencesRepo.upsert(product.id, { frame_count: allImages.length });
        productsRepo.update(product.id, user.id, { status: "ready" });
      }

      json(ctx, 201, { image, row });
    } catch (err) {
      json(ctx, 500, { error: "Falha ao processar a imagem." });
    }
  });

  router.patch("/api/products/:id/images/reorder", (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const product = productsRepo.findById(ctx.params.id, user.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    const rowId = typeof ctx.body.rowId === "string" ? ctx.body.rowId : undefined;
    const row = rowId && sequenceRowsRepo.findById(rowId, product.id);
    if (!row) return json(ctx, 400, { error: "rowId inválido." });
    const orderedIds = Array.isArray(ctx.body.orderedIds) ? (ctx.body.orderedIds as string[]) : [];
    if (!orderedIds.length) return json(ctx, 400, { error: "orderedIds é obrigatório." });
    imagesRepo.reorder(row.id, orderedIds);
    json(ctx, 200, { images: imagesRepo.listByProduct(product.id) });
  });

  router.delete("/api/products/:id/images/:imageId", async (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const product = productsRepo.findById(ctx.params.id, user.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    const image = imagesRepo.findById(ctx.params.imageId);
    const deleted = imagesRepo.delete(ctx.params.imageId, product.id);
    if (!deleted || !image) return json(ctx, 404, { error: "Imagem não encontrada." });
    await deleteImageFiles(image);
    json(ctx, 200, { ok: true });
  });

  // ---- 360 sequence ----

  router.get("/api/products/:id/360", (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const product = productsRepo.findById(ctx.params.id, user.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    json(ctx, 200, { sequence: sequencesRepo.upsert(product.id, {}) });
  });

  const upsertSequenceHandler = (ctx: Ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const product = productsRepo.findById(ctx.params.id, user.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    try {
      const body = ctx.body as Record<string, unknown>;
      const sequence = sequencesRepo.upsert(product.id, {
        frame_count: typeof body.frame_count === "number" ? body.frame_count : undefined,
        auto_rotate: body.auto_rotate !== undefined ? (body.auto_rotate ? 1 : 0) : undefined,
        rotate_speed: body.rotate_speed ? oneOf(body.rotate_speed, ["slow", "normal", "fast"] as const, "rotate_speed") : undefined,
        zoom_enabled: body.zoom_enabled !== undefined ? (body.zoom_enabled ? 1 : 0) : undefined,
        fullscreen_enabled: body.fullscreen_enabled !== undefined ? (body.fullscreen_enabled ? 1 : 0) : undefined,
        controls_enabled: body.controls_enabled !== undefined ? (body.controls_enabled ? 1 : 0) : undefined,
        background: typeof body.background === "string" ? body.background : undefined,
      });
      productsRepo.update(product.id, user.id, { status: "ready" });
      json(ctx, 200, { sequence });
    } catch (err) {
      json(ctx, 400, { error: err instanceof ValidationError ? err.message : "Pedido inválido." });
    }
  };
  router.post("/api/products/:id/360", upsertSequenceHandler);
  router.put("/api/products/:id/360", upsertSequenceHandler);

  // ---- Embed ----

  router.get("/api/products/:id/embed", (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const product = productsRepo.findById(ctx.params.id, user.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    const embed = embedSettingsRepo.ensure(product.id);
    const base = publicBaseUrl(ctx);
    const src = `${base}/viewer/${product.id}`;
    json(ctx, 200, {
      embed,
      viewerUrl: src,
      iframe: `<iframe src="${src}" width="${embed.default_width}" height="${embed.default_height}" frameborder="0" allowfullscreen></iframe>`,
    });
  });

  router.put("/api/products/:id/embed", (ctx) => {
    const user = requireAuthApi(ctx);
    if (!user) return;
    const product = productsRepo.findById(ctx.params.id, user.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    const body = ctx.body as Record<string, unknown>;
    const embed = embedSettingsRepo.update(product.id, {
      default_width: typeof body.default_width === "string" ? body.default_width : undefined,
      default_height: typeof body.default_height === "string" ? body.default_height : undefined,
      responsive: body.responsive !== undefined ? (body.responsive ? 1 : 0) : undefined,
    });
    json(ctx, 200, { embed });
  });

  // ---- Analytics (public, called anonymously from the embedded/public viewer) ----

  router.post("/api/products/:id/analytics/view", (ctx) => {
    const product = productsRepo.findByIdPublic(ctx.params.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    const { sessionId, device, browser } = ctx.body as Record<string, string>;
    if (!sessionId) return json(ctx, 400, { error: "sessionId é obrigatório." });
    analyticsRepo.recordEvent(product.id, "view", sessionId, device ?? null, browser ?? null);
    analyticsRepo.startSession(product.id, sessionId, device ?? null, browser ?? null);
    json(ctx, 201, { ok: true });
  });

  router.post("/api/products/:id/analytics/interaction", (ctx) => {
    const product = productsRepo.findByIdPublic(ctx.params.id);
    if (!product) return json(ctx, 404, { error: "Produto não encontrado." });
    const { sessionId, kind, device, browser } = ctx.body as Record<string, string>;
    if (!sessionId || !["rotate", "zoom", "fullscreen"].includes(kind)) {
      return json(ctx, 400, { error: "Parâmetros inválidos." });
    }
    analyticsRepo.recordEvent(product.id, kind as EventType, sessionId, device ?? null, browser ?? null);
    analyticsRepo.touchSession(sessionId, kind === "rotate");
    json(ctx, 201, { ok: true });
  });
}
