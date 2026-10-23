import React from "react";
import { renderDocument } from "./Document";
import { AppLayout } from "./AppLayout";
import type { User } from "../db/repositories/users.repo";
import type { ApiKey } from "../db/repositories/apiKeys.repo";

export function renderSettingsPage(opts: {
  user: User;
  apiKeys: ApiKey[];
  newKeyPlain?: string;
  error?: string;
}) {
  return renderDocument({
    title: "Definições",
    children: (
      <AppLayout activePath="/settings" userName={opts.user.name} title="Definições">
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 640 }}>
          <div className="card card-padded">
            <h2 style={{ marginBottom: 12 }}>Conta</h2>
            <div className="settings-row">
              <span className="settings-row-label">Nome</span>
              <span className="muted">{opts.user.name}</span>
            </div>
            <div className="settings-row">
              <span className="settings-row-label">Email</span>
              <span className="muted">{opts.user.email}</span>
            </div>
          </div>

          <div className="card card-padded">
            <h2 style={{ marginBottom: 4 }}>Alterar password</h2>
            {opts.error && <div className="form-error-banner">{opts.error}</div>}
            <form method="POST" action="/settings/password">
              <div className="field">
                <label htmlFor="currentPassword">Password atual</label>
                <input id="currentPassword" name="currentPassword" type="password" required />
              </div>
              <div className="field">
                <label htmlFor="newPassword">Nova password</label>
                <input id="newPassword" name="newPassword" type="password" required minLength={8} />
              </div>
              <button type="submit" className="btn btn-primary">Guardar password</button>
            </form>
          </div>

          <div className="card card-padded">
            <div className="section-heading">
              <h2>API Keys</h2>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              Usa uma API key no cabeçalho <code>Authorization: Bearer &lt;key&gt;</code> para aceder
              à API do Orbix360 a partir de sistemas externos.
            </p>
            {opts.newKeyPlain && (
              <div className="form-error-banner" style={{ background: "var(--color-success-soft)", color: "var(--color-success)" }}>
                Guarda esta chave agora — não voltará a ser mostrada: <br />
                <code>{opts.newKeyPlain}</code>
              </div>
            )}
            {opts.apiKeys.map((key) => (
              <div className="settings-row" key={key.id}>
                <div>
                  <div className="settings-row-label">{key.name}</div>
                  <div className="settings-row-desc">orbix_{key.key_prefix}… · criada em {new Date(key.created_at).toLocaleDateString("pt-PT")}</div>
                </div>
                <form method="POST" action={`/settings/api-keys/${key.id}/delete`}>
                  <button className="btn btn-ghost btn-sm" type="submit">Remover</button>
                </form>
              </div>
            ))}
            <form method="POST" action="/settings/api-keys" style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input name="name" placeholder="Nome da chave (ex: Loja Online)" required style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--color-border)", borderRadius: 6 }} />
              <button type="submit" className="btn btn-secondary">+ Gerar chave</button>
            </form>
          </div>
        </div>
      </AppLayout>
    ),
  });
}
