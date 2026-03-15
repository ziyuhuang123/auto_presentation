如何使用：

打开 Codex，告知当前需要修改的 `.drawio` 文件路径，然后让 Codex 连接 bridge。推荐直接这样说：

我现在希望修改的文件是：C:\文件备份\new_report\0313\未命名绘图.drawio
帮我连接服务器：http://127.0.0.1:4318/

现在这套 workflow 会自动做三件事：

1. 更新 `config/target.json`
2. 确保 `http://127.0.0.1:4318/` 的 bridge 已启动
3. 如果 bridge 已在运行，直接切换到新目标文件，不需要再手动 `File > Open`

仓库里的稳定入口是：

`powershell -ExecutionPolicy Bypass -File scripts/connect-bridge.ps1 -DiagramPath "<你的.drawio路径>"`

如果本次修改涉及 `public/app.js`，仍然需要手动刷新 bridge 页面一次。
