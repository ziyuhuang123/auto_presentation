import { copyFile, readFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const configPath = join(rootDir, "config", "target.json");
const config = JSON.parse(await readFile(configPath, "utf8"));

const source = config.diagramPath;
const extension = extname(source);
const stem = basename(source, extension);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = join(dirname(source), `${stem}.bak_${stamp}${extension}`);

await copyFile(source, target);

console.log(`Backup created: ${target}`);
