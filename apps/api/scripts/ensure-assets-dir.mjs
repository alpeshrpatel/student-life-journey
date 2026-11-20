// Keeps `wrangler dev`, the API tests and `wrangler deploy --dry-run` working before the web app is built:
// the Worker's `assets.directory` must exist and contain an index.html.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "../../web/dist");
const indexHtml = resolve(dist, "index.html");

if (!existsSync(indexHtml)) {
  mkdirSync(dist, { recursive: true });
  writeFileSync(indexHtml, "<!doctype html><title>build apps/web first</title>\n");
}
