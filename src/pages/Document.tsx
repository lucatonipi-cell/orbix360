import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

interface DocumentProps {
  title: string;
  children: React.ReactNode;
  /** Client bundle(s) to load as ES modules for interactive islands. */
  scripts?: string[];
  /** JSON data exposed to client scripts via window.__DATA__. */
  data?: unknown;
  bodyClassName?: string;
}

function Document({ title, children, scripts = [], data, bodyClassName }: DocumentProps) {
  return (
    <html lang="pt">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${title} · Orbix360`}</title>
        <link rel="stylesheet" href="/assets/styles.css" />
        <link rel="icon" href="data:," />
      </head>
      <body className={bodyClassName}>
        {children}
        {data !== undefined && (
          <script
            id="__DATA__"
            type="application/json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
          />
        )}
        <script type="module" src="/assets/notifications.client.js"></script>
        {scripts.map((src) => (
          <script key={src} type="module" src={src}></script>
        ))}
      </body>
    </html>
  );
}

export function renderDocument(props: DocumentProps): string {
  return "<!doctype html>" + renderToStaticMarkup(<Document {...props} />);
}
