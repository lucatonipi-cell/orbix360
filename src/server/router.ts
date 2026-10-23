import type { IncomingMessage, ServerResponse } from "node:http";
import { parseCookies, type Ctx } from "./context";
import { parseMultipart } from "./multipart";

export type Handler = (ctx: Ctx) => Promise<void> | void;

interface Route {
  method: string;
  segments: string[];
  handler: Handler;
}

const MAX_BODY_BYTES = 60 * 1024 * 1024; // 60MB — generous for product photo batches

export class Router {
  private routes: Route[] = [];

  add(method: string, path: string, handler: Handler) {
    this.routes.push({ method, segments: path.split("/").filter(Boolean), handler });
  }
  get(path: string, handler: Handler) {
    this.add("GET", path, handler);
  }
  post(path: string, handler: Handler) {
    this.add("POST", path, handler);
  }
  put(path: string, handler: Handler) {
    this.add("PUT", path, handler);
  }
  patch(path: string, handler: Handler) {
    this.add("PATCH", path, handler);
  }
  delete(path: string, handler: Handler) {
    this.add("DELETE", path, handler);
  }

  private match(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | null {
    const segments = pathname.split("/").filter(Boolean);
    for (const route of this.routes) {
      if (route.method !== method) continue;
      if (route.segments.length !== segments.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < segments.length; i++) {
        const routeSeg = route.segments[i];
        if (routeSeg.startsWith(":")) {
          params[routeSeg.slice(1)] = decodeURIComponent(segments[i]);
        } else if (routeSeg !== segments[i]) {
          ok = false;
          break;
        }
      }
      if (ok) return { handler: route.handler, params };
    }
    return null;
  }

  async handle(
    req: IncomingMessage,
    res: ServerResponse,
    notFound: (ctx: Ctx) => void,
    onError: (ctx: Ctx, err: unknown) => void,
    beforeRoute?: (ctx: Ctx) => void
  ) {
    const url = new URL(req.url ?? "/", "http://localhost");
    const matched = this.match(req.method ?? "GET", url.pathname);

    const ctx: Ctx = {
      req,
      res,
      params: matched?.params ?? {},
      query: url.searchParams,
      cookies: parseCookies(req.headers.cookie),
      user: null,
      body: {},
      files: [],
    };

    try {
      beforeRoute?.(ctx);
      if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
        const raw = await readBody(req);
        const contentType = req.headers["content-type"] ?? "";
        if (contentType.includes("multipart/form-data")) {
          const { fields, files } = parseMultipart(raw, contentType);
          ctx.body = fields;
          ctx.files = files;
        } else if (contentType.includes("application/json")) {
          ctx.body = raw.length ? JSON.parse(raw.toString("utf-8")) : {};
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
          ctx.body = Object.fromEntries(new URLSearchParams(raw.toString("utf-8")));
        }
      }

      if (!matched) {
        notFound(ctx);
        return;
      }
      await matched.handler(ctx);
    } catch (err) {
      onError(ctx, err);
    }
  }
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("PAYLOAD_TOO_LARGE"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
