# 使用流程说明

## 一次标准会话怎么开始

在仓库根目录执行：

```powershell
npm run inspect
npm run dev
npm run open
```

然后让 `http://127.0.0.1:4318/` 这个页面一直开着。

## 每次是不是都要重新打开网址

不是每改一次图都重新打开。

正确理解是：

- 每个编辑会话开始时打开一次
- 然后一直保持该页面开着
- Codex 改图时，页面应该自动更新
- 只有 bridge 脚本变了，才需要刷新一次浏览器

## 什么时候要在 prompt 里明确文件路径

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

## 推荐 prompt 模板

### 使用当前默认目标文件

```text
使用 auto_drawio。
目标文件使用 config/target.json。
保留我手动调整过的布局。
只优化右半部分的排布。
```

### 切换目标文件并开始修改

```text
使用 auto_drawio。
把目标文件切换到 D:\work\system.drawio。
增加一个新的模块并与 dispatcher 相连。
```

### 强调局部修改

```text
使用 auto_drawio。
不要整体重排。
保持我当前的对齐，只把底部模块压紧一点。
```

## 页面没有自动更新怎么办

按下面顺序处理：

1. 先等 1 秒到 2 秒
2. 点击页面右上角“强制重载文件”
3. 如果你刚改过 `public/app.js`，刷新一次浏览器
4. 如果仍不对，重启 bridge：

```powershell
npm run dev
```

## 什么时候建议先备份

下面这些情况建议先执行：

```powershell
npm run backup
```

适用场景：

- 要整体移动很多模块
- 要重做一块连线
- 要替换大段文本
- 要把参考图重新临摹成结构图

## 建议的操作纪律

- 一次会话只围绕一个主目标文件
- 切换文件时显式更新 target
- 你手调完布局后，prompt 里最好补一句“保留当前布局”
- 如果要整体重排，明确说“允许整体重排”
