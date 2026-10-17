// UTF-8. Static local server; no network dependencies at runtime.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist",
);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ogg": "audio/ogg",
  ".css": "text/css; charset=utf-8",
};
http
  .createServer((req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const p = path.resolve(
        root,
        "." +
          decodeURIComponent(
            url.pathname === "/" ? "/index.html" : url.pathname,
          ),
      );
      if (!p.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const data = fs.readFileSync(p);
      res.writeHead(200, {
        "Content-Type": mime[path.extname(p)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(4173, "127.0.0.1", () =>
    console.log("PvZ Duel: http://127.0.0.1:4173"),
  );
