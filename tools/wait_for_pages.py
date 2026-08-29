from __future__ import annotations

import argparse
import json
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_URL = "https://api.github.com/repos/niuai-ui/qiuqiu-portfolio/actions/workflows/pages.yml/runs"


def fetch_run(commit_sha: str) -> dict | None:
    query = urlencode({"head_sha": commit_sha, "per_page": 1})
    request = Request(
        f"{API_URL}?{query}",
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "qiuqiu-portfolio-publisher",
        },
    )
    with urlopen(request, timeout=20) as response:
        runs = json.load(response).get("workflow_runs", [])
    return runs[0] if runs else None


def wait_for_pages(commit_sha: str, timeout_seconds: int = 360) -> None:
    deadline = time.monotonic() + timeout_seconds
    last_status = ""
    while time.monotonic() < deadline:
        try:
            run = fetch_run(commit_sha)
        except Exception as error:
            print(f"暂时无法查询 GitHub Actions：{error}，10 秒后重试…")
            time.sleep(10)
            continue
        if run:
            status = f"{run.get('status')} / {run.get('conclusion') or '等待结果'}"
            if status != last_status:
                print(f"GitHub Pages：{status}")
                last_status = status
            if run.get("status") == "completed":
                if run.get("conclusion") == "success":
                    print(f"网站部署成功：{run.get('html_url')}")
                    return
                raise RuntimeError(f"Pages 工作流失败：{run.get('html_url')}")
        elif last_status != "尚未创建":
            print("GitHub Pages：等待工作流创建…")
            last_status = "尚未创建"
        time.sleep(10)
    raise TimeoutError("等待 GitHub Pages 超时，请打开仓库 Actions 页面查看")


def main() -> None:
    parser = argparse.ArgumentParser(description="等待指定提交的 GitHub Pages 工作流完成。")
    parser.add_argument("commit_sha")
    args = parser.parse_args()
    wait_for_pages(args.commit_sha)


if __name__ == "__main__":
    main()
