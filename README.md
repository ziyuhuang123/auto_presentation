# auto_drawio

`auto_drawio` 是一套本地 draw.io / diagrams.net 协作工作流，目标是解决下面这个问题：

- 你想一直看着一个图形编辑页面
- Codex 直接改本地 `.drawio` 文件
- 页面自动反映修改结果
- 不想每次都手动 `File > Open`

这个仓库把这套流程固化成了一个可重复使用的工程。

## 这套方案在做什么

仓库里有一个本地 bridge 服务。它做三件事：

1. 打开官方 `diagrams.net` 嵌入编辑器
2. 把本地 `.drawio` 文件加载到这个编辑器里
3. 监视文件变化，并把外部修改自动合并到当前页面

这样你只要打开一个固定地址，就能持续编辑同一个本地图文件，同时允许 Codex 直接改这个文件。

## 仓库位置

建议固定使用这个目录：

`C:\文件备份\auto_drawio`

以后如果你想继续走这套流程，最好直接在这个仓库里启动 Codex，或者在 prompt 里明确说：

```text
使用 C:\文件备份\auto_drawio 仓库。
```

## 核心结论

### 1. 我是不是需要在 prompt 里明确告诉你当前修改的文件位于哪里？

最好要，尤其是在以下情况：

- 你刚切换到一个新 `.drawio` 文件
- 当前对话没有上下文
- 你不是在 `auto_drawio` 仓库里启动 Codex

最稳的说法是：

```text
使用 auto_drawio。
当前目标文件是 D:\work\system.drawio。
```

如果你不想每次都说一遍，也可以先改默认目标文件：

```powershell
npm run target -- "D:\work\system.drawio"
```

之后在同一个仓库里继续使用时，我就会优先读 `config/target.json`。

### 2. 是不是每次都只要打开 `http://127.0.0.1:4318/` 就可以改图？

严格地说，是“每个编辑 session 打开一次”。

正确流程是：

1. 启动 bridge 服务
2. 打开 `http://127.0.0.1:4318/`
3. 保持这个页面开着
4. 你和 Codex 都围绕同一个目标 `.drawio` 文件工作

不是每改一次图都重新打开这个网址，而是：

- 每次开始新会话时，打开一次
- 然后持续用这个页面
- 只有 bridge 脚本本身变了，才需要手动刷新一次网页

### 3. 你怎么知道该用哪个仓库？

最稳的方式有三种：

- 直接在 `C:\文件备份\auto_drawio` 目录里启动 Codex
- 在 prompt 开头写：`使用 auto_drawio`
- 在 prompt 开头写：`使用 C:\文件备份\auto_drawio 仓库`

这个仓库自带 [`AGENTS.md`](AGENTS.md)，里面已经写好了目标文件规则、排版规则和交互约定。只要当前对话是基于这个仓库开始的，我就会优先按这套流程工作。

## 快速开始

### 1. 查看当前目标文件

```powershell
npm run inspect
```

### 2. 如果要切换目标文件

```powershell
npm run target -- "D:\path\to\your.drawio"
```

### 3. 启动 bridge

```powershell
npm run dev
```

### 4. 打开编辑页面

```powershell
npm run open
```

或者直接在浏览器中打开：

`http://127.0.0.1:4318/`

### 5. 保持这个页面开着，然后开始提修改要求

例如：

```text
使用 auto_drawio。
目标文件使用 config/target.json 里的路径。
不要整体重排，只把右下区域压紧一点。
```

## 推荐 prompt 模板

### 模板 1：使用当前默认文件

```text
使用 auto_drawio。
目标文件使用 config/target.json。
保持我当前手调的布局。
只微调底部模块和连线。
```

### 模板 2：切换到新文件

```text
使用 auto_drawio。
把目标文件切换到 D:\work\service_map.drawio。
新增一个圆角矩形，并连接到 scheduler。
```

### 模板 3：强调不要破坏现有布局

```text
使用 auto_drawio。
目标文件使用 config/target.json。
不要整体重排。
优先保留我手工调过的对齐，只做局部优化。
```

## 命令说明

```powershell
npm run dev
npm run open
npm run inspect
npm run backup
npm run target -- "D:\path\to\diagram.drawio"
```

这些命令的作用分别是：

- `npm run dev`
  启动本地 bridge 服务

- `npm run open`
  在默认浏览器中打开 bridge 页面

- `npm run inspect`
  查看当前目标文件路径、端口、文件大小、最后修改时间

- `npm run backup`
  给当前目标文件创建一个带时间戳的备份

- `npm run target -- "路径"`
  修改默认目标文件

## 典型使用流程

### 方案 A：你只改一个文件，持续做图

1. 运行 `npm run target -- "你的文件.drawio"`，只做一次
2. 运行 `npm run dev`
3. 打开 `http://127.0.0.1:4318/`
4. 后续都只说“使用 auto_drawio，改当前目标文件”

### 方案 B：你经常在多个文件之间切换

每次切换前先执行：

```powershell
npm run target -- "新的文件.drawio"
```

然后在 prompt 里再明确一句：

```text
使用 auto_drawio。
修改当前 target 文件。
```

### 方案 C：你不想改配置文件，只想临时指定

你也可以直接在 prompt 里说：

```text
使用 auto_drawio。
当前目标文件是 D:\temp\demo.drawio。
```

这时我应该先把 `config/target.json` 同步成这个路径，再开始修改。

## 目录说明

- [`server.mjs`](server.mjs)
  本地 HTTP 服务，负责读取和写回 `.drawio` 文件，并提供 bridge 页面

- [`public/index.html`](public/index.html)
  bridge 页面外壳

- [`public/app.js`](public/app.js)
  核心 bridge 逻辑，包括嵌入编辑器、自动保存、监视文件变化、自动 merge

- [`public/styles.css`](public/styles.css)
  bridge 页面的样式

- [`config/target.json`](config/target.json)
  当前默认目标文件路径与端口配置

- [`scripts/set-target.mjs`](scripts/set-target.mjs)
  切换默认目标文件

- [`scripts/inspect-target.mjs`](scripts/inspect-target.mjs)
  查看当前目标文件信息

- [`scripts/backup-target.mjs`](scripts/backup-target.mjs)
  备份当前目标文件

- [`scripts/open-bridge.mjs`](scripts/open-bridge.mjs)
  打开 bridge 页面

- [`docs/WORKFLOW.md`](docs/WORKFLOW.md)
  日常使用流程说明

- [`docs/CODEBASE.md`](docs/CODEBASE.md)
  代码结构说明

## 重要注意事项

- 如果你改的是图文件本身，bridge 页面应当自动更新。
- 如果你改的是 `public/app.js` 这样的 bridge 逻辑文件，你需要手动刷新一次浏览器页面。
- 如果页面看起来没同步，可以点击右上角“强制重载文件”。
- 如果你和 Codex 同时改同一个对象，最终结果遵循“最后写入覆盖之前写入”。

## 建议习惯

- 每次大改前先执行一次 `npm run backup`
- 一次会话尽量只围绕一个目标文件
- 如果换文件，明确改 `target.json` 或在 prompt 里明确说路径
- 如果你已经手调过布局，prompt 里最好加一句“保留我当前布局”

## 后续可扩展方向

这个仓库目前已经能稳定支撑“看着页面，让 Codex 改 `.drawio` 文件”的工作流。下一步可以继续做：

- 更高层的命令式 helper
  例如：新增矩形、圆形、连接线、左对齐、顶对齐

- 导出助手
  例如：PNG 导出、PDF 导出

- 风格模板
  例如：论文流程图模板、系统结构图模板、产品流程图模板
