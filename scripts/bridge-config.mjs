import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = fileURLToPath(new URL("../", import.meta.url));
export const defaultConfigPath = join(rootDir, "config", "target.json");
export const instancesDir = join(rootDir, "config", "instances");

function parsePort(rawValue) {
  const port = Number(rawValue);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${rawValue}`);
  }

  return port;
}

export function resolveCliConfig(argv) {
  let port = null;
  let configPath = "";
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--port") {
      const nextValue = argv[index + 1];

      if (!nextValue) {
        throw new Error("--port requires a value");
      }

      port = parsePort(nextValue);
      index += 1;
      continue;
    }

    if (arg === "--config") {
      const nextValue = argv[index + 1];

      if (!nextValue) {
        throw new Error("--config requires a value");
      }

      configPath = resolve(nextValue);
      index += 1;
      continue;
    }

    positional.push(arg);
  }

  if (port !== null && configPath) {
    throw new Error("Use either --port or --config, not both");
  }

  return {
    port,
    configPath: configPath || (port !== null ? join(instancesDir, `port-${port}.json`) : defaultConfigPath),
    positional,
  };
}

export async function readConfig(configPath) {
  const raw = await readFile(configPath, "utf8");
  return JSON.parse(raw);
}

export async function writeConfig(configPath, config) {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return config;
}

export async function ensureConfig(configPath, overrides = {}) {
  let config;

  try {
    config = await readConfig(configPath);
  } catch {
    try {
      config = await readConfig(defaultConfigPath);
    } catch {
      config = {
        diagramPath: "",
        port: 4318,
      };
    }
  }

  if (typeof overrides.port === "number") {
    config.port = overrides.port;
  }

  if (typeof overrides.diagramPath === "string" && overrides.diagramPath) {
    config.diagramPath = overrides.diagramPath;
  }

  return writeConfig(configPath, config);
}
