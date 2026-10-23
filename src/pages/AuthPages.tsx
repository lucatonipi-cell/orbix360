import React from "react";
import { renderDocument } from "./Document";

function AuthShell({ title, subtitle, error, children, footer }: {
  title: string;
  subtitle: string;
  error?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <div className="sidebar-logo" style={{ color: "var(--color-text)", marginBottom: 24 }}>
          <span className="sidebar-logo-mark" />
          Orbix360
        </div>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        {error && <div className="form-error-banner">{error}</div>}
        {children}
        <div className="auth-footer">{footer}</div>
      </div>
    </div>
  );
}

export function renderLoginPage(opts: { error?: string; email?: string }) {
  return renderDocument({
    title: "Iniciar sessão",
    children: (
      <AuthShell
        title="Iniciar sessão"
        subtitle="Entra na tua conta Orbix360."
        error={opts.error}
        footer={<>Ainda não tens conta? <a href="/register">Criar conta</a></>}
      >
        <form method="POST" action="/login">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required defaultValue={opts.email} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
            Entrar
          </button>
        </form>
        <div className="auth-footer">
          <a href="/forgot-password">Esqueceste-te da password?</a>
        </div>
      </AuthShell>
    ),
  });
}

export function renderRegisterPage(opts: { error?: string; name?: string; email?: string }) {
  return renderDocument({
    title: "Criar conta",
    children: (
      <AuthShell
        title="Criar conta"
        subtitle="Começa a gerir os teus produtos em 360º."
        error={opts.error}
        footer={<>Já tens conta? <a href="/login">Iniciar sessão</a></>}
      >
        <form method="POST" action="/register">
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input id="name" name="name" type="text" required defaultValue={opts.name} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required defaultValue={opts.email} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required minLength={8} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
            Criar conta
          </button>
        </form>
      </AuthShell>
    ),
  });
}

export function renderForgotPasswordPage(opts: { error?: string; resetLink?: string }) {
  return renderDocument({
    title: "Recuperar password",
    children: (
      <AuthShell
        title="Recuperar password"
        subtitle="Indica o teu email para gerar uma ligação de reposição."
        error={opts.error}
        footer={<a href="/login">Voltar ao login</a>}
      >
        {opts.resetLink ? (
          <div className="form-error-banner" style={{ background: "var(--color-success-soft)", color: "var(--color-success)" }}>
            Não há envio de email configurado neste ambiente. Usa esta ligação para repor a
            password (em produção seria enviada por email):
            <br />
            <a href={opts.resetLink}>{opts.resetLink}</a>
          </div>
        ) : (
          <form method="POST" action="/forgot-password">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoFocus />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Gerar ligação de reposição
            </button>
          </form>
        )}
      </AuthShell>
    ),
  });
}

export function renderResetPasswordPage(opts: { token: string; error?: string }) {
  return renderDocument({
    title: "Nova password",
    children: (
      <AuthShell
        title="Definir nova password"
        subtitle="Escolhe uma nova password para a tua conta."
        error={opts.error}
        footer={<a href="/login">Voltar ao login</a>}
      >
        <form method="POST" action={`/reset-password/${opts.token}`}>
          <div className="field">
            <label htmlFor="password">Nova password</label>
            <input id="password" name="password" type="password" required minLength={8} autoFocus />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
            Guardar password
          </button>
        </form>
      </AuthShell>
    ),
  });
}
