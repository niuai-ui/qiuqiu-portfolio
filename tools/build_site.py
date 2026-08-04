from __future__ import annotations

import json
import re
import shutil
import unicodedata
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"
DIST = ROOT / "dist"
SOURCE = ROOT / "site"
WORKBOOK = CONTENT / "作品信息.xlsx"
REQUIRED = [
    "状态", "模组英文名", "模组中文名", "原作者名字", "原作者网址链接",
    "汉化发布日期", "汉化更新日期", "前置说明", "放置说明", "封面路径",
    "百度网盘链接整体", "类别",
]


def text(value):
    return "" if value is None else str(value).strip()


def iso_date(value):
    if isinstance(value, (datetime, date)):
        return value.strftime("%Y-%m-%d")
    value = text(value)
    return value[:10] if value else ""


def slug(value):
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", normalized).strip("-").lower()
    return normalized or "work"


def split_download(value):
    """把“链接: URL 提取码: CODE”拆成网址和提取码，便于网页分别渲染。"""
    raw = text(value)
    if not raw:
        return "", ""
    url_match = re.search(r"https?://[^\s，,；;]+", raw)
    url = url_match.group(0).rstrip("。.、") if url_match else ""
    code_match = re.search(r"(?:提取码|密码|pwd)\s*[:：]?\s*([0-9A-Za-z]{4})", raw)
    code = code_match.group(1) if code_match else ""
    return url, code


def load_works():
    workbook = load_workbook(WORKBOOK, data_only=False)
    if "作品信息" not in workbook.sheetnames:
        raise ValueError("Excel 中缺少“作品信息”工作表")
    sheet = workbook["作品信息"]
    headers = [text(cell.value) for cell in sheet[1]]
    missing = [name for name in REQUIRED if name not in headers]
    extras = [name for name in headers if name and name not in REQUIRED]
    if missing:
        raise ValueError("Excel 缺少必需列：" + "、".join(missing))
    if extras:
        raise ValueError("Excel 存在不需要的列：" + "、".join(extras))
    positions = {name: index for index, name in enumerate(headers)}
    works, ids = [], set()
    for row_number, cells in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
        if not any(value is not None for value in cells):
            continue
        item = {name: cells[index] if index < len(cells) else None for name, index in positions.items()}
        if text(item.get("状态")) != "已发布":
            continue
        english = text(item.get("模组英文名"))
        author_name = text(item.get("原作者名字"))
        work_id = slug(f"{author_name}-{english}")
        if work_id in ids:
            raise ValueError(f"第 {row_number} 行生成的作品标识重复：{work_id}")
        ids.add(work_id)
        download_url, download_code = split_download(item.get("百度网盘链接整体"))
        if text(item.get("百度网盘链接整体")) and not download_url:
            raise ValueError(f"第 {row_number} 行的百度网盘单元格里找不到有效网址")
        cover = text(item.get("封面路径"))
        cover_file = CONTENT / cover
        if not cover_file.is_file():
            raise FileNotFoundError(f"第 {row_number} 行封面不存在：content/{cover}")
        with Image.open(cover_file) as image:
            ratio = image.width / image.height
            if not 0.74 <= ratio <= 0.76:
                raise ValueError(f"第 {row_number} 行封面不是标准 3:4：{cover}（{image.width}×{image.height}）")
        works.append({
            "id": work_id,
            "title": text(item.get("模组中文名")),
            "englishTitle": english,
            "author": author_name or "未知作者",
            "originalUrl": text(item.get("原作者网址链接")),
            "date": iso_date(item.get("汉化发布日期")),
            "updated": iso_date(item.get("汉化更新日期")),
            "dependency": text(item.get("前置说明")) or "无需前置",
            "placement": text(item.get("放置说明")) or "无需放第一层",
            "localization": "繁简汉化",
            "sourceImage": cover,
            "download": download_url,
            "downloadCode": download_code,
            "category": text(item.get("类别")) or "其他",
        })
    works.sort(key=lambda work: (work["date"], work["title"]), reverse=True)
    return works


def build_responsive_covers(works):
    output_dir = DIST / "images" / "covers"
    output_dir.mkdir(parents=True, exist_ok=True)
    original_bytes = 0
    optimized_bytes = 0
    for work in works:
        source = CONTENT / work.pop("sourceImage")
        original_bytes += source.stat().st_size
        with Image.open(source) as opened:
            image = opened.convert("RGB")
            generated = {}
            for width in (480, 960):
                resized = image.resize((width, width * 4 // 3), Image.Resampling.LANCZOS)
                filename = f"{work['id']}-{width}.webp"
                target = output_dir / filename
                resized.save(target, "WEBP", quality=82, method=6, optimize=True)
                optimized_bytes += target.stat().st_size
                generated[width] = f"images/covers/{filename}"
        work["imageSmall"] = generated[480]
        work["imageLarge"] = generated[960]
        work["image"] = generated[960]
    return original_bytes, optimized_bytes


def build():
    works = load_works()
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(SOURCE, DIST)
    (DIST / "images").mkdir(exist_ok=True)
    for filename in ("favicon.png", "og.jpg"):
        shutil.copy2(CONTENT / "images" / filename, DIST / "images" / filename)
    original_bytes, optimized_bytes = build_responsive_covers(works)
    (DIST / "data.json").write_text(json.dumps(works, ensure_ascii=False, indent=2), encoding="utf-8")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")
    print(f"网站已生成：{len(works)} 个已发布作品 → {DIST}")
    print(f"封面体积：{original_bytes / 1024 / 1024:.2f} MB → {optimized_bytes / 1024 / 1024:.2f} MB（480/960 WebP 合计）")


if __name__ == "__main__":
    build()
