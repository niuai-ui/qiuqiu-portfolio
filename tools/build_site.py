from __future__ import annotations

import json
import re
import shutil
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"
DIST = ROOT / "dist"
SOURCE = ROOT / "site"
WORKBOOK = CONTENT / "作品信息.xlsx"
REQUIRED = ["状态", "作品ID", "中文名称", "英文名称", "原作者", "类别", "发布日期", "一句话介绍", "详细介绍", "封面路径"]


def text(value):
    return "" if value is None else str(value).strip()


def iso_date(value):
    if isinstance(value, (datetime, date)):
        return value.strftime("%Y-%m-%d")
    value = text(value)
    if not value:
        return ""
    return value[:10]


def split_list(value):
    return [part.strip() for part in re.split(r"[、,，;；\n]+", text(value)) if part.strip()]


def load_works():
    wb = load_workbook(WORKBOOK, data_only=False)
    if "作品信息" not in wb.sheetnames:
        raise ValueError("Excel 中缺少“作品信息”工作表")
    ws = wb["作品信息"]
    headers = [text(cell.value) for cell in ws[1]]
    missing = [name for name in REQUIRED if name not in headers]
    if missing:
        raise ValueError("Excel 缺少必需列：" + "、".join(missing))
    positions = {name: i for i, name in enumerate(headers)}
    works, ids = [], set()
    for row_number, cells in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        item = {name: cells[i] if i < len(cells) else None for name, i in positions.items()}
        if not any(value is not None for value in cells):
            continue
        if text(item.get("状态")) != "已发布":
            continue
        work_id = text(item.get("作品ID"))
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", work_id):
            raise ValueError(f"第 {row_number} 行作品ID格式不正确：{work_id}")
        if work_id in ids:
            raise ValueError(f"第 {row_number} 行作品ID重复：{work_id}")
        ids.add(work_id)
        cover = text(item.get("封面路径"))
        cover_file = CONTENT / cover
        if not cover_file.is_file():
            raise FileNotFoundError(f"第 {row_number} 行封面不存在：content/{cover}")
        with Image.open(cover_file) as image:
            ratio = image.width / image.height
            if not 0.70 <= ratio <= 0.80:
                print(f"提醒：{cover} 不是标准 3:4 图片，页面会自动居中裁切")
        gallery = split_list(item.get("介绍图片路径"))
        for gallery_path in gallery:
            if not (CONTENT / gallery_path).is_file():
                raise FileNotFoundError(f"第 {row_number} 行介绍图片不存在：content/{gallery_path}")
        works.append({
            "id": work_id,
            "title": text(item.get("中文名称")),
            "englishTitle": text(item.get("英文名称")),
            "author": text(item.get("原作者")) or "未知作者",
            "category": text(item.get("类别")) or "其他",
            "tags": split_list(item.get("标签")),
            "date": iso_date(item.get("发布日期")),
            "updated": iso_date(item.get("更新时间")),
            "version": text(item.get("版本")),
            "dependency": text(item.get("前置说明")),
            "summary": text(item.get("一句话介绍")),
            "details": text(item.get("详细介绍")),
            "image": cover,
            "gallery": gallery,
            "download": text(item.get("百度网盘链接")),
            "code": text(item.get("提取码")),
            "originalUrl": text(item.get("原作者链接")),
            "featured": text(item.get("是否精选")) == "是",
        })
    works.sort(key=lambda work: work["date"], reverse=True)
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
