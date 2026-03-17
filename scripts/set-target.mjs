import { ensureConfig, resolveCliConfig } from "./bridge-config.mjs";

async function readStdin() {
  if (process.stdin.isTTY) {
    return "";
  }

  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8").trim();
}

const { port, configPath, positional } = resolveCliConfig(process.argv.slice(2));
const argPath = positional.join(" ").trim();
const envPath = process.env.AUTO_DRAWIO_TARGET?.trim() ?? "";
const stdinPath = await readStdin();
const inputPath = argPath || envPath || stdinPath;

if (!inputPath) {
  console.error('Usage: npm run target -- "D:\\path\\to\\diagram.drawio"');
  console.error('Multi-instance: npm run target -- --port 4319 "D:\\path\\to\\diagram.drawio"');
  console.error('Windows Unicode-safe: $env:AUTO_DRAWIO_TARGET="D:\\path\\to\\diagram.drawio"; npm run target');
  process.exit(1);
}

if (!inputPath.toLowerCase().endsWith(".drawio")) {
  console.error("Target file must end with .drawio");
  process.exit(1);
}

const config = await ensureConfig(configPath, {
  port: port ?? undefined,
  diagramPath: inputPath,
});

console.log(`Updated target diagram: ${config.diagramPath}`);
console.log(`Bridge URL: http://127.0.0.1:${config.port}`);
console.log(`Config: ${configPath}`);
