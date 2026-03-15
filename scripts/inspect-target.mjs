import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const configPath = resolve(rootDir, "config", "target.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const info = await stat(config.diagramPath);

console.log(`diagramPath: ${config.diagramPath}`);
console.log(`port: ${config.port}`);
console.log(`size: ${info.size}`);
console.log(`lastWriteTime: ${info.mtime.toISOString()}`);
