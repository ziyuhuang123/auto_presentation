import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const configPath = resolve(rootDir, "config", "target.json");

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

const argPath = process.argv.slice(2).join(" ").trim();
const envPath = process.env.AUTO_DRAWIO_TARGET?.trim() ?? "";
const stdinPath = await readStdin();
const inputPath = argPath || envPath || stdinPath;

if (!inputPath) {
  console.error('Usage: npm run target -- "D:\\path\\to\\diagram.drawio"');
  console.error('Windows Unicode-safe: $env:AUTO_DRAWIO_TARGET="D:\\path\\to\\diagram.drawio"; npm run target');
  process.exit(1);
}

if (!inputPath.toLowerCase().endsWith(".drawio")) {
  console.error("Target file must end with .drawio");
  process.exit(1);
}

const raw = await readFile(configPath, "utf8");
const config = JSON.parse(raw);
config.diagramPath = inputPath;

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

console.log(`Updated target diagram: ${config.diagramPath}`);
console.log(`Bridge URL: http://127.0.0.1:${config.port}`);
