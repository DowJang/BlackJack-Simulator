import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docs = resolve(root, "docs");
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("static", Date.now().toString());
const { default: worker } = await import(workerUrl.href);

await rm(docs, { recursive: true, force: true });
await mkdir(docs, { recursive: true });
await cp(resolve(root, "dist/client"), docs, { recursive: true });

const response = await worker.fetch(
  new Request("http://localhost/", { headers: { accept: "text/html" } }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

let html = await response.text();
// GitHub Pages serves this project below /BlackJack-Simulator/, so convert
// Vinext's root-absolute asset URLs into paths relative to docs/index.html.
html = html
  .replaceAll('href="/_next/', 'href="_next/')
  .replaceAll('src="/_next/', 'src="_next/')
  .replaceAll('href="/favicon.svg"', 'href="favicon.svg"')
  .replaceAll('href="/og.png"', 'href="og.png"')
  .replaceAll('http://localhost:3000/og.png', 'https://dowjang.github.io/BlackJack-Simulator/og.png');

await writeFile(resolve(docs, "index.html"), `<!doctype html>${html.replace(/^<!doctype html>/i, "")}`, "utf8");
await writeFile(resolve(docs, ".nojekyll"), "", "utf8");
console.log(`GitHub Pages bundle written to ${docs}`);

