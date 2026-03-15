# 代码结构说明

## 总览

这个仓库可以分成三层：

1. 本地 bridge 服务
2. 浏览器 bridge 页面
3. 目标文件与辅助脚本

## 1. 本地 bridge 服务

文件：[`server.mjs`](../server.mjs)

职责：

- 提供本地网页入口
- 读取当前目标 `.drawio` 文件
- 把 XML 内容返回给前端页面
- 接收前端自动保存后的 XML 并写回磁盘
- 提供目标文件的修改时间，供前端轮询判断是否有外部改动

它本身不理解 draw.io 图元语义，只负责“把 XML 在磁盘和浏览器之间搬运”。

## 2. 浏览器 bridge 页面

文件：

- [`public/index.html`](../public/index.html)
- [`public/app.js`](../public/app.js)
- [`public/styles.css`](../public/styles.css)

### `public/index.html`

提供 bridge 页面外壳，包括：

- 顶部状态栏
- 当前目标文件路径显示
- 自动重载暂停开关
- 手动“强制重载文件”按钮
- 嵌入官方 diagrams.net 编辑器的 iframe

### `public/app.js`

这是整个工作流的核心。

它做的事情包括：

- 调用 `/api/config` 读取当前目标文件路径和端口
- 调用 `/api/diagram` 读取目标文件 XML
- 把 XML 加载到嵌入式 diagrams.net 编辑器
- 监听编辑器的 `autosave` / `save` 事件
- 保存回磁盘
- 轮询 `/api/meta` 监视目标文件是否被外部修改
- 外部文件变化时优先走 `merge`
- 必要时执行完整重载

这样设计的目的，是尽量避免 draw.io 常见的“刷新即丢当前本地文件上下文”和“离开提示”问题。

### `public/styles.css`

只负责 bridge 页面的 UI 外壳样式，不参与图本身的绘制逻辑。

## 3. 目标文件与辅助脚本

### 配置文件

文件：[`config/target.json`](../config/target.json)

这个文件是默认目标的单一真相来源，保存：

- 当前要编辑的 `.drawio` 文件路径
- bridge 使用的端口

只要当前对话是基于本仓库开始的，Codex 就应该优先读取这个文件。

### 辅助脚本

#### [`scripts/set-target.mjs`](../scripts/set-target.mjs)

切换默认目标文件。

用途：

- 你想把当前工作文件换成另一个 `.drawio`
- 你不想每次在 prompt 里重复写完整路径

#### [`scripts/inspect-target.mjs`](../scripts/inspect-target.mjs)

查看当前目标文件信息，包括：

- 路径
- 端口
- 文件大小
- 最后修改时间

#### [`scripts/backup-target.mjs`](../scripts/backup-target.mjs)

在大改前给目标文件做一个带时间戳的备份。

#### [`scripts/open-bridge.mjs`](../scripts/open-bridge.mjs)

用默认浏览器打开 bridge 页面。

## 仓库级助手记忆

文件：[`AGENTS.md`](../AGENTS.md)

这里定义了以后所有 Codex 会话默认遵守的规则，包括：

- 先看 `config/target.json`
- 默认使用当前 target 文件
- 保留用户手调过的布局
- 优先紧凑排布
- 连线尽量正交
- 修改图后默认认为用户正在看 bridge 页面

这就是“以后我怎么知道要用哪个仓库、怎么知道改哪个文件”的核心机制之一。
