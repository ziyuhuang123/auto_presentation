import { execFile } from "node:child_process";
import { readConfig, resolveCliConfig } from "./bridge-config.mjs";

const { configPath } = resolveCliConfig(process.argv.slice(2));
const config = await readConfig(configPath);
const url = `http://127.0.0.1:${config.port}`;

if (process.platform === "win32") {
  execFile("cmd", ["/c", "start", "", url]);
} else if (process.platform === "darwin") {
  execFile("open", [url]);
} else {
  execFile("xdg-open", [url]);
}

console.log(`Opened ${url}`);
console.log(`Config: ${configPath}`);
