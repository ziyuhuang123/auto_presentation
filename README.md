# auto_drawio

`draw.io / diagrams.net` bridge for editing local `.drawio` files through a browser page and syncing changes back to disk.

## New in this version

The bridge is no longer limited to a single shared target file.

You can now run any number of isolated bridge instances in parallel:

- one port per `.drawio` file
- one config file per instance
- one state file per instance
- one stdout / stderr log pair per instance

This fixes the old behavior where multiple browser windows pointed at the same port and kept stealing `config/target.json` from each other.

## Default behavior

The legacy single-instance workflow is still supported:

- config file: `config/target.json`
- default port: `4318`

Example:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\connect-bridge.ps1 -DiagramPath "C:\path\to\file.drawio"
```

## Multi-instance behavior

The bridge now supports any number of independent instances.

Each instance gets its own:

- port
- config file
- state file
- stdout / stderr log

When you pass `-Port`, the bridge uses:

- config: `config/instances/port-<port>.json`
- state: `config/instances/port-<port>.state.json`

Example:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\connect-bridge.ps1 -Port 4319 -DiagramPath "C:\path\to\a.drawio"
powershell -ExecutionPolicy Bypass -File .\scripts\connect-bridge.ps1 -Port 4320 -DiagramPath "C:\path\to\b.drawio"
powershell -ExecutionPolicy Bypass -File .\scripts\connect-bridge.ps1 -Port 4321 -DiagramPath "C:\path\to\c.drawio"
```

That gives you:

- `http://127.0.0.1:4319/` for `a.drawio`
- `http://127.0.0.1:4320/` for `b.drawio`
- `http://127.0.0.1:4321/` for `c.drawio`

These instances do not share `config/target.json`, so they do not steal each other's target file.

## Helper scripts

All helper scripts now support `--port <port>` in addition to the default config:

```powershell
node .\scripts\inspect-target.mjs --port 4319
node .\scripts\backup-target.mjs --port 4319
node .\scripts\open-bridge.mjs --port 4319
node .\scripts\set-target.mjs --port 4319 "C:\path\to\file.drawio"
```

You can also target a specific config file directly:

```powershell
node .\scripts\open-bridge.mjs --config .\config\instances\port-4319.json
```

## Recommended Codex workflow

Tell Codex both the `.drawio` path and the bridge URL you want. For isolated work, prefer a dedicated port:

```text
The diagram file is:
C:\path\to\paper.drawio

Connect the bridge here:
http://127.0.0.1:4319/
```

If the instance is already running on that port, `connect-bridge.ps1` retargets that instance only.
