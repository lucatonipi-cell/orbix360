import React from "react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/products", label: "Produtos", icon: "▣" },
  { href: "/settings", label: "Definições", icon: "⚙" },
];

export function Sidebar({ activePath, userName }: { activePath: string; userName: string }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-mark" />
        Orbix360
      </div>
      <nav className="sidebar-nav">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`sidebar-link${activePath.startsWith(link.href) ? " active" : ""}`}
          >
            <span>{link.icon}</span>
            {link.label}
          </a>
        ))}
        <a href="/logout" className="sidebar-link" data-confirm="Terminar sessão?">
          <span>⏻</span>
          Terminar sessão
        </a>
      </nav>
      <div className="sidebar-footer">Sessão: {userName}</div>
    </aside>
  );
}
