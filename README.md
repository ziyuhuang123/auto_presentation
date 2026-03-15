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

## 使用流程说明

### 一次标准会话怎么开始

在仓库根目录执行：

```powershell
npm run inspect
npm run dev
npm run open
```

然后让 `http://127.0.0.1:4318/` 这个页面一直开着。

### 每次是不是都要重新打开网址

不是每改一次图都重新打开。

正确理解是：

- 每个编辑会话开始时打开一次
- 然后一直保持该页面开着
- Codex 改图时，页面应该自动更新
- 只有 bridge 脚本变了，才需要刷新一次浏览器

### 什么时候要在 prompt 里明确文件路径

建议在下面几种场景里明确说：

- 刚进入一个新对话
- 切换到另一个 `.drawio` 文件
- 当前不是从 `auto_drawio` 仓库启动的
- 你不确定 `config/target.json` 里是不是正确路径

推荐写法：

```text
使用 auto_drawio。
当前目标文件是 D:\work\service_map.drawio。
```

如果你已经提前执行过：

```powershell
npm run target -- "D:\work\service_map.drawio"
```

那后续可以简化成：

```text
使用 auto_drawio。
修改当前 target 文件。
```

### 页面没有自动更新怎么办

按下面顺序处理：

1. 先等 1 秒到 2 秒
2. 点击页面右上角“强制重载文件”
3. 如果你刚改过 `public/app.js`，刷新一次浏览器
4. 如果仍不对，重启 bridge：

```powershell
npm run dev
```

### 什么时候建议先备份

下面这些情况建议先执行：

```powershell
npm run backup
```

适用场景：

- 要整体移动很多模块
- 要重做一块连线
- 要替换大段文本
- 要把参考图重新临摹成结构图

### 建议的操作纪律

- 一次会话只围绕一个主目标文件
- 切换文件时显式更新 target
- 你手调完布局后，prompt 里最好补一句“保留当前布局”
- 如果要整体重排，明确说“允许整体重排”

## 代码结构说明

### 总览

这个仓库可以分成三层：

1. 本地 bridge 服务
2. 浏览器 bridge 页面
3. 目标文件与辅助脚本

### 1. 本地 bridge 服务

文件：[`server.mjs`](server.mjs)

职责：

- 提供本地网页入口
- 读取当前目标 `.drawio` 文件
- 把 XML 内容返回给前端页面
- 接收前端自动保存后的 XML 并写回磁盘
- 提供目标文件的修改时间，供前端轮询判断是否有外部改动

它本身不理解 draw.io 图元语义，只负责“把 XML 在磁盘和浏览器之间搬运”。

### 2. 浏览器 bridge 页面

文件：

- [`public/index.html`](public/index.html)
- [`public/app.js`](public/app.js)
- [`public/styles.css`](public/styles.css)

`public/index.html` 提供 bridge 页面外壳，包括：

- 顶部状态栏
- 当前目标文件路径显示
- 自动重载暂停开关
- 手动“强制重载文件”按钮
- 嵌入官方 diagrams.net 编辑器的 iframe

`public/app.js` 是整个工作流的核心，负责：

- 调用 `/api/config` 读取当前目标文件路径和端口
- 调用 `/api/diagram` 读取目标文件 XML
- 把 XML 加载到嵌入式 diagrams.net 编辑器
- 监听编辑器的 `autosave` / `save` 事件
- 保存回磁盘
- 轮询 `/api/meta` 监视目标文件是否被外部修改
- 外部文件变化时优先走 `merge`
- 必要时执行完整重载

这样设计的目的，是尽量避免 draw.io 常见的“刷新即丢当前本地文件上下文”和“离开提示”问题。

`public/styles.css` 只负责 bridge 页面的 UI 外壳样式，不参与图本身的绘制逻辑。

### 3. 目标文件与辅助脚本

配置文件：[`config/target.json`](config/target.json)

这个文件是默认目标的单一真相来源，保存：

- 当前要编辑的 `.drawio` 文件路径
- bridge 使用的端口

只要当前对话是基于本仓库开始的，Codex 就应该优先读取这个文件。

辅助脚本：

- [`scripts/set-target.mjs`](scripts/set-target.mjs)
  切换默认目标文件

- [`scripts/inspect-target.mjs`](scripts/inspect-target.mjs)
  查看当前目标文件信息，包括路径、端口、文件大小、最后修改时间

- [`scripts/backup-target.mjs`](scripts/backup-target.mjs)
  在大改前给目标文件做一个带时间戳的备份

- [`scripts/open-bridge.mjs`](scripts/open-bridge.mjs)
  用默认浏览器打开 bridge 页面

### 仓库级助手记忆

文件：[`AGENTS.md`](AGENTS.md)

这里定义了以后所有 Codex 会话默认遵守的规则，包括：

- 先看 `config/target.json`
- 默认使用当前 target 文件
- 保留用户手调过的布局
- 优先紧凑排布
- 连线尽量正交
- 修改图后默认认为用户正在看 bridge 页面

这就是“以后我怎么知道要用哪个仓库、怎么知道改哪个文件”的核心机制之一。
