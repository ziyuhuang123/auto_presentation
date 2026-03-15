修改 draw.io 的示意图时可以考虑以下 layout preference：
- 优先紧凑布局，不要留大块空白
- 同层模块尽量在同一行对齐
- 下游执行模块尽量放在上游模块正下方居中
- 章节角标放左上，模式角标放右上
- 连线优先正交，尽量少交叉、少绕路
- 除非你明确要求，否则避免放到负坐标区域
- 优先保留你手工调过的对齐关系
- 模块标题尽量居中，角标偏移保持一致

---

# auto_drawio 仓库规则

这个仓库是用户默认的 draw.io / diagrams.net 自动化工作区。

## 当前目标文件

- 修改图之前，先读取 `config/target.json`。
- 如果用户没有在当前对话里明确指定文件路径，默认使用 `config/target.json` 里的 `diagramPath`。
- 如果用户在当前对话里给了新的 `.drawio` 文件路径，先更新 `config/target.json`，再修改该文件。

## 连接 bridge 的默认流程

- 如果用户说“帮我连接服务器”或给了新的 `.drawio` 文件路径，优先运行：
  `powershell -ExecutionPolicy Bypass -File scripts/connect-bridge.ps1 -DiagramPath "<path>"`
- 不要优先用 `npm run target -- "<path>"` 处理中文路径；Windows 下这条链路可能把非 ASCII 路径写坏。
- `connect-bridge.ps1` 会负责三件事：
  1. 更新 `config/target.json`
  2. 确保 `http://127.0.0.1:<port>/` 的 bridge 已经启动
  3. 如果 bridge 已在运行，直接切换到新的目标文件
- `server.mjs` 现在会在每次 API 请求时重新读取 `config/target.json`，所以切换目标文件后不需要重新 `File > Open`。
- 如果 bridge 因沙箱被回收，重新启动时优先使用沙箱外后台进程。

## 交互约定

- 默认认为用户正在浏览 `http://127.0.0.1:<port>/` 这个 bridge 页面。
- 修改目标 `.drawio` 文件后，不要让用户手动去 `File > Open` 重新打开文件。
- 如果本次修改涉及 `public/app.js`，提醒用户手动刷新 bridge 页面一次，让新脚本生效。
- 如果用户没有说明仓库，但任务明显是“继续使用 auto_drawio 工作流”，优先使用本仓库。

## 布局与排版规则

- 优先保留用户手动调过的布局，除非用户明确要求整体重排。
- 优先紧凑布局，避免大片空白。
- 同层模块尽量放在同一行，并保持稳定对齐。
- 下游执行模块优先放在其直接上游模块的正下方居中位置。
- 章节角标优先放模块左上角，模式角标优先放右上角。
- 连线优先使用正交线，尽量减少交叉、绕路和回折。
- 除非用户明确要求，否则不要把重要图形放到负坐标区域。
- 模块标题尽量居中，角标偏移保持一致。

## 修改策略

- 做局部优化时，优先微调坐标和连线，不要顺手重排整张图。
- 大改前优先建议或执行 `npm run backup`。
- 如果用户说“按我现在这版风格继续”，按现有图面风格延续，而不是套新的模板。

## Skills

A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.

### Available skills

- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: C:/Users/hzy/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: C:/Users/hzy/.codex/skills/.system/skill-installer/SKILL.md)

### How to use skills

- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1. After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2. When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3. If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4. If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5. If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
