import { stat } from "node:fs/promises";
import { readConfig, resolveCliConfig } from "./bridge-config.mjs";

const { configPath } = resolveCliConfig(process.argv.slice(2));
const config = await readConfig(configPath);
const info = await stat(config.diagramPath);

console.log(`diagramPath: ${config.diagramPath}`);
console.log(`port: ${config.port}`);
console.log(`configPath: ${configPath}`);
console.log(`size: ${info.size}`);
console.log(`lastWriteTime: ${info.mtime.toISOString()}`);
