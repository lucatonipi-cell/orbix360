import type { Router } from "../router";
import { html, redirect, type Ctx } from "../context";
import { requireAuthPage } from "../middleware/requireAuthPage";
import { redirectWithNotice } from "../flash";
import { productsRepo } from "../../db/repositories/products.repo";
import { imagesRepo } from "../../db/repositories/images.repo";
import { sequenceRowsRepo } from "../../db/repositories/sequenceRows.repo";
import { sequencesRepo } from "../../db/repositories/sequences.repo";
import { embedSettingsRepo } from "../../db/repositories/embedSettings.repo";
import { analyticsRepo } from "../../db/repositories/analytics.repo";
import { apiKeysRepo } from "../../db/repositories/apiKeys.repo";
import { usersRepo } from "../../db/repositories/users.repo";
import { storage, keyFromUrl } from "../../lib/storage";
import { verifyPassword, hashPassword } from "../../lib/auth/password";
import { requireString, ValidationError } from "../../lib/validation/validators";
import { renderDashboardPage } from "../../pages/DashboardPage";
import { renderProductsPage, renderNewProductPage } from "../../pages/ProductsPage";
import { renderProductDetailPage } from "../../pages/ProductDetailPage";
import { renderProductEditPage } from "../../pages/ProductEditPage";
import { renderSettingsPage } from "../../pages/SettingsPage";
import { renderViewerPublicPage, renderViewerNotFoundPage } from "../../pages/ViewerPublicPage";

function publicBaseUrl(ctx: Ctx): string {
  const host = ctx.req.headers.host ?? "localhost";
  const proto = (ctx.req.headers["x-forwarded-proto"] as string) ?? "http";
  return `${proto}://${host}`;
}

