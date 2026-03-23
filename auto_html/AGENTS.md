这个子目录用于“读论文、做展示页、导出知乎可粘贴内容”。

默认目标：

1. 正文尽量保留成文字
2. 只有流程图 / 结构图 / 验证图这类 `svg` 图块单独抽成 PNG
3. 默认优先交付可直接粘贴到知乎的富文本 HTML

## 默认选择

- 如果用户说“读论文”“做论文展示页”“发知乎”“从 HTML / PDF 生出可粘贴内容”，优先使用本目录。
- 如果用户已经有单文件 HTML，优先走 `publish_html_to_zhihu.ps1`。
- 如果用户说“我想直接复制”，默认加上 `-CopyToClipboard`。
- 如果用户说“顺便推图床 / GitHub Pages”，再加 `-PushPages`。

## 默认交付优先级

1. `clipboard HTML`
2. `public.md`
3. 本地相对路径版 `.md`

## 推荐主流程

```powershell
.\publish_html_to_zhihu.ps1 `
  -InputHtml .\your_note.html `
  -Prefix your_note `
  -ImageScale 3 `
  -CopyToClipboard
```

如果 GitHub Pages 仓库不在当前仓库同级目录，需要显式传：

```powershell
-GitHubPagesRepo "C:\path\to\ziyuhuang123.github.io"
```

## 修改原则

- 不要把整页都做成图片
- 不要为了省事把大段正文截图
- 如果用户抱怨图片糊，先提高倍率
- 如果用户抱怨手机上字小，优先改图版式，不是继续无脑放大像素

## 验证

改完至少检查：

1. `publish_html_to_zhihu.ps1` 或 `export_html_to_markdown.ps1` 能实际跑通
2. `assets/` 里确实有 PNG
3. `public.md` 里图片已替换为公网 URL
4. 如果用了 `-CopyToClipboard`，剪贴板里同时有 HTML 和纯文本
