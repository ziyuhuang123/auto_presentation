本仓库分成两个并列工作区：

- `auto_html/`
  用来读论文、生成单文件 HTML、导出知乎可直接粘贴的富文本内容。
- `auto_drawio/`
  用来做组会 / 论文里的精细示意图，底层是 draw.io bridge。

默认选择规则：

1. 如果用户目标是“读论文、展示论文、发知乎、导出图文页面”，优先进入 `auto_html/`。
2. 如果用户目标是“画精细结构图、系统图、示意图、drawio 图”，优先进入 `auto_drawio/`。
3. 如果用户没有说清楚，但提到 PDF / HTML / 知乎 / 展示页，优先用 `auto_html/`。
4. 如果用户没有说清楚，但提到 draw.io / diagrams.net / bridge / 端口 / `.drawio` 文件，优先用 `auto_drawio/`。

工作方式：

- 进入对应子目录后，优先遵循该子目录自己的 `README.md` / `AGENTS.md` / `codex.md`。
- `auto_html` 默认交付优先级：`clipboard HTML` > `public.md` > 本地相对路径 md。
- `auto_drawio` 默认优先保留用户现有图面风格和布局关系，不要顺手大重排。
