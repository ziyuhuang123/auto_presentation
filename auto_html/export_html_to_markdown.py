import argparse
import json
import subprocess
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Tag


def direct_children(node, name=None):
    for child in node.children:
        if isinstance(child, Tag) and (name is None or child.name == name):
            yield child


def normalize_text(text: str) -> str:
    return " ".join(text.replace("\u00a0", " ").split())


def render_inline(node) -> str:
    if isinstance(node, NavigableString):
        return str(node)
    if not isinstance(node, Tag):
        return ""
    if node.name in ("strong", "b"):
        return f"**{render_children_inline(node).strip()}**"
    if node.name == "code" or ("class" in node.attrs and "code" in node.get("class", [])):
        return f"`{normalize_text(node.get_text(' ', strip=True))}`"
    if node.name == "br":
        return "\n"
    return render_children_inline(node)


def render_children_inline(node: Tag) -> str:
    parts = [render_inline(child) for child in node.children]
    text = "".join(parts)
    text = text.replace(" \n", "\n").replace("\n ", "\n")
    return normalize_text(text) if "\n" not in text else text


def paragraph_text(node: Tag) -> str:
    text = render_children_inline(node).strip()
    return text


def add_paragraph(lines, text):
    text = (text or "").strip()
    if not text:
        return
    lines.append(text)
    lines.append("")


def add_note(lines, text):
    text = (text or "").strip()
    if not text:
        return
    lines.append(f"> {text}")
    lines.append("")


def collect_direct_text_blocks(node: Tag):
    blocks = []
    for child in direct_children(node):
        classes = set(child.get("class", []))
        if child.name == "p":
            blocks.append(("p", paragraph_text(child)))
        elif child.name == "div" and "note" in classes:
            blocks.append(("note", paragraph_text(child)))
    return blocks


def render_item(lines, item: Tag, level: int):
    tag = item.find("div", class_="tag")
    title = item.find("h3")
    body = item.find("p")
    if title:
        lines.append(f"{'#' * level} {title.get_text(strip=True)}")
        lines.append("")
    if tag:
        add_note(lines, f"标签：{tag.get_text(strip=True)}")
    if body:
        add_paragraph(lines, paragraph_text(body))


def render_grid(lines, grid: Tag, level: int, image_map):
    for child in direct_children(grid):
        classes = set(child.get("class", []))
        if "item" in classes:
            render_item(lines, child, level)
        elif "box" in classes:
            render_box(lines, child, level, image_map)


def render_box(lines, box: Tag, level: int, image_map):
    title = None
    for child in direct_children(box):
        if child.name == "h3":
            title = child.get_text(strip=True)
            break

    if title:
        lines.append(f"{'#' * level} {title}")
        lines.append("")

    if box.find("svg"):
        image_file = image_map.get(title, "")
        if image_file:
            lines.append(f"![{title}](./assets/{image_file})")
            lines.append("")

    for block_type, text in collect_direct_text_blocks(box):
        if block_type == "p":
            add_paragraph(lines, text)
        elif block_type == "note":
            add_note(lines, text)

    for child in direct_children(box):
        classes = set(child.get("class", []))
        if child.name == "div" and classes.intersection({"grid2", "grid3", "grid4"}):
            render_grid(lines, child, level + 1, image_map)


def render_hero(lines, hero: Tag):
    title = hero.find("h1")
    if title:
        lines.append(f"# {title.get_text(strip=True)}")
        lines.append("")

    lede = hero.find("p", class_="lede")
    if lede:
        add_paragraph(lines, paragraph_text(lede))

    chips = [chip.get_text(strip=True) for chip in hero.select(".chips .chip")]
    if chips:
        lines.append("## 关键信息")
        lines.append("")
        for chip in chips:
            lines.append(f"- {chip}")
        lines.append("")

    one_sentence = hero.select_one(".hero-box p")
    if one_sentence:
        lines.append("## 一句话版本")
        lines.append("")
        lines.append(f"> {paragraph_text(one_sentence)}")
        lines.append("")

    metrics = hero.select(".metric-grid .metric")
    if metrics:
        lines.append("## 关键数字")
        lines.append("")
        for metric in metrics:
            big = normalize_text(metric.select_one(".big").get_text(" ", strip=True))
            lede_node = metric.select_one(".lede")
            lede_text = normalize_text(lede_node.get_text(" ", strip=True)) if lede_node else ""
            lines.append(f"- `{big}`：{lede_text}")
        lines.append("")


def render_card(lines, card: Tag, image_map):
    head = card.find("div", class_="section-head")
    if head:
        title = head.find("h2")
        if title:
            lines.append(f"## {title.get_text(strip=True)}")
            lines.append("")
        intro = head.find("p")
        if intro:
            add_paragraph(lines, paragraph_text(intro))

    for child in direct_children(card):
        classes = set(child.get("class", []))
        if child.name == "div" and "section-head" in classes:
            continue
        if child.name == "div" and classes.intersection({"grid2", "grid3", "grid4"}):
            render_grid(lines, child, 3, image_map)
        elif child.name == "div" and "box" in classes:
            render_box(lines, child, 3, image_map)
        elif child.name == "div" and "note" in classes:
            add_note(lines, paragraph_text(child))


def build_markdown(html_path: Path, image_map):
    soup = BeautifulSoup(html_path.read_text(encoding="utf-8"), "html.parser")
    main = soup.find("main", class_="page")
    if main is None:
        raise RuntimeError("未找到 main.page，当前 HTML 不符合这套转换规则的预期结构。")
    lines = []

    hero = main.find("section", class_="hero")
    if hero:
        render_hero(lines, hero)

    for card in main.find_all("section", class_="card"):
        render_card(lines, card, image_map)

    footer = main.find("section", class_="footer")
    if footer:
        lines.append("## 说明")
        lines.append("")
        add_paragraph(lines, normalize_text(footer.get_text(" ", strip=True)))

    while lines and not lines[-1].strip():
        lines.pop()
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--prefix", default="")
    parser.add_argument("--capture-images", action="store_true")
    parser.add_argument("--image-scale", default="2")
    parser.add_argument("--port", default="9360")
    args = parser.parse_args()

    input_html = Path(args.input).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    prefix = args.prefix or input_html.stem
    assets_dir = output_dir / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    script_dir = Path(__file__).resolve().parent
    manifest_path = assets_dir / f"{prefix}_diagram_manifest.json"

    if args.capture_images:
        node_script = script_dir / "capture_svg_boxes.js"
        subprocess.run(
            [
                "node",
                str(node_script),
                "--input",
                str(input_html),
                "--output-dir",
                str(assets_dir),
                "--prefix",
                prefix,
                "--scale",
                str(args.image_scale),
                "--port",
                str(args.port),
            ],
            check=True,
        )

    image_map = {}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for item in manifest.get("diagrams", []):
            image_map[item["heading"]] = item["file"]

    markdown = build_markdown(input_html, image_map)
    output_md = output_dir / f"{prefix}.md"
    output_md.write_text(markdown, encoding="utf-8")

    summary = {
        "input": str(input_html),
        "output_markdown": str(output_md),
        "assets_dir": str(assets_dir),
        "diagram_count": len(image_map),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
