import { build } from "esbuild";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docs = join(root, "docs");
const entries = await readdir(join(docs, "_next", "static", "chunks"));
const entryName = entries.find((name) => name.startsWith("index-") && name.endsWith(".js"));
if (!entryName) throw new Error("Could not find the Vinext browser entry chunk.");

const bundled = await build({
  absWorkingDir: docs,
  entryPoints: [join("_next", "static", "chunks", entryName)],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  minify: true,
  write: false,
});
const appScript = bundled.outputFiles[0].text;

async function inlineFontUrls(source) {
  const matches = [...source.matchAll(/url\((?:["']?)(\/?_next\/static\/_vinext_fonts\/[^)"']+)(?:["']?)\)/g)];
  let output = source;
  for (const match of matches) {
    const bytes = await readFile(join(docs, match[1].replace(/^\//, "")));
    output = output.replaceAll(match[0], `url(data:font/woff2;base64,${bytes.toString("base64")})`);
  }
  return output;
}

let html = await readFile(join(docs, "index.html"), "utf8");
const cssHref = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/i)?.[1];
if (!cssHref) throw new Error("Could not find the generated stylesheet.");
const css = await inlineFontUrls(await readFile(join(docs, cssHref), "utf8"));
html = await inlineFontUrls(html);

html = html
  .replace(/<link[^>]+rel="stylesheet"[^>]*>/gi, "")
  .replace(/<link[^>]+rel="modulepreload"[^>]*>/gi, "")
  .replace(/<link[^>]+rel="preload"[^>]*>/gi, "")
  .replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/gi, "")
  .replace(/<meta[^>]+(?:property|name)="(?:og:image|twitter:image)"[^>]*>/gi, "");

const favicon = (await readFile(join(root, "public", "favicon.svg"), "utf8")).replace(/\s+/g, " ").trim();
html = html.replaceAll('href="favicon.svg"', `href="data:image/svg+xml,${encodeURIComponent(favicon)}"`);
html = html.replace("</head>", `<style data-standalone-css>${css}</style></head>`);
html = html.replace("</body>", `<script data-standalone-app>${appScript}</script></body>`);

const output = `<!doctype html>${html.replace(/^<!doctype html>/i, "")}`;
await writeFile(join(root, "Blackjack.html"), output, "utf8");
await writeFile(join(docs, "Blackjack.html"), output, "utf8");
console.log(`Standalone HTML written (${Math.round(output.length / 1024)} KB).`);

