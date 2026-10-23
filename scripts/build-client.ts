import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "assets");
fs.mkdirSync(OUT_DIR, { recursive: true });

const entries = [
  "src/client/notifications.client.ts",
  "src/client/product-edit.client.tsx",
  "src/client/product-detail.client.tsx",
  "src/client/viewer-public.client.tsx",
];

async function build() {
  // Bundled together (with code-splitting) so React/react-dom are emitted
  // once as a shared chunk instead of being duplicated in every entry file.
  await esbuild.build({
    entryPoints: entries.map((e) => path.join(ROOT, e)),
    entryNames: "[name]",
    bundle: true,
    splitting: true,
    format: "esm",
    target: "es2020",
    jsx: "automatic",
    outdir: OUT_DIR,
    chunkNames: "chunks/[name]-[hash]",
    sourcemap: true,
    minify: true,
    logLevel: "info",
  });

  const cssFiles = ["tokens.css", "base.css", "components.css"].map((f) =>
    fs.readFileSync(path.join(ROOT, "src", "styles", f), "utf-8")
  );
  fs.writeFileSync(path.join(OUT_DIR, "styles.css"), cssFiles.join("\n\n"));

  console.log("Client bundles gerados em public/assets/");
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
