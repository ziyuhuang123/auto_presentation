import { copyFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { readConfig, resolveCliConfig } from "./bridge-config.mjs";

const { configPath } = resolveCliConfig(process.argv.slice(2));
const config = await readConfig(configPath);

const source = config.diagramPath;
const extension = extname(source);
const stem = basename(source, extension);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = join(dirname(source), `${stem}.bak_${stamp}${extension}`);

await copyFile(source, target);

console.log(`Backup created: ${target}`);
console.log(`Config: ${configPath}`);
