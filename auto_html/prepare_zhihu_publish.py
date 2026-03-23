import argparse
import html
import json
import re
import shutil
from pathlib import Path
from urllib.parse import quote


IMAGE_PATTERN = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")


def apply_inline(text: str) -> str:
    parts = re.split(r"(`[^`]+`)", text)
    rendered = []
    for part in parts:
        if not part:
            continue
        if part.startswith("`") and part.endswith("`") and len(part) >= 2:
            rendered.append(f"<code>{html.escape(part[1:-1])}</code>")
            continue
        escaped = html.escape(part)
        escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
        rendered.append(escaped)
    return "".join(rendered)


def is_block_start(line: str) -> bool:
    stripped = line.strip()
    return (
        not stripped
        or stripped.startswith("#")
        or stripped.startswith("- ")
        or stripped.startswith("> ")
        or bool(IMAGE_PATTERN.fullmatch(stripped))
    )


def markdown_to_html_fragment(markdown: str) -> str:
    lines = markdown.splitlines()
    blocks = []
    i = 0

    while i < len(lines):
        line = lines[i].rstrip()
        stripped = line.strip()
        if not stripped:
            i += 1
            continue

        heading = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading:
            level = len(heading.group(1))
            blocks.append(f"<h{level}>{apply_inline(heading.group(2).strip())}</h{level}>")
            i += 1
            continue

        image_match = IMAGE_PATTERN.fullmatch(stripped)
        if image_match:
            alt, url = image_match.groups()
            blocks.append(
                "<p class=\"image-block\">"
                f"<img src=\"{html.escape(url, quote=True)}\" alt=\"{html.escape(alt, quote=True)}\">"
                "</p>"
            )
            i += 1
            continue

        if stripped.startswith("- "):
            items = []
            while i < len(lines):
                current = lines[i].strip()
                if not current.startswith("- "):
                    break
                items.append(f"<li>{apply_inline(current[2:].strip())}</li>")
                i += 1
            blocks.append("<ul>\n" + "\n".join(items) + "\n</ul>")
            continue

        if stripped.startswith("> "):
            quote_lines = []
            while i < len(lines):
                current = lines[i].strip()
                if not current.startswith("> "):
                    break
                quote_lines.append(apply_inline(current[2:].strip()))
                i += 1
            quote_html = "<br>".join(quote_lines)
            blocks.append(f"<blockquote><p>{quote_html}</p></blockquote>")
            continue

        paragraph_lines = [stripped]
        i += 1
        while i < len(lines):
            current = lines[i].rstrip()
            if is_block_start(current):
                break
            paragraph_lines.append(current.strip())
            i += 1
        blocks.append(f"<p>{apply_inline(' '.join(paragraph_lines))}</p>")

    return "\n".join(blocks) + "\n"


