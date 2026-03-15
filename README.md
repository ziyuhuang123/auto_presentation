如何使用：

打开 Codex，告知当前需要修改的 `.drawio` 文件路径，然后让 Codex 连接 bridge。推荐直接这样说：

我现在希望修改的文件是：C:\文件备份\new_report\0313\linear_attn.drawio
帮我连接服务器：http://127.0.0.1:4318/

现在这套 workflow 会自动做三件事：

1. 更新 `config/target.json`
2. 确保 `http://127.0.0.1:4318/` 的 bridge 已启动
3. 如果 bridge 已在运行，直接切换到新目标文件，不需要再手动 `File > Open`

之所以还需要搭一个服务器桥接，是因为原始draw.io页面上，大模型的修改不能实时被显现，必须每次重新打开同一个文件。此服务器上会每次自动刷新。