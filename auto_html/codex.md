# Codex 工作记忆

这份文件是给后续在这个目录里工作的 Codex 会话看的。

目标很明确：把论文解读类单页 HTML 转成适合知乎发布的内容，且**大多数正文保留文字**，**只有流程图 / 结构图 / 验证图这类 `svg` 图块单独抽成 PNG**。

当前默认优先级已经调整为：

1. 先生成**可直接复制到知乎的富文本 HTML**
2. 再生成带公网图片 URL 的 `public.md`
3. 本地相对路径版 Markdown 作为中间产物保留

## 默认原则

1. 不要把整页都转成图片。
2. 正文优先保留成 Markdown，方便复制、搜索、编辑、二次修改。
3. 只有 `div.box` 里包含 `svg` 的内容才优先按图片导出。
4. 如果用户抱怨“图不清晰”，先提高导出倍率；如果用户抱怨“手机上字太小”，优先改图的版式和 HTML 布局，而不只是继续放大像素。
5. 保留旧的 `html2png` 能力，但它属于附带工具，不是主流程。
6. 如果用户目标是发知乎，**首选 `publish_html_to_zhihu.ps1` 这条总控流水线**，不要先默认走“只出 md”。
7. 如果用户说“我想直接复制”，默认理解为：要生成 clipboard HTML，并尽量写入系统剪贴板。

## 目录职责

- `export_html_to_markdown.py`
  主转换脚本。解析 HTML 结构，输出 Markdown；可按需调用抽图脚本。
- `export_html_to_markdown.ps1`
  PowerShell 包装器。通常直接调用这个。
- `capture_svg_boxes.js`
  只抽取带 `svg` 的 `div.box` 为 PNG。
- `capture_svg_boxes.ps1`
  抽图包装器。
- `export_html_to_png.js / .ps1`
  旧的整页截图导出流程。
- `prepare_zhihu_publish.py / .ps1`
  把本地 Markdown 和图片变成“公网图片版 Markdown + clipboard HTML + GitHub Pages 发布文件”。
- `copy_zhihu_clipboard.ps1`
  把 clipboard HTML 和纯文本一起写入系统剪贴板。
- `publish_html_to_zhihu.ps1`
  当前首选总控脚本。负责导出、抽图、同步 GitHub Pages、生成公网版内容、可选推送、可选写剪贴板。
- `README.md`
  面向人看的快速说明。
- `DETAILS.md`
  实现细节和转换规则。

## 当前这套工具适用的 HTML

当前规则不是通用网页转 Markdown，而是针对这类“论文可视化解读单页”：

- 页面主体在 `main.page`
- 顶部摘要区在 `section.hero`
- 正文章节在 `section.card`
- 图块通常放在 `div.box > svg`
- 文字卡片主要是 `div.item`、`div.note`

如果换了页面结构，先检查这些选择器是否还成立。`export_html_to_markdown.py` 已经要求必须找到 `main.page`，否则直接报错。

## 标准工作流

### 1. 首选：一键准备知乎发布版

如果用户目标是“发知乎”“直接复制”“最好一键完成”，默认先跑这个：

```powershell
& .\publish_html_to_zhihu.ps1 `
  -InputHtml .\your_note.html `
  -Prefix your_note `
  -ImageScale 3 `
  -CopyToClipboard
```

这条命令会自动：

1. 生成本地 Markdown
2. 抽出高分 PNG
3. 同步图片到 GitHub Pages 仓库
4. 生成公网链接版 `public.md`
5. 生成 `clipboard.fragment.html` 和 `clipboard.html`
6. 把富文本 HTML + 纯文本一起写到系统剪贴板

如果用户还要求“顺便推上去”，再加：

```powershell
-PushPages
```

### 2. 常规导出

```powershell
& .\export_html_to_markdown.ps1 `
  -InputHtml .\your_note.html `
  -OutputDir .\outputs\your_note `
  -Prefix your_note `
  -CaptureImages `
  -ImageScale 3
```

默认建议：

- `-CaptureImages`
  开启抽图。
- `-ImageScale 3`
  当前更适合知乎图文场景；`2` 可用，`3` 更稳。

### 3. 只重新抽图

```powershell
& .\capture_svg_boxes.ps1 `
  -InputHtml .\your_note.html `
  -OutputDir .\outputs\your_note\assets `
  -Prefix your_note `
  -Scale 3
