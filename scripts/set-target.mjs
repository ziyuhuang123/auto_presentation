import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const configPath = resolve(rootDir, "config", "target.json");
const inputPath = process.argv.slice(2).join(" ").trim();

if (!inputPath) {
  console.error('Usage: npm run target -- "D:\\path\\to\\diagram.drawio"');
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
