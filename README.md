如何使用：

打开 Codex，告知当前需要修改的 `.drawio` 文件路径，然后让 Codex 连接 bridge。推荐直接这样说：

我现在希望修改的文件是：C:\文件备份\new_report\0313\linear_attn.drawio
帮我连接服务器：http://127.0.0.1:4318/

现在这套 workflow 会自动做三件事：

1. 更新 `config/target.json`
2. 确保 `http://127.0.0.1:4318/` 的 bridge 已启动
3. 如果 bridge 已在运行，直接切换到新目标文件，不需要再手动 `File > Open`

之所以还需要搭一个服务器桥接，是因为原始draw.io页面上，大模型的修改不能实时被显现，必须每次重新打开同一个文件。此服务器上会每次自动刷新。

---

新增功能说明（简体中文）：

现在这个仓库已经支持“多实例 bridge”，不再只能共用一个 `4318` 和一个 `config/target.json`。

你可以同时开多个独立端口，每个端口各自绑定一个 `.drawio` 文件，互相不会抢目标文件。例如：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\connect-bridge.ps1 -Port 4319 -DiagramPath "C:\path\to\a.drawio"
powershell -ExecutionPolicy Bypass -File .\scripts\connect-bridge.ps1 -Port 4320 -DiagramPath "C:\path\to\b.drawio"
```

现在每个实例都会有自己独立的：

- `port`
- 配置文件：`config/instances/port-<port>.json`
- 状态文件：`config/instances/port-<port>.state.json`
- 日志文件：`.bridge.port-<port>.stdout.log` 和 `.bridge.port-<port>.stderr.log`

这意味着：

1. `4319` 可以改 `a.drawio`
2. `4320` 可以改 `b.drawio`
3. 它们不会再互相覆盖 `config/target.json`

辅助脚本也已经支持按端口使用，例如：

```powershell
node .\scripts\inspect-target.mjs --port 4319
node .\scripts\backup-target.mjs --port 4319
node .\scripts\open-bridge.mjs --port 4319
node .\scripts\set-target.mjs --port 4319 "C:\path\to\file.drawio"
```

如果不传 `-Port`，仍然保持原来的默认行为，也就是继续使用 `4318` 和 `config/target.json`。
