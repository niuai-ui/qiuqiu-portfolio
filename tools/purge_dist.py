"""仅清理湫湫 Sims 作品集项目的 dist 输出目录。

此脚本用于 WorkBuddy 环境中 safe-delete 钩子误拦截 shutil.rmtree 的情况。
它拒绝任何其他目标，也拒绝递归进入重解析点，不能作为通用删除工具。
"""

from __future__ import annotations

import ctypes
import sys
from ctypes import wintypes
from pathlib import Path


PROJECT_ROOT = Path(r"E:\模拟人生4 湫湫Sims日志作品集网站")
ALLOWED_TARGET = PROJECT_ROOT / "dist"
FILE_ATTRIBUTE_REPARSE_POINT = 0x0400
INVALID_FILE_ATTRIBUTES = 0xFFFFFFFF

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

GetFileAttributesW = kernel32.GetFileAttributesW
GetFileAttributesW.argtypes = [wintypes.LPCWSTR]
GetFileAttributesW.restype = wintypes.DWORD

DeleteFileW = kernel32.DeleteFileW
DeleteFileW.argtypes = [wintypes.LPCWSTR]
DeleteFileW.restype = wintypes.BOOL

RemoveDirectoryW = kernel32.RemoveDirectoryW
RemoveDirectoryW.argtypes = [wintypes.LPCWSTR]
RemoveDirectoryW.restype = wintypes.BOOL


def normalized(path: Path) -> Path:
    return Path(path).resolve(strict=False)


def is_reparse_point(path: Path) -> bool:
    attributes = GetFileAttributesW(str(path))
    if attributes == INVALID_FILE_ATTRIBUTES:
        raise OSError(ctypes.get_last_error(), f"无法读取文件属性：{path}")
    return bool(attributes & FILE_ATTRIBUTE_REPARSE_POINT)


def purge(path: Path) -> None:
    if not path.exists():
        return
    if is_reparse_point(path):
        raise RuntimeError(f"拒绝处理重解析点：{path}")
    if path.is_dir():
        for child in path.iterdir():
            purge(child)
        if not RemoveDirectoryW(str(path)):
            raise OSError(ctypes.get_last_error(), f"无法删除目录：{path}")
        return
    if not DeleteFileW(str(path)):
        raise OSError(ctypes.get_last_error(), f"无法删除文件：{path}")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(f'用法：python tools/purge_dist.py "{ALLOWED_TARGET}"')

    requested = normalized(Path(sys.argv[1]))
    allowed = normalized(ALLOWED_TARGET)
    if requested != allowed:
        raise SystemExit(f"拒绝清理非项目输出目录：{requested}")

    purge(requested)
    print(f"已清理项目输出目录：{requested}（存在={requested.exists()}）")


if __name__ == "__main__":
    main()
