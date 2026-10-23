import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

const MIME: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

/** Serves a file from `root` if the request path starts with `prefix`. Returns true if handled. */
export function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  prefix: string,
  root: string,
  longCache: boolean
): boolean {
  const url = req.url ?? "/";
  if (!url.startsWith(prefix)) return false;
  const relative = decodeURIComponent(url.slice(prefix.length).split("?")[0]);
  if (relative.includes("..")) {
    res.writeHead(400).end("Bad request");
    return true;
  }
  const fullPath = path.join(root, relative);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    res.writeHead(404).end("Not found");
    return true;
  }
  const ext = path.extname(fullPath);
  const headers: Record<string, string> = {
    "content-type": MIME[ext] ?? "application/octet-stream",
  };
  if (longCache) headers["cache-control"] = "public, max-age=31536000, immutable";
  res.writeHead(200, headers);
  fs.createReadStream(fullPath).pipe(res);
  return true;
}
