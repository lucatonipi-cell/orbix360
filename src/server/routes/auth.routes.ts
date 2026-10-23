import type { Router } from "../router";
import { html, redirect, setCookie, type Ctx } from "../context";
import { usersRepo } from "../../db/repositories/users.repo";
import { sessionsRepo } from "../../db/repositories/sessions.repo";
import { passwordResetsRepo } from "../../db/repositories/passwordResets.repo";
import { hashPassword, verifyPassword } from "../../lib/auth/password";
import { newToken } from "../../lib/ids";
import { requireEmail, requirePassword, requireString, ValidationError } from "../../lib/validation/validators";
import { SESSION_COOKIE } from "../middleware/auth";
import {
  renderLoginPage,
  renderRegisterPage,
  renderForgotPasswordPage,
  renderResetPasswordPage,
} from "../../pages/AuthPages";

const THIRTY_DAYS = 30 * 24 * 60 * 60;

export function registerAuthRoutes(router: Router) {
  router.get("/login", (ctx) => {
    if (ctx.user) return redirect(ctx, "/dashboard");
    html(ctx, 200, renderLoginPage({}));
  });

  router.post("/login", (ctx) => {
    const email = typeof ctx.body.email === "string" ? ctx.body.email : "";
    const password = typeof ctx.body.password === "string" ? ctx.body.password : "";
    const user = usersRepo.findByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return html(ctx, 401, renderLoginPage({ error: "Email ou password incorretos.", email }));
    }
    const token = newToken();
    sessionsRepo.create(token, user.id);
    setCookie(ctx, SESSION_COOKIE, token, { maxAgeSeconds: THIRTY_DAYS });
    redirect(ctx, "/dashboard");
  });

  router.get("/register", (ctx) => {
    if (ctx.user) return redirect(ctx, "/dashboard");
    html(ctx, 200, renderRegisterPage({}));
  });

  router.post("/register", (ctx) => {
    const { name, email, password } = ctx.body as Record<string, string>;
    try {
      requireString(name, "Nome", { min: 2, max: 120 });
      const cleanEmail = requireEmail(email);
      requirePassword(password);
      if (usersRepo.findByEmail(cleanEmail)) {
        throw new ValidationError("email", "Já existe uma conta com este email.");
      }
      const user = usersRepo.create(cleanEmail, hashPassword(password), name.trim());
      const token = newToken();
      sessionsRepo.create(token, user.id);
      setCookie(ctx, SESSION_COOKIE, token, { maxAgeSeconds: THIRTY_DAYS });
      redirect(ctx, "/dashboard");
    } catch (err) {
      const message = err instanceof ValidationError ? err.message : "Não foi possível criar a conta.";
      html(ctx, 400, renderRegisterPage({ error: message, name, email }));
    }
  });

  router.get("/logout", (ctx) => {
    const token = ctx.cookies[SESSION_COOKIE];
    if (token) sessionsRepo.destroy(token);
    setCookie(ctx, SESSION_COOKIE, "", { clear: true });
    redirect(ctx, "/login");
  });

  router.get("/forgot-password", (ctx) => {
    html(ctx, 200, renderForgotPasswordPage({}));
  });

  router.post("/forgot-password", (ctx) => {
    const email = typeof ctx.body.email === "string" ? ctx.body.email : "";
    const user = usersRepo.findByEmail(email);
    if (!user) {
      // Do not reveal whether the email exists.
      return html(ctx, 200, renderForgotPasswordPage({ error: "Se o email existir, a ligação foi gerada." }));
    }
    const reset = passwordResetsRepo.create(user.id);
    const host = ctx.req.headers.host ?? "localhost";
    const proto = (ctx.req.headers["x-forwarded-proto"] as string) ?? "http";
    const resetLink = `${proto}://${host}/reset-password/${reset.id}`;
    html(ctx, 200, renderForgotPasswordPage({ resetLink }));
  });

  router.get("/reset-password/:token", (ctx) => {
    html(ctx, 200, renderResetPasswordPage({ token: ctx.params.token }));
  });

  router.post("/reset-password/:token", (ctx) => {
    const reset = passwordResetsRepo.findValid(ctx.params.token);
    if (!reset) {
      return html(ctx, 400, renderResetPasswordPage({ token: ctx.params.token, error: "Esta ligação expirou ou já foi usada." }));
    }
    const password = typeof ctx.body.password === "string" ? ctx.body.password : "";
    try {
      requirePassword(password);
    } catch {
      return html(ctx, 400, renderResetPasswordPage({ token: ctx.params.token, error: "A password deve ter pelo menos 8 caracteres." }));
    }
    usersRepo.updatePassword(reset.user_id, hashPassword(password));
    passwordResetsRepo.markUsed(reset.id);
    redirect(ctx, "/login");
  });
}
