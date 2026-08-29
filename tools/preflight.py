from __future__ import annotations

import argparse
import compileall
import shutil
import subprocess
import sys
from pathlib import Path

from build_site import ROOT, build
from check_sync import check_sync


def main() -> None:
    parser = argparse.ArgumentParser(description="统一执行作品集发布前检查和静态构建。")
    parser.add_argument(
        "--skip-sync",
        action="store_true",
        help="跳过仅本机可用的日志目录同步检查（供 GitHub Actions 使用）",
    )
    args = parser.parse_args()

    if not compileall.compile_dir(ROOT / "tools", quiet=1):
        raise RuntimeError("tools 目录存在 Python 语法错误")
    if not args.skip_sync:
        check_sync()
    build()
    node = shutil.which("node")
    if not node:
        bundled_node = Path.home() / ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe"
        node = str(bundled_node) if bundled_node.is_file() else None
    if not node:
        raise RuntimeError("找不到 Node.js，无法检查 site/app.js")
    subprocess.run([node, "--check", str(ROOT / "site" / "app.js")], check=True)
    checks = "Excel、封面、网站构建和 JavaScript"
    if not args.skip_sync:
        checks = f"同步、{checks}"
    print(f"发布前检查全部通过：{checks} 均正常")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"[错误] {error}", file=sys.stderr)
        raise SystemExit(1)
