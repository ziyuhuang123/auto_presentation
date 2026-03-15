import { createServer } from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(rootDir, "public");
const configPath = join(rootDir, "config", "target.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

async function loadConfig() {
  const raw = await readFile(configPath, "utf8");
  const config = JSON.parse(raw);

  if (!config.diagramPath) {
    throw new Error("config/target.json must define diagramPath");
  }

  return {
    diagramPath: config.diagramPath,
    port: Number(config.port) || 4318,
  };
}

async function readDiagram(diagramPath) {
  const [xml, info] = await Promise.all([
    readFile(diagramPath, "utf8"),
    stat(diagramPath),
  ]);

  return {
    xml,
    mtimeMs: info.mtimeMs,
    path: diagramPath,
  };
}

async function writeDiagram(diagramPath, xml) {
  await writeFile(diagramPath, xml, "utf8");
  const info = await stat(diagramPath);
  return {
    mtimeMs: info.mtimeMs,
    path: diagramPath,
  };
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message) {
  json(res, statusCode, { error: message });
}

function serveStatic(res, filePath) {
  return readFile(filePath)
    .then((content) => {
      res.writeHead(200, {
        "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(content);
    })
    .catch(() => {
      sendError(res, 404, "Not found");
    });
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const config = await loadConfig();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/diagram") {
      return json(res, 200, await readDiagram(config.diagramPath));
    }

    if (req.method === "GET" && url.pathname === "/api/meta") {
      const info = await stat(config.diagramPath);
      return json(res, 200, {
        mtimeMs: info.mtimeMs,
        path: config.diagramPath,
      });
    }

    if (req.method === "PUT" && url.pathname === "/api/diagram") {
      const rawBody = await collectBody(req);
      const payload = JSON.parse(rawBody || "{}");

      if (typeof payload.xml !== "string") {
        return sendError(res, 400, "Body must contain a string xml field");
      }

      const result = await writeDiagram(config.diagramPath, payload.xml);
      return json(res, 200, result);
    }

    if (req.method === "GET" && url.pathname === "/api/config") {
      return json(res, 200, {
        diagramPath: config.diagramPath,
        port: config.port,
      });
    }

    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = normalize(join(publicDir, requestedPath));

    if (!filePath.startsWith(publicDir)) {
      return sendError(res, 403, "Forbidden");
    }

    return serveStatic(res, filePath);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

server.listen(config.port, "127.0.0.1", () => {
  console.log(`auto-drawio bridge listening on http://127.0.0.1:${config.port}`);
  console.log(`diagramPath=${config.diagramPath}`);
});
