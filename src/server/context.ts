import type { IncomingMessage, ServerResponse } from "node:http";
import type { User } from "../db/repositories/users.repo";

export interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: URLSearchParams;
  cookies: Record<string, string>;
  user: User | null;
  body: any;
  /** Raw multipart parts, populated only for multipart/form-data requests. */
  files: MultipartFile[];
}

export interface MultipartFile {
  fieldName: string;
  filename: string;
  contentType: string;
  data: Buffer;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function json(ctx: Ctx, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  ctx.res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  ctx.res.end(body);
}

export function html(ctx: Ctx, status: number, markup: string): void {
  ctx.res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "content-length": Buffer.byteLength(markup),
  });
  ctx.res.end(markup);
}

export function redirect(ctx: Ctx, location: string): void {
  ctx.res.writeHead(302, { location });
  ctx.res.end();
}

export function setCookie(
  ctx: Ctx,
  name: string,
  value: string,
  opts: { maxAgeSeconds?: number; clear?: boolean } = {}
): void {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (opts.clear) {
    parts.push("Max-Age=0");
  } else if (opts.maxAgeSeconds) {
    parts.push(`Max-Age=${opts.maxAgeSeconds}`);
  }
  const existing = ctx.res.getHeader("set-cookie");
  const cookieStr = parts.join("; ");
  if (Array.isArray(existing)) {
    ctx.res.setHeader("set-cookie", [...existing, cookieStr]);
  } else if (existing) {
    ctx.res.setHeader("set-cookie", [String(existing), cookieStr]);
  } else {
    ctx.res.setHeader("set-cookie", cookieStr);
  }
}
