#!/usr/bin/env python3
"""
Test webhook TaskMate — báo crawl/job lên chuông Dashboard.

Cách dùng:
  export TASKMATE_HOOK_URL="https://taskmate-be.onrender.com/api/hooks/events"
  export TASKMATE_API_KEY="<HOOKS_API_KEY trên Render>"
  python3 scripts/test_hooks_notify.py

  # hoặc truyền thẳng:
  python3 scripts/test_hooks_notify.py --url ... --key ... --status success
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone


def post_event(url: str, api_key: str, payload: dict, timeout: float = 45.0) -> tuple[int, dict]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Api-Key": api_key,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            body = res.read().decode("utf-8")
            try:
                parsed = json.loads(body) if body else {}
            except json.JSONDecodeError:
                parsed = {"raw": body}
            return res.status, parsed
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body) if body else {}
        except json.JSONDecodeError:
            parsed = {"raw": body}
        return e.code, parsed


def wake_api(base_url: str, timeout: float = 60.0) -> bool:
    """Đánh thức BE Render free tier trước khi POST webhook."""
    ping = base_url.rstrip("/").rsplit("/api/hooks", 1)[0] + "/api/ping"
    try:
        with urllib.request.urlopen(ping, timeout=timeout) as res:
            return 200 <= res.status < 300
    except Exception as exc:  # noqa: BLE001
        print(f"[wake] ping thất bại ({ping}): {exc}", file=sys.stderr)
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Test TaskMate hooks webhook")
    parser.add_argument(
        "--url",
        default=os.environ.get(
            "TASKMATE_HOOK_URL", "https://taskmate-be.onrender.com/api/hooks/events"
        ),
        help="Webhook URL",
    )
    parser.add_argument(
        "--key",
        default=os.environ.get("TASKMATE_API_KEY", ""),
        help="HOOKS_API_KEY (hoặc env TASKMATE_API_KEY)",
    )
    parser.add_argument("--title", default="Crawl HCC hoàn thành (test)")
    parser.add_argument(
        "--message",
        default="Đây là thông báo thử từ scripts/test_hooks_notify.py",
    )
    parser.add_argument(
        "--status",
        choices=("success", "failed", "running"),
        default="success",
    )
    parser.add_argument("--source", default="hcc-crawler-test")
    parser.add_argument("--target", default="admins")
    parser.add_argument(
        "--job-id",
        default="",
        help="Bỏ trống = tự tạo jobId theo timestamp",
    )
    parser.add_argument("--no-wake", action="store_true", help="Không gọi /api/ping trước")
    parser.add_argument("--retries", type=int, default=3)
    args = parser.parse_args()

    if not args.key.strip():
        print(
            "Thiếu API key. Set TASKMATE_API_KEY hoặc truyền --key",
            file=sys.stderr,
        )
        return 2

    job_id = args.job_id.strip() or datetime.now(timezone.utc).strftime(
        "test-%Y%m%d-%H%M%S"
    )
    payload = {
        "title": args.title,
        "message": args.message,
        "status": args.status,
        "source": args.source,
        "jobId": job_id,
        "target": args.target,
    }

    print("URL   :", args.url)
    print("jobId :", job_id)
    print("payload:", json.dumps(payload, ensure_ascii=False))

    if not args.no_wake:
        print("Đang wake BE (/api/ping)…")
        wake_api(args.url)

    last_status, last_body = 0, {}
    for attempt in range(1, args.retries + 1):
        print(f"\n[attempt {attempt}/{args.retries}] POST…")
        status, body = post_event(args.url, args.key.strip(), payload)
        last_status, last_body = status, body
        print("HTTP  :", status)
        print("Body  :", json.dumps(body, ensure_ascii=False, indent=2))
        if status in (200, 409):
            break
        if attempt < args.retries:
            wait = 2 * attempt
            print(f"Retry sau {wait}s…")
            time.sleep(wait)

    if last_status == 200:
        print("\nOK — mở TaskMate bằng tài khoản Admin, kiểm tra chuông trong ~5 giây.")
        return 0
    if last_status == 409:
        print("\nOK (idempotent) — jobId đã gửi trước đó, không tạo notification mới.")
        return 0
    print("\nFAILED", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
