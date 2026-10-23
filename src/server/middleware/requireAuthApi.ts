import type { Ctx } from "../context";
import { json } from "../context";
import { apiKeysRepo } from "../../db/repositories/apiKeys.repo";
import { usersRepo } from "../../db/repositories/users.repo";
import type { User } from "../../db/repositories/users.repo";

/**
 * Resolves the authenticated user for an API request from either the
 * session cookie (already loaded onto ctx.user) or an `Authorization:
 * Bearer <api key>` header, for external integrations. Returns the user,
 * or writes a 401 response and returns null.
 */
export function requireAuthApi(ctx: Ctx): User | null {
  if (ctx.user) return ctx.user;

  const authHeader = ctx.req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const plainKey = authHeader.slice("Bearer ".length).trim();
    const key = apiKeysRepo.findByPlainKey(plainKey);
    if (key) {
      apiKeysRepo.touchLastUsed(key.id);
      const user = usersRepo.findById(key.user_id);
      if (user) return user;
    }
  }

  json(ctx, 401, { error: "Não autenticado." });
  return null;
}
