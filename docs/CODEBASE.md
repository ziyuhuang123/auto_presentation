# Codebase Walkthrough

## Overview

The repository has three layers:

1. A tiny local server
2. A browser bridge page
3. Workflow scripts for targeting and operating on `.drawio` files

## 1. Local server

[`server.mjs`](../server.mjs) is intentionally minimal.

Responsibilities:

- serve the browser assets in `public/`
- expose the current target path through `/api/config`
- expose the target file XML through `/api/diagram`
- expose only the target file timestamp through `/api/meta`
- write updated XML back to disk through `PUT /api/diagram`

It does not try to understand draw.io internals. It only moves XML between disk and browser.

## 2. Browser bridge

[`public/app.js`](../public/app.js) hosts the main workflow.

Responsibilities:

- load the target XML from disk
- embed the official diagrams.net editor
- autosave editor changes back to disk
- detect external file modifications by polling `/api/meta`
- merge those changes into the open editor automatically
- fall back to full reload when needed

Important design choices:

- `modified=0`, `drafts=0`, and `nowarn=1` reduce leave/reload prompts
- external updates prefer `merge` instead of replacing the iframe immediately
- manual reload still performs a full reload

## 3. Workflow scripts

The `scripts/` directory is about making the workflow operational instead of ad hoc.

### [`scripts/set-target.mjs`](../scripts/set-target.mjs)

Updates the default target file in `config/target.json`.

### [`scripts/open-bridge.mjs`](../scripts/open-bridge.mjs)

Opens the bridge page in the default browser.

### [`scripts/inspect-target.mjs`](../scripts/inspect-target.mjs)

Prints current target metadata for quick inspection.

### [`scripts/backup-target.mjs`](../scripts/backup-target.mjs)

Creates a timestamped backup before risky edits.

## Configuration

[`config/target.json`](../config/target.json) is the source of truth for:

- which `.drawio` file Codex should edit by default
- which port the bridge should use

## Assistant memory

[`AGENTS.md`](../AGENTS.md) turns repository conventions into persistent instructions for future Codex sessions.

It answers:

- which file is the active target
- how Codex should preserve layout choices
- how Codex should behave after modifying a diagram
