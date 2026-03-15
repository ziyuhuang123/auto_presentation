import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const configPath = join(rootDir, "config", "target.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const url = `http://127.0.0.1:${config.port}`;

if (process.platform === "win32") {
  execFile("cmd", ["/c", "start", "", url]);
} else if (process.platform === "darwin") {
  execFile("open", [url]);
} else {
  execFile("xdg-open", [url]);
}

console.log(`Opened ${url}`);
