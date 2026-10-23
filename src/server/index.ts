import http from "node:http";
import path from "node:path";
import { runMigrations } from "../db/client";
import { Router } from "./router";
import { serveStatic } from "./static";
import { loadUser } from "./middleware/auth";
import { html, json, type Ctx } from "./context";
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerPageRoutes } from "./routes/pages.routes";
import { registerApiRoutes } from "./routes/api.routes";

runMigrations();

const router = new Router();
registerAuthRoutes(router);
registerPageRoutes(router);
registerApiRoutes(router);

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");
const ASSETS_ROOT = path.join(process.cwd(), "public", "assets");

const server = http.createServer(async (req, res) => {
  if (serveStatic(req, res, "/files/", UPLOADS_ROOT, true)) return;
  if (serveStatic(req, res, "/assets/", ASSETS_ROOT, true)) return;

  await router.handle(
    req,
    res,
    (ctx: Ctx) => {
      html(ctx, 404, "<h1>404</h1><p>Página não encontrada.</p>");
    },
    (ctx: Ctx, err: unknown) => {
      console.error(err);
      if (req.url?.startsWith("/api/")) {
        json(ctx, 500, { error: "Erro interno do servidor." });
      } else {
        html(ctx, 500, "<h1>Erro interno</h1><p>Algo correu mal. Tenta novamente.</p>");
      }
    },
    loadUser
  );
});

const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, () => {
  console.log(`Orbix360 a correr em http://localhost:${PORT}`);
});
