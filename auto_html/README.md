# auto_html

这个子目录专门用于“读论文、做展示页、导出知乎可粘贴内容”。

它的核心原则是：

- 正文尽量保留成文字
- 只有流程图 / 结构图 / 验证图这类 `svg` 图块单独抽成 PNG
- 默认优先交付**可直接粘贴到知乎的富文本 HTML**

## 适用场景

- 读一篇论文 PDF，想快速做成图文并茂的单文件 HTML
- 已经有单文件 HTML，想转成知乎可粘贴内容
- 想保留大部分正文为文字，而不是整页截图
- 想把图片自动同步到 GitHub Pages，当作公网图床

## 最推荐的用法

如果你已经有一个单文件 HTML，想一键得到知乎可粘贴版：

```powershell
.\publish_html_to_zhihu.ps1 `
  -InputHtml .\your_note.html `
  -Prefix your_note `
  -ImageScale 3 `
  -CopyToClipboard
```

这会自动：

- 生成本地 Markdown
- 抽高分 PNG
- 把图片同步到 GitHub Pages 仓库
- 生成公网图片版 `public.md`
- 生成 `clipboard.html`
- 把富文本 HTML + 纯文本一起写入剪贴板

如果还想自动提交并推 GitHub Pages，再加：

```powershell
-PushPages
```

如果你的 GitHub Pages 仓库不在当前仓库同级目录，需要显式传：

```powershell
-GitHubPagesRepo "C:\path\to\ziyuhuang123.github.io"
```

## 常用命令

### 1. 一键知乎发布流

```powershell
.\publish_html_to_zhihu.ps1 `
  -InputHtml .\your_note.html `
  -Prefix your_note `
  -ImageScale 3 `
  -CopyToClipboard
```

### 2. 只做 HTML -> Markdown + 抽图

```powershell
.\export_html_to_markdown.ps1 `
  -InputHtml .\your_note.html `
  -OutputDir .\outputs\your_note `
  -Prefix your_note `
  -CaptureImages `
  -ImageScale 3
```

### 3. 只抽图

```powershell
.\capture_svg_boxes.ps1 `
  -InputHtml .\your_note.html `
  -OutputDir .\outputs\your_note\assets `
  -Prefix your_note `
  -Scale 3
```

### 4. 继续整页导图

```powershell
.\export_html_to_png.ps1 `
  -InputHtml .\your_note.html `
  -OutputDir .\png_exports `
  -Prefix your_note `
  -Preset zhihu-mobile `
  -ExportZhihuJpg
```

## 给 Codex 的推荐 prompt

### 论文展示 / 知乎

```text
按 auto_html 这套流程来，读取/整理这篇论文，生成图文并茂的展示内容。优先产出可直接粘贴到知乎的版本；正文保留文字，流程图单独抽 PNG，必要时同步 GitHub Pages 并写入剪贴板。
```

### 已有 HTML，直接出知乎稿

```text
按 auto_html 这套流程来，基于这个单文件 HTML 生成知乎可直接粘贴的版本。优先交付 clipboard HTML，不要把整页都截图；图走公网链接，正文保留文字。
```

## 输出内容

常见输出包括：

- `<prefix>.md`
  本地相对路径版 Markdown
- `<prefix>.public.md`
  图片换成公网 URL 的 Markdown
- `<prefix>.clipboard.fragment.html`
  写剪贴板用的富文本片段
- `<prefix>.clipboard.html`
  本地预览用的完整 HTML
- `assets/*.png`
  抽出来的高分辨率图片

如果你的目标只是发知乎，通常优先用：

- 剪贴板里的富文本内容
- 或 `<prefix>.clipboard.html`

`public.md` 主要是兜底。

## 适合什么 HTML

当前更适合这类单文件页面：

- 页面主体在 `main.page`
- 顶部摘要区在 `section.hero`
- 正文章节在 `section.card`
- 图块主要在 `div.box > svg`

也就是说，它不是“任意网页通用转换器”，而是更偏“论文解读单页”的半自动工具。

## 进一步说明

- 细节规则看 [DETAILS.md](./DETAILS.md)
- 会话记忆和长期约定看 [codex.md](./codex.md)
