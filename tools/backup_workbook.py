"""在修改正式工作簿前保存一份本地快照。"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "作品信息.xlsx"
BACKUP_DIR = ROOT / ".workbuddy" / "backups" / "workbook"


def main() -> None:
    contents = WORKBOOK.read_bytes()
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    snapshot = BACKUP_DIR / f"_bak_作品信息_{timestamp}.xlsx"
    try:
        handle = snapshot.open("xb")
    except FileExistsError:
        raise SystemExit(f"同名快照已存在，请核对是否为本次编辑的快照：{snapshot}") from None
    try:
        with handle:
            handle.write(contents)
    except OSError:
        snapshot.unlink(missing_ok=True)
        raise
    print(snapshot)


if __name__ == "__main__":
    main()
