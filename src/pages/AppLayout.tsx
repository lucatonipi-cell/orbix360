import React from "react";
import { Sidebar } from "../components/Sidebar";

export function AppLayout({
  activePath,
  userName,
  title,
  actions,
  children,
}: {
  activePath: string;
  userName: string;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <Sidebar activePath={activePath} userName={userName} />
      <div className="app-main">
        <header className="topbar">
          <h1 className="topbar-title">{title}</h1>
          {actions && <div className="topbar-actions">{actions}</div>}
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