def wrap_html_document(title: str, fragment: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <style>
    :root {{
      --ink: #1f2937;
      --muted: #4b5563;
      --line: #e5e7eb;
      --paper: #ffffff;
      --bg: #f8fafc;
    }}
    body {{
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif;
      line-height: 1.9;
    }}
    main {{
      max-width: 860px;
      margin: 0 auto;
      padding: 32px 20px 48px;
      background: var(--paper);
    }}
    h1, h2, h3, h4, h5, h6 {{
      line-height: 1.35;
      margin: 1.1em 0 0.5em;
    }}
    h1 {{ font-size: 34px; }}
    h2 {{ font-size: 28px; }}
    h3 {{ font-size: 22px; }}
    p, li, blockquote {{
      font-size: 18px;
    }}
    ul {{
      padding-left: 1.4em;
    }}
    blockquote {{
      margin: 1em 0;
      padding: 0.9em 1em;
      border-left: 4px solid #94a3b8;
      background: #f8fafc;
      color: var(--muted);
    }}
    code {{
      padding: 0.15em 0.4em;
      border-radius: 6px;
      background: #eff6ff;
      font-family: "Consolas", monospace;
      font-size: 0.92em;
    }}
    .image-block {{
      margin: 1.4em 0;
      text-align: center;
    }}
    img {{
      max-width: 100%;
      height: auto;
      border-radius: 14px;
      border: 1px solid var(--line);
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }}
  </style>
</head>
<body>
  <main>
{fragment}
  </main>
</body>
</html>
"""


def replace_local_image_urls(markdown: str, public_url_map: dict[str, str]) -> str:
    def replacer(match: re.Match) -> str:
        alt, url = match.groups()
        if url in public_url_map:
            return f"![{alt}]({public_url_map[url]})"
        return match.group(0)

    return IMAGE_PATTERN.sub(replacer, markdown)


def build_public_url(site_base_url: str, site_assets_subdir: str, prefix: str, file_name: str) -> str:
    path_parts = [part.strip("/") for part in [site_assets_subdir, prefix] if part.strip("/")]
    encoded_file = quote(file_name)
    return site_base_url.rstrip("/") + "/" + "/".join(path_parts + [encoded_file])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--markdown", required=True)
    parser.add_argument("--assets-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--prefix", required=True)
    parser.add_argument("--pages-repo", required=True)
    parser.add_argument("--site-base-url", default="https://ziyuhuang123.github.io")
    parser.add_argument("--site-assets-subdir", default="paper_reading_notes/assets")
    parser.add_argument("--site-publish-subdir", default="paper_reading_notes/publish")
    args = parser.parse_args()

    markdown_path = Path(args.markdown).resolve()
    assets_dir = Path(args.assets_dir).resolve()
    output_dir = Path(args.output_dir).resolve()
    pages_repo = Path(args.pages_repo).resolve()
    prefix = args.prefix

    if not markdown_path.exists():
        raise FileNotFoundError(f"Markdown 文件不存在: {markdown_path}")
    if not assets_dir.exists():
        raise FileNotFoundError(f"Assets 目录不存在: {assets_dir}")
    if not pages_repo.exists():
        raise FileNotFoundError(f"GitHub Pages 仓库不存在: {pages_repo}")

    output_dir.mkdir(parents=True, exist_ok=True)

    raw_markdown = markdown_path.read_text(encoding="utf-8")
    local_refs = []
    for _, url in IMAGE_PATTERN.findall(raw_markdown):
        if url.startswith("./assets/"):
            local_refs.append(url)

    site_assets_dir = pages_repo / Path(args.site_assets_subdir) / prefix
    site_assets_dir.mkdir(parents=True, exist_ok=True)

    public_url_map = {}
    copied_assets = []
    for local_ref in local_refs:
        file_name = local_ref.split("/")[-1]
        source = assets_dir / file_name
        if not source.exists():
            continue
        target = site_assets_dir / file_name
        shutil.copy2(source, target)
        public_url = build_public_url(args.site_base_url, args.site_assets_subdir, prefix, file_name)
        public_url_map[local_ref] = public_url
        copied_assets.append(
            {
                "source": str(source),
                "target": str(target),
                "public_url": public_url,
            }
        )

    public_markdown = replace_local_image_urls(raw_markdown, public_url_map)
    public_markdown_path = output_dir / f"{prefix}.public.md"
    public_markdown_path.write_text(public_markdown, encoding="utf-8")

    fragment = markdown_to_html_fragment(public_markdown)
    fragment_path = output_dir / f"{prefix}.clipboard.fragment.html"
    fragment_path.write_text(fragment, encoding="utf-8")

    full_html = wrap_html_document(prefix, fragment)
    full_html_path = output_dir / f"{prefix}.clipboard.html"
    full_html_path.write_text(full_html, encoding="utf-8")

    site_publish_dir = pages_repo / Path(args.site_publish_subdir)
    site_publish_dir.mkdir(parents=True, exist_ok=True)
    site_markdown_path = site_publish_dir / f"{prefix}.md"
    site_html_path = site_publish_dir / f"{prefix}.html"
    site_markdown_path.write_text(public_markdown, encoding="utf-8")
    site_html_path.write_text(full_html, encoding="utf-8")

    publish_page_url = (
        args.site_base_url.rstrip("/")
        + "/"
        + "/".join([part.strip("/") for part in [args.site_publish_subdir, f"{prefix}.html"]])
    )

    manifest = {
        "prefix": prefix,
        "markdown": str(markdown_path),
        "assets_dir": str(assets_dir),
        "pages_repo": str(pages_repo),
        "site_assets_dir": str(site_assets_dir),
        "site_publish_dir": str(site_publish_dir),
        "public_markdown_path": str(public_markdown_path),
        "clipboard_fragment_path": str(fragment_path),
        "clipboard_html_path": str(full_html_path),
        "site_markdown_path": str(site_markdown_path),
        "site_html_path": str(site_html_path),
        "publish_page_url": publish_page_url,
        "copied_assets": copied_assets,
    }

    manifest_path = output_dir / f"{prefix}.publish_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
