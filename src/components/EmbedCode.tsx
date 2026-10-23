import React from "react";

export function EmbedCode({
  productId,
  publicBaseUrl,
  width,
  height,
  responsive,
}: {
  productId: string;
  publicBaseUrl: string;
  width: string;
  height: string;
  responsive: boolean;
}) {
  const src = `${publicBaseUrl}/viewer/${productId}`;
  const iframeCode = responsive
    ? `<div style="position:relative;width:100%;aspect-ratio:1/1;">\n  <iframe src="${src}" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>\n</div>`
    : `<iframe src="${src}" width="${width}" height="${height}" frameborder="0" allowfullscreen></iframe>`;

  return (
    <div className="card card-padded">
      <div className="section-heading">
        <h2>Embed</h2>
        <button type="button" className="btn btn-primary btn-sm" data-copy={iframeCode}>
          Copy code
        </button>
      </div>

      <form method="POST" action={`/products/${productId}/embed`} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="default_width">Width</label>
          <input id="default_width" name="default_width" defaultValue={width} disabled={responsive} style={{ width: 100 }} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="default_height">Height</label>
          <input id="default_height" name="default_height" defaultValue={height} disabled={responsive} style={{ width: 100 }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, paddingBottom: 10 }}>
          <input type="checkbox" name="responsive" value="1" defaultChecked={responsive} />
          Responsive
        </label>
        <button type="submit" className="btn btn-secondary btn-sm">Aplicar</button>
      </form>

      <pre className="code-block">{iframeCode}</pre>
      <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
        URL pública: <a href={src} target="_blank" rel="noreferrer">{src}</a>
      </p>
      <div className="embed-preview-frame" style={{ marginTop: 16 }}>
        <iframe src={src} width="100%" height={320} style={{ border: 0, display: "block" }} />
      </div>
    </div>
  );
}
