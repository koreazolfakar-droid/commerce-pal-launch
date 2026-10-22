// Serve the actual Cloudflare build in Node for repeatable browser verification.
// Static assets and the same worker fetch entry used by the SSR smoke test.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
const { default: handler } = await import("../../.output/server/index.mjs");
const publicDir = fileURLToPath(new URL("../../.output/public/", import.meta.url));
const types = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".xml": "application/xml",
};
const port = Number(process.env.SPACE_CALL_PREVIEW_PORT || 4173);
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = resolve(publicDir, `.${decodeURIComponent(url.pathname)}`);
    if (
      path.startsWith(resolve(publicDir) + sep) &&
      (await stat(path).catch(() => null))?.isFile()
    ) {
      res.setHeader("content-type", types[extname(path)] || "application/octet-stream");
      res.end(req.method === "HEAD" ? undefined : await readFile(path));
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      ...(!["GET", "HEAD"].includes(req.method) ? { body: Buffer.concat(chunks) } : {}),
    });
    const response = await handler.fetch(
      request,
      {},
      { waitUntil: (p) => p.catch(() => {}), passThroughOnException() {} },
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body && req.method !== "HEAD") Readable.fromWeb(response.body).pipe(res);
    else res.end();
  } catch (error) {
    console.error("Production preview request failed", error.message);
    res.writeHead(500);
    res.end("Preview request failed");
  }
}).listen(port, "127.0.0.1", () => console.log(`Production artifact preview listening on ${port}`));
