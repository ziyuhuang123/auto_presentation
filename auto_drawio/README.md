# auto_drawio

这个子目录专门用于 draw.io / diagrams.net 的精细示意图绘制。

适合这些场景：

- 组会中的系统图、结构图、时序图
- 写论文时需要反复微调的精细插图
- 已经有 `.drawio` 文件，希望在原图基础上继续修改
- 想让 Codex 通过 bridge 自动刷新 draw.io 页面

## 这套工作流在做什么

`connect-bridge.ps1` 会自动做三件事：

1. 更新目标文件配置
2. 确保 `http://127.0.0.1:<port>/` 的 bridge 已启动
3. 如果 bridge 已经在运行，直接切换到新的目标文件

这样你就不需要每次手动 `File > Open`。

## 最常用用法

### 1. 连接单个 `.drawio` 文件

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\connect-bridge.ps1 -DiagramPath "C:\path\to\your.drawio"
```

默认端口是 `4318`。

### 2. 开多个 bridge 实例

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\connect-bridge.ps1 -Port 4319 -DiagramPath "C:\path\to\a.drawio"
powershell -ExecutionPolicy Bypass -File .\scripts\connect-bridge.ps1 -Port 4320 -DiagramPath "C:\path\to\b.drawio"
```

每个实例都有自己独立的：

- `port`
- 配置文件：`config/instances/port-<port>.json`
- 状态文件：`config/instances/port-<port>.state.json`
- 日志文件：`.bridge.port-<port>.stdout.log` 和 `.bridge.port-<port>.stderr.log`

## 给 Codex 的推荐 prompt

### 精细画图

```text
按 auto_drawio 这套流程来，目标文件是 <你的 .drawio 路径>。先连接 bridge，再在现有风格上继续细化示意图。要求：布局紧凑、少留白、同层对齐、连线正交、尽量少交叉。
```

### 新建图并开始画

```text
按 auto_drawio 这套流程来，在这个仓库里帮我创建/连接一个新的 .drawio 文件，并通过 bridge 打开。然后按下面要求画图：<你的需求>。
```

## 辅助命令

```powershell
node .\scripts\inspect-target.mjs --port 4319
node .\scripts\backup-target.mjs --port 4319
node .\scripts\open-bridge.mjs --port 4319
node .\scripts\set-target.mjs --port 4319 "C:\path\to\file.drawio"
```

如果不传 `--port` / `-Port`，默认仍然使用 `4318` 和 `config/target.json`。

## 布局风格

默认偏好是：

- 紧凑布局，不要留大片空白
- 同层模块尽量对齐
- 下游模块尽量放在上游正下方
- 连线优先正交，尽量少交叉
- 优先保留你手工调过的布局关系

更细的规则看 [AGENTS.md](./AGENTS.md)。
