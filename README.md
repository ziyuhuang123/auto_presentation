# auto_drawio

`auto_drawio` is a local draw.io / diagrams.net workflow that lets you:

1. Keep one browser tab open on a fixed bridge page.
2. Watch a local `.drawio` file in real time.
3. Let Codex edit that file directly without asking you to reopen it manually.

The bridge loads the official embedded diagrams.net editor, autosaves changes back to disk, and merges external file updates automatically.

## Why this repo exists

Opening a local `.drawio` file in the normal web editor is inconvenient for iterative AI-assisted editing:

- refreshing the page does not reliably reopen the same local file
- external file edits are awkward to see live
- manual `File > Open` quickly becomes tedious

This repository packages a stable workflow around those problems.

## Quick start

### 1. Set the target file

```powershell
npm run target -- "D:\trash_can\未命名绘图.drawio"
```

This updates [`config/target.json`](config/target.json).

### 2. Start the bridge

```powershell
npm run dev
```

### 3. Open the bridge page

```powershell
npm run open
```

Or open `http://127.0.0.1:4318` manually.

### 4. Keep that tab open during the editing session

You only need to open the bridge page once per session.
After that:

- you can edit in the page directly
- Codex can patch the target `.drawio` file
- the bridge should merge external changes automatically

## Typical workflow

### Human side

1. Open this repository in Codex.
2. Run `npm run dev`.
3. Open `http://127.0.0.1:4318`.
4. Tell Codex what diagram changes you want.

### Codex side

1. Read [`config/target.json`](config/target.json).
2. Modify the target `.drawio` file.
3. Preserve the user's layout choices unless asked to re-layout.
4. Assume the user is watching the bridge page.

## How to tell Codex which file to edit

There are two supported ways:

### Option A: change the configured target once

```powershell
npm run target -- "D:\path\to\another.drawio"
```

After that, any Codex session started in this repository should default to that file.

### Option B: say it directly in chat

Example:

```text
Use auto_drawio. Target file is D:\work\service_map.drawio.
Move the executor block 30px upward and align the bottom row.
```

If the file path you say in chat differs from `config/target.json`, Codex should update the config first.

## How Codex knows to use this repository

Use one of these patterns:

- start Codex in `C:\Users\hzy\auto_drawio`
- say `Use the auto_drawio repo`
- say `Use auto_drawio and target the file in config/target.json`

This repository also has a project-level [`AGENTS.md`](AGENTS.md), so future Codex sessions inherit the diagram workflow and layout preferences automatically.

## Commands

```powershell
npm run dev
npm run open
npm run target -- "D:\path\to\diagram.drawio"
npm run inspect
npm run backup
```

## Repository structure

- [`server.mjs`](server.mjs): tiny HTTP server for the bridge and local file API
- [`public/index.html`](public/index.html): bridge page shell
- [`public/app.js`](public/app.js): draw.io embed bridge logic, autosave, merge-on-change
- [`public/styles.css`](public/styles.css): bridge styling
- [`config/target.json`](config/target.json): current target `.drawio` and port
- [`scripts/set-target.mjs`](scripts/set-target.mjs): switch the active target file
- [`scripts/open-bridge.mjs`](scripts/open-bridge.mjs): open the bridge page
- [`scripts/inspect-target.mjs`](scripts/inspect-target.mjs): inspect current target metadata
- [`scripts/backup-target.mjs`](scripts/backup-target.mjs): create a backup of the target file
- [`docs/CODEBASE.md`](docs/CODEBASE.md): detailed code walkthrough
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md): day-to-day usage guide

## Important caveats

- If `public/app.js` changes, refresh the bridge page once so the new bridge logic loads.
- Automatic external updates use `merge` first to avoid leave/reload prompts.
- If the editor ever drifts out of sync, click `强制重载文件`.
- If both the human and Codex edit the same objects at the same time, the last write wins.

## Suggested future extensions

- higher-level shape commands such as `add-rectangle`, `add-ellipse`, `connect`, `align-left`
- PNG / PDF export helpers
- project presets for common diagram styles
