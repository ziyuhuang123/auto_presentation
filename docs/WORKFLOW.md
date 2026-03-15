# Workflow Guide

## Session startup

From the repository root:

```powershell
npm run inspect
npm run dev
npm run open
```

Then keep the bridge tab open.

## Change the active file

```powershell
npm run target -- "D:\path\to\diagram.drawio"
```

Optionally inspect it:

```powershell
npm run inspect
```

## How to talk to Codex

Recommended prompt patterns:

```text
Use auto_drawio.
Target the file from config/target.json.
Tighten the bottom row and align the badges.
```

```text
Use auto_drawio.
Switch target to D:\work\system.drawio.
Add a new rounded rectangle and connect it to the scheduler.
```

```text
Use auto_drawio.
Do not re-layout the whole canvas.
Only clean up the right half and preserve my manual adjustments.
```

## When you need a manual reset

If the bridge page looks stale:

1. Click `强制重载文件`
2. If bridge logic changed, refresh the browser tab once
3. If needed, restart the bridge with `npm run dev`

## Recommended discipline

- Keep one active target file per session.
- Switch targets explicitly instead of relying on memory.
- Let Codex preserve local manual adjustments unless you ask for a re-layout.
- Use `npm run backup` before large structural changes.