```

### 4. 继续整页导图

只有在用户明确要“整页图片”时才用：

```powershell
& .\export_html_to_png.ps1 `
  -InputHtml .\your_note.html `
  -OutputDir .\png_exports `
  -Prefix your_note `
  -Preset zhihu-mobile `
  -ExportZhihuJpg
```

关键提醒：

- 只跑到“同步到本地 GitHub Pages 仓库”这一步时，公网 URL 还不一定在线
- 只有 `-PushPages` 完成后，`public.md` 和 clipboard HTML 里的远程图片链接才真正对外可访问

## 输出预期

标准输出目录：

```text
auto_html/
  outputs/
    <prefix>/
      <prefix>.md
      assets/
        <prefix>_diagram_*.png
        <prefix>_diagram_manifest.json
```

期望结果：

- Markdown 是正文主载体
- 图片数量不多，只对应关键流程图/结构图
- 图片路径使用相对路径 `./assets/...`
- 如果走知乎发布流，还会额外生成公网链接版 Markdown 和 clipboard HTML
- 如果用户只是要发知乎，优先交付 `clipboard.html` / 剪贴板，而不是优先交付 `.md`

## 修改脚本时的优先级

如果用户要的是“方便发知乎”，优先顺序如下：

1. 先保证正文保留为 Markdown
2. 再保证图块抽取正确
3. 再提升手机端可读性
4. 最后才考虑是否保留原 HTML 视觉风格

换句话说，不要为了“更像原页面”而重新把大量文字做回图片。

补充一条：

- 如果用户主要看重“复制到知乎省事”，那优先保证 clipboard HTML 结构自然、图片链接可访问，其次才是 Markdown 的可读性。

## 常见问题

### 1. 图不清晰

先调：

- `-ImageScale 3`
- 必要时 `-ImageScale 4`

不要第一反应就把正文也截图。

### 2. 手机上字太小

这通常不是分辨率问题，而是版式问题。应优先：

- 调整源 HTML 的单列布局
- 增大图内字体
- 缩小单张图的信息密度
- 必要时把一张复杂图拆成两张

### 3. 某些图没有被抽出来

优先检查：

- 目标块是不是 `div.box`
- 里面是不是真的有 `svg`
- 标题 `h3` 是否存在

### 4. Markdown 转换结果不自然

优先改 `export_html_to_markdown.py` 的结构规则，不要回退成“整段截图”。

### 5. 用户说“我其实不需要 md”

这是合理情况。当前推荐回应应该是：

- 是的，现在优先使用 `clipboard.html` 或直接调用 `-CopyToClipboard`
- `public.md` 只是兜底格式，方便手工修改或平台不接受 HTML 粘贴时使用

## 每次改动后至少要做的验证

1. 运行一次 `export_html_to_markdown.ps1 -CaptureImages`
2. 确认 `.md` 成功生成
3. 确认 `assets/` 里有对应 PNG
4. 检查 `diagram_manifest.json`
5. 随机看一张 PNG 的像素尺寸是否符合预期
6. 如果走知乎发布流，再检查 `public.md` 是否已换成公网 URL
7. 如果用了 `-CopyToClipboard`，再检查剪贴板里是否同时有 `HTML` 和 `UnicodeText`

## 已知环境依赖

- `python`
- `bs4`
- `node`
- Chrome 或 Edge 可执行文件

如果抽图失败，优先查浏览器可执行文件是否存在，再查调试端口是否被占用。

## 对未来会话的约束

如果用户说“还是按这个文件夹来做 html -> md”，默认就是沿用这套策略：

- 主流程：`publish_html_to_zhihu.ps1` 优先
- 交付优先级：`clipboard HTML` > `public.md` > 本地相对路径 md
- 不走“全文截图”
- 先复用现有脚本，必要时增量修改
- 改完必须至少实跑一遍

## 建议给未来会话的用户话术

如果用户想继续沿用这套流程，可以直接说：

> 按 `auto_html` 这套流程来，优先生成可直接粘贴到知乎的版本；图走 GitHub Pages 公网链接，正文保留文字，必要时写入剪贴板。

如果用户想一步到位，也可以直接说：

> 用 `auto_html/publish_html_to_zhihu.ps1` 这套一键流程，帮我从 HTML 生成知乎可直接粘贴的版本，并按需要推 GitHub Pages。
