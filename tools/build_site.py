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
            "image": cover,
            "download": text(item.get("百度网盘链接整体")),
            "category": text(item.get("类别")) or "其他",
        })
    works.sort(key=lambda work: (work["date"], work["title"]), reverse=True)
    return works


def build():
    works = load_works()
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(SOURCE, DIST)
    shutil.copytree(CONTENT / "images", DIST / "images")
    (DIST / "data.json").write_text(json.dumps(works, ensure_ascii=False, indent=2), encoding="utf-8")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")
    print(f"网站已生成：{len(works)} 个已发布作品 → {DIST}")


if __name__ == "__main__":
    build()
