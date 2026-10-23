import type { Ctx } from "../context";
import { redirect } from "../context";

/** Returns true and redirects to /login if the request has no authenticated user. */
export function requireAuthPage(ctx: Ctx): boolean {
  if (!ctx.user) {
    redirect(ctx, "/login");
    return true;
  }
  return false;
}
