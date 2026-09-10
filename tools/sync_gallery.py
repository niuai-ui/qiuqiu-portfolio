from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

from PIL import Image, ImageOps

from build_site import CONTENT, slug
from check_sync import DEFAULT_LOG_ROOT, parse_folder_name, source_folders


GALLERY_ROOT = CONTENT / "gallery"
MANIFEST = GALLERY_ROOT / "manifest.json"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def natural_key(path: Path) -> list[object]:
    return [int(part) if part.isdigit() else part.casefold() for part in re.split(r"(\d+)", path.name)]


def source_gallery(folder: Path) -> list[Path]:
    intro = folder / "模组介绍"
    if not intro.is_dir():
        raise FileNotFoundError(f"缺少模组介绍文件夹：{folder}")
    images = sorted(
        (path for path in intro.rglob("*") if path.is_file() and path.suffix.casefold() in IMAGE_SUFFIXES),
        key=natural_key,
    )
    if not images:
        raise FileNotFoundError(f"模组介绍文件夹里没有图片：{intro}")
    return images


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def expected_manifest(log_root: Path) -> dict[str, list[dict[str, str]]]:
    manifest: dict[str, list[dict[str, str]]] = {}
    for folder in source_folders(log_root):
        author, english_name = parse_folder_name(folder.name)
        work_id = slug(f"{author}-{english_name}")
        items = []
        for index, source in enumerate(source_gallery(folder), start=1):
            digest = file_hash(source)
            filename = f"{index:02d}-{digest[:12]}.webp"
            items.append({
                "file": f"{work_id}/{filename}",
                "source": source.name,
                "sha256": digest,
            })
        manifest[work_id] = items
    return dict(sorted(manifest.items()))


def safe_gallery_target(relative: str) -> Path:
    target = (GALLERY_ROOT / relative).resolve()
    root = GALLERY_ROOT.resolve()
    if target == root or root not in target.parents:
        raise ValueError(f"非法介绍图输出路径：{relative}")
    return target


def render_webp(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        image.save(target, "WEBP", quality=82, method=6, optimize=True)


def sync_gallery(log_root: Path = DEFAULT_LOG_ROOT) -> None:
    expected = expected_manifest(log_root)
    GALLERY_ROOT.mkdir(parents=True, exist_ok=True)
    sources: dict[str, Path] = {}
    for folder in source_folders(log_root):
        author, english_name = parse_folder_name(folder.name)
        work_id = slug(f"{author}-{english_name}")
        for item, source in zip(expected[work_id], source_gallery(folder), strict=True):
            sources[item["file"]] = source

    expected_files = set(sources)
    for relative, source in sources.items():
        target = safe_gallery_target(relative)
        if not target.is_file():
            render_webp(source, target)

    for target in GALLERY_ROOT.rglob("*.webp"):
        relative = target.relative_to(GALLERY_ROOT).as_posix()
        if relative not in expected_files:
            target.unlink()
    for directory in sorted((path for path in GALLERY_ROOT.iterdir() if path.is_dir()), reverse=True):
        if not any(directory.iterdir()):
            directory.rmdir()

    MANIFEST.write_text(json.dumps(expected, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total_bytes = sum(safe_gallery_target(relative).stat().st_size for relative in expected_files)
    print(f"介绍图同步完成：{len(expected)} 个模组，{len(expected_files)} 张图，{total_bytes / 1024 / 1024:.2f} MB")


def validate_committed_gallery() -> dict[str, list[dict[str, str]]]:
    if not MANIFEST.is_file():
        raise FileNotFoundError("缺少 content/gallery/manifest.json，请先运行 tools/sync_gallery.py")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict):
        raise ValueError("介绍图清单格式无效")
    listed = set()
    for work_id, items in manifest.items():
        if not isinstance(items, list) or not items:
            raise ValueError(f"{work_id} 没有介绍图")
        for item in items:
            relative = item.get("file", "")
            target = safe_gallery_target(relative)
            if target.suffix.casefold() != ".webp" or not target.is_file():
                raise FileNotFoundError(f"介绍图不存在：content/gallery/{relative}")
            listed.add(relative)
    actual = {path.relative_to(GALLERY_ROOT).as_posix() for path in GALLERY_ROOT.rglob("*.webp")}
    if listed != actual:
        raise ValueError("介绍图清单与 content/gallery 中的文件不一致")
    return manifest


def check_gallery_sync(log_root: Path = DEFAULT_LOG_ROOT) -> None:
    committed = validate_committed_gallery()
    expected = expected_manifest(log_root)
    if committed != expected:
        raise ValueError("日志目录中的模组介绍图有变化，请先运行 tools/sync_gallery.py")
    print(f"介绍图检查通过：{sum(len(items) for items in committed.values())} 张图均已同步")


def main() -> None:
    parser = argparse.ArgumentParser(description="同步每个模组的模组介绍图片并生成网页画廊。")
    parser.add_argument("--log-root", type=Path, default=DEFAULT_LOG_ROOT)
    parser.add_argument("--check", action="store_true", help="仅检查，不修改文件")
    args = parser.parse_args()
    if args.check:
        check_gallery_sync(args.log_root)
    else:
        sync_gallery(args.log_root)


if __name__ == "__main__":
    main()
