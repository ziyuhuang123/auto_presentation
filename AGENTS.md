# Auto Draw.io Workflow

This repository is the default workspace for the user's draw.io automation workflow.

## Target file

- Always read `config/target.json` before modifying a diagram.
- If the user asks to edit a diagram without naming a file, use `config/target.json`.
- If the user wants to switch files, update `config/target.json` first.

## Editing rules

- Preserve the user's manual alignment choices unless the user explicitly asks for a re-layout.
- Prefer compact layouts over wide empty gaps.
- Keep peer modules aligned on the same row when they serve the same stage.
- Center downstream execution blocks under their immediate upstream modules.
- Keep section badges near the top-left of a module and mode badges near the top-right.
- Use orthogonal edges and minimize crossings, detours, and long backtracking routes.
- Avoid negative canvas coordinates unless the user explicitly wants off-canvas spacing.
- Keep titles centered within modules and keep badge offsets visually consistent.

## Workflow

- Assume the user is watching the bridge page at `http://127.0.0.1:<port>/`.
- After changing the target `.drawio` file, do not tell the user to reopen the file manually.
- If `public/app.js` changes, remind the user to refresh the bridge page once so the new bridge logic loads.
