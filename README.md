# auto_presentation

这个仓库现在分成两个并列子目录：

- `auto_html/`
  用来读论文、生成图文并茂的单文件 HTML、导出知乎可直接粘贴的富文本内容。
- `auto_drawio/`
  用来做组会和写论文时需要的精细示意图，底层仍然是 draw.io / diagrams.net bridge 工作流。

一句话区分：

- 想快速“读论文、讲思路、做展示页、发知乎”，用 `auto_html`
- 想认真“画结构图、系统图、执行流程图、论文插图”，用 `auto_drawio`

## 仓库结构

```text
auto_presentation/
  auto_html/
  auto_drawio/
```

## 什么时候用哪个

### `auto_html`

适合这些场景：

- 读一篇 PDF，想快速梳理论文思路
- 做一个单文件 HTML 展示页
- 想把正文保留成文字，只把流程图抽成 PNG
- 想生成知乎可直接粘贴的富文本内容

### `auto_drawio`

适合这些场景：

- 组会汇报里的系统示意图
- 论文中的精细结构图、时序图、流程图
- 需要反复手工微调布局、连线、对齐关系
- 需要 draw.io 的交互式编辑和 bridge 自动刷新

## 推荐用法

### 1. 用 `auto_html` 读论文 / 出知乎稿

先进入目录：

```powershell
cd .\auto_html
```

然后你可以直接对 Codex 说：

```text
按 auto_html 这套流程来，读取这篇论文 PDF / HTML，优先生成可直接粘贴到知乎的版本；正文保留文字，流程图单独抽 PNG，必要时写入剪贴板。
```

如果你已经有单文件 HTML，希望一键生成知乎可粘贴版，最常用命令是：

```powershell
.\publish_html_to_zhihu.ps1 `
  -InputHtml .\your_note.html `
  -Prefix your_note `
  -ImageScale 3 `
  -CopyToClipboard
```

如果还想自动推 GitHub Pages，再加：

```powershell
-PushPages
```

更多细节看：

- [auto_html/README.md](./auto_html/README.md)
- [auto_html/codex.md](./auto_html/codex.md)

### 2. 用 `auto_drawio` 画精细示意图

先进入目录：

```powershell
cd .\auto_drawio
```

然后你可以直接对 Codex 说：

```text
按 auto_drawio 这套流程来，目标 drawio 文件是 <你的 .drawio 路径>，先帮我连接 bridge，再基于当前图继续精细修改。要求：布局紧凑、连线正交、保留已有对齐关系。
```

如果你想手动启动 bridge，常用命令是：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\connect-bridge.ps1 -DiagramPath "C:\path\to\your.drawio"
```

如果要多实例：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\connect-bridge.ps1 -Port 4319 -DiagramPath "C:\path\to\a.drawio"
powershell -ExecutionPolicy Bypass -File .\scripts\connect-bridge.ps1 -Port 4320 -DiagramPath "C:\path\to\b.drawio"
```

更多细节看：

- [auto_drawio/README.md](./auto_drawio/README.md)
- [auto_drawio/AGENTS.md](./auto_drawio/AGENTS.md)

## 给 Codex 的总 prompt 模板

### 论文展示 / 知乎

```text
按 auto_html 这套流程来，读取/整理这篇论文，生成图文并茂的展示内容。优先产出可直接粘贴到知乎的版本；正文保留文字，流程图单独抽 PNG，必要时同步 GitHub Pages 并写入剪贴板。
```

### 精细示意图

```text
按 auto_drawio 这套流程来，目标文件是 <你的 .drawio 路径>。先连接 bridge，再在现有风格上继续细化示意图。要求：布局紧凑、少留白、同层对齐、连线正交、尽量少交叉。
```
