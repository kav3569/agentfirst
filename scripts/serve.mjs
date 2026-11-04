import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { byteRange } from "./byte-range.mjs";
const root = resolve("out");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".wav": "audio/wav",
};
createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    let path = resolve(
      root,
      "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
    );
    if (path !== root && !path.startsWith(root + sep))
      throw new Error("Invalid path");
    if (!extname(path) && path !== root) {
      try {
        if ((await stat(path + ".html")).isFile()) path += ".html";
      } catch {}
    }
    if ((await stat(path)).isDirectory()) path = resolve(path, "index.html");
    const body = await readFile(path);
    const headers = {
      "Content-Type": types[extname(path)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
      "Content-Length": body.length,
    };
    if (req.headers.range) {
      const range = byteRange(req.headers.range, body.length);
      if (!range) {
        res.writeHead(416, { "Content-Range": `bytes */${body.length}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        ...headers,
        "Content-Range": `bytes ${range.start}-${range.end}/${body.length}`,
        "Content-Length": range.end - range.start + 1,
      });
      res.end(
        req.method === "HEAD"
          ? undefined
          : body.subarray(range.start, range.end + 1),
      );
      return;
    }
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(3000, "127.0.0.1", () =>
  console.log("AgentFirst production preview: http://localhost:3000"),
);
