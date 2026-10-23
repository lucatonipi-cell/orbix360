import type { Ctx } from "../context";
import { sessionsRepo } from "../../db/repositories/sessions.repo";
import { usersRepo } from "../../db/repositories/users.repo";

export const SESSION_COOKIE = "orbix_session";

export function loadUser(ctx: Ctx): void {
  const token = ctx.cookies[SESSION_COOKIE];
  if (!token) return;
  const session = sessionsRepo.findValid(token);
  if (!session) return;
  const user = usersRepo.findById(session.user_id);
  ctx.user = user ?? null;
}