export function registerPageRoutes(router: Router) {
  router.get("/", (ctx) => {
    redirect(ctx, ctx.user ? "/dashboard" : "/login");
  });

  router.get("/dashboard", (ctx) => {
    if (requireAuthPage(ctx)) return;
    const user = ctx.user!;
    const products = productsRepo.listByUser(user.id);
    const { totalViews } = analyticsRepo.statsForUser(user.id);
    html(
      ctx,
      200,
      renderDashboardPage({
        userName: user.name,
        productCount: products.length,
        imageCount: imagesRepo.countByUser(user.id),
        totalViews,
        storageBytes: imagesRepo.totalBytesForUser(user.id),
        recentProducts: products.slice(0, 5),
      })
    );
  });

  router.get("/products", (ctx) => {
    if (requireAuthPage(ctx)) return;
    const products = productsRepo.listByUser(ctx.user!.id);
    const items = products.map((product) => ({
      product,
      imageCount: imagesRepo.countByProduct(product.id),
      coverUrl: imagesRepo.coverForProduct(product.id)?.thumbnail_url ?? null,
    }));
    html(ctx, 200, renderProductsPage(ctx.user!.name, items));
  });

  router.get("/products/new", (ctx) => {
    if (requireAuthPage(ctx)) return;
    html(ctx, 200, renderNewProductPage(ctx.user!.name));
  });

  router.post("/products/new", (ctx) => {
    if (requireAuthPage(ctx)) return;
    try {
      const name = requireString(ctx.body.name, "Nome", { min: 2, max: 140 });
      const description = typeof ctx.body.description === "string" ? ctx.body.description.trim() : "";
      const product = productsRepo.create(ctx.user!.id, name, description);
      sequencesRepo.upsert(product.id, {});
      embedSettingsRepo.ensure(product.id);
      redirect(ctx, `/products/${product.id}/edit`);
    } catch (err) {
      const message = err instanceof ValidationError ? err.message : "Não foi possível criar o produto.";
      html(ctx, 400, renderNewProductPage(ctx.user!.name, message));
    }
  });

  router.get("/products/:id", (ctx) => {
    if (requireAuthPage(ctx)) return;
    const product = productsRepo.findById(ctx.params.id, ctx.user!.id);
    if (!product) return html(ctx, 404, "Produto não encontrado");
    const images = imagesRepo.listByProduct(product.id);
    const rows = sequenceRowsRepo.listByProduct(product.id);
    const sequence = sequencesRepo.upsert(product.id, {});
    const embed = embedSettingsRepo.ensure(product.id);
    const stats = analyticsRepo.statsForProduct(product.id);
    html(
      ctx,
      200,
      renderProductDetailPage({
        userName: ctx.user!.name,
        product,
        images,
        rows,
        sequence,
        embed,
        stats,
        publicBaseUrl: publicBaseUrl(ctx),
      })
    );
  });

  router.get("/products/:id/edit", (ctx) => {
    if (requireAuthPage(ctx)) return;
    const product = productsRepo.findById(ctx.params.id, ctx.user!.id);
    if (!product) return html(ctx, 404, "Produto não encontrado");
    sequenceRowsRepo.ensureDefault(product.id);
    const images = imagesRepo.listByProduct(product.id);
    const rows = sequenceRowsRepo.listByProduct(product.id);
    const sequence = sequencesRepo.upsert(product.id, { frame_count: images.length });
    html(ctx, 200, renderProductEditPage({ userName: ctx.user!.name, product, images, rows, sequence }));
  });

  router.post("/products/:id/embed", (ctx) => {
    if (requireAuthPage(ctx)) return;
    const product = productsRepo.findById(ctx.params.id, ctx.user!.id);
    if (!product) return html(ctx, 404, "Produto não encontrado");
    const body = ctx.body as Record<string, string>;
    embedSettingsRepo.update(product.id, {
      default_width: body.default_width || "100%",
      default_height: body.default_height || "600",
      responsive: body.responsive ? 1 : 0,
    });
    redirectWithNotice(ctx, `/products/${product.id}`, "Definições de embed atualizadas.");
  });

  router.post("/products/:id/delete", async (ctx) => {
    if (requireAuthPage(ctx)) return;
    const product = productsRepo.findById(ctx.params.id, ctx.user!.id);
    if (product) {
      const images = imagesRepo.listByProduct(product.id);
      productsRepo.delete(product.id, ctx.user!.id);
      await Promise.all(
        images.flatMap((img) =>
          [img.original_url, img.thumbnail_url, img.medium_url, img.large_url].map((url) =>
            storage.delete(keyFromUrl(url)).catch(() => {})
          )
        )
      );
    }
    redirectWithNotice(ctx, "/products", "Produto eliminado.");
  });

  router.get("/settings", (ctx) => {
    if (requireAuthPage(ctx)) return;
    html(ctx, 200, renderSettingsPage({ user: ctx.user!, apiKeys: apiKeysRepo.listByUser(ctx.user!.id) }));
  });

  router.post("/settings/password", (ctx) => {
    if (requireAuthPage(ctx)) return;
    const { currentPassword, newPassword } = ctx.body as Record<string, string>;
    const user = ctx.user!;
    if (!verifyPassword(currentPassword ?? "", user.password_hash)) {
      return html(
        ctx,
        400,
        renderSettingsPage({ user, apiKeys: apiKeysRepo.listByUser(user.id), error: "Password atual incorreta." })
      );
    }
    if (!newPassword || newPassword.length < 8) {
      return html(
        ctx,
        400,
        renderSettingsPage({ user, apiKeys: apiKeysRepo.listByUser(user.id), error: "A nova password deve ter pelo menos 8 caracteres." })
      );
    }
    usersRepo.updatePassword(user.id, hashPassword(newPassword));
    redirectWithNotice(ctx, "/settings", "Password atualizada.");
  });

  router.post("/settings/api-keys", (ctx) => {
    if (requireAuthPage(ctx)) return;
    const name = typeof ctx.body.name === "string" ? ctx.body.name.trim() : "";
    if (!name) return redirectWithNotice(ctx, "/settings", "Indica um nome para a chave.", "error");
    const { plainKey } = apiKeysRepo.create(ctx.user!.id, name);
    html(
      ctx,
      200,
      renderSettingsPage({ user: ctx.user!, apiKeys: apiKeysRepo.listByUser(ctx.user!.id), newKeyPlain: plainKey })
    );
  });

  router.post("/settings/api-keys/:id/delete", (ctx) => {
    if (requireAuthPage(ctx)) return;
    apiKeysRepo.delete(ctx.params.id, ctx.user!.id);
    redirectWithNotice(ctx, "/settings", "Chave removida.");
  });

  // Public, unauthenticated viewer page — no sidebar, just the Viewer360.
  router.get("/viewer/:id", (ctx) => {
    const product = productsRepo.findByIdPublic(ctx.params.id);
    if (!product) return html(ctx, 404, renderViewerNotFoundPage());
    const images = imagesRepo.listByProduct(product.id);
    const rows = sequenceRowsRepo.listByProduct(product.id);
    const sequence = sequencesRepo.upsert(product.id, {});
    html(ctx, 200, renderViewerPublicPage({ productName: product.name, images, rows, sequence }));
  });
}
