/**
 * Builds static/index.html — a single self-contained file with the fonts
 * inlined as data URIs, so it runs from any static host or straight off disk.
 * Run: npm run build:static
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const b64 = (p) => fs.readFileSync(path.join(root, p)).toString("base64");

const html = fs
  .readFileSync(path.join(root, "static/index.template.html"), "utf8")
  .replace("__FONT_N__", b64("src/fonts/InstrumentSans-Variable.woff2"))
  .replace("__FONT_I__", b64("src/fonts/InstrumentSans-Italic-Variable.woff2"));

fs.writeFileSync(path.join(root, "static/index.html"), html);
console.log(`static/index.html — ${(html.length / 1024).toFixed(0)}KB`);
