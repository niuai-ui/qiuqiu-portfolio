from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from build_site import ROOT, build
from check_sync import check_sync


def main() -> None:
    check_sync()
    build()
    node = shutil.which("node")
    if not node:
        bundled_node = Path.home() / ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe"
        node = str(bundled_node) if bundled_node.is_file() else None
    if not node:
        raise RuntimeError("找不到 Node.js，无法检查 site/app.js")
    subprocess.run([node, "--check", str(ROOT / "site" / "app.js")], check=True)
    print("发布前检查全部通过：同步、Excel、封面、网站构建和 JavaScript 均正常")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"[错误] {error}", file=sys.stderr)
        raise SystemExit(1)
