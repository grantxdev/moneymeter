/**
 * Serves static/ on http://localhost:4000 with no dependencies.
 * Rebuilds the single-file app first so you always get current code.
 * Run: npm run preview
 */
import http from "http";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 4000;

execFileSync(process.execPath, [path.join(root, "scripts/build-static.mjs")], { stdio: "inherit" });

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" };

http
  .createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = path.join(root, "static", rel === "/" ? "index.html" : rel);
    if (!file.startsWith(path.join(root, "static"))) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(buf);
    });
  })
  .listen(PORT, () => console.log(`\n  Moneymeter → http://localhost:${PORT}\n`));
