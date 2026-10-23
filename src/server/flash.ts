import type { Ctx } from "./context";

/** Redirects with a flash message read by the client-side toast script. */
export function redirectWithNotice(
  ctx: Ctx,
  location: string,
  notice: string,
  type: "success" | "error" | "info" = "success"
): void {
  const sep = location.includes("?") ? "&" : "?";
  ctx.res.writeHead(302, {
    location: `${location}${sep}notice=${encodeURIComponent(notice)}&type=${type}`,
  });
  ctx.res.end();
}
