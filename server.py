#!/usr/bin/env python3
"""Local static and write API server for DailyBlog."""

from __future__ import annotations

import json
import os
import posixpath
import subprocess
import sys
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent
USER_DATA_PATH = ROOT / "data" / "user-data.json"
INSIGHTS_PATH = ROOT / "data" / "insights.json"


DEFAULT_USER_DATA = {
    "version": 1,
    "notes": {},
    "completions": {},
    "readInsights": {},
    "favoriteInsights": {},
    "blogPosts": {},
    "blogDrafts": {},
    "blogTitles": {},
    "blogTitleDrafts": {},
}


class NoCacheHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        parsed_path = urlparse(path).path
        if parsed_path == "/":
            return str(ROOT / "index.html")
        clean_path = posixpath.normpath(unquote(parsed_path))
        parts = [part for part in clean_path.split("/") if part and part not in (os.curdir, os.pardir)]
        full_path = (ROOT / Path(*parts)).resolve()
        if not str(full_path).startswith(str(ROOT)):
            return str(ROOT / "index.html")
        return str(full_path)

    def do_GET(self) -> None:
        parsed_path = urlparse(self.path).path
        if parsed_path == "/api/health":
            self.send_json({"ok": True})
            return
        if parsed_path == "/api/user-data":
            self.send_json(read_json(USER_DATA_PATH, DEFAULT_USER_DATA))
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed_path = urlparse(self.path).path
        if parsed_path == "/api/user-data":
            self.handle_user_data_save()
            return
        if parsed_path == "/api/insights":
            self.handle_insights_save()
            return
        if parsed_path == "/api/publish":
            payload = self.read_body_json()
            result = publish_changes(payload.get("message") or "Update DailyBlog data")
            self.send_json(result, 200 if result["ok"] else 500)
            return
        self.send_error(404, "API route not found")

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def handle_user_data_save(self) -> None:
        payload = self.read_body_json()
        data = normalize_user_data(payload.get("data"))
        write_json(USER_DATA_PATH, data)
        response = {"ok": True, "path": str(USER_DATA_PATH.relative_to(ROOT))}
        if payload.get("publish"):
            publish = publish_changes(payload.get("message") or "Update DailyBlog data")
            response["publish"] = publish
            self.send_json(response, 200 if publish["ok"] else 500)
            return
        self.send_json(response)

    def handle_insights_save(self) -> None:
        payload = self.read_body_json()
        data = payload.get("data")
        if not isinstance(data, dict):
            self.send_error(400, "Expected JSON object at data")
            return
        write_json(INSIGHTS_PATH, data)
        response = {"ok": True, "path": str(INSIGHTS_PATH.relative_to(ROOT))}
        if payload.get("publish"):
            publish = publish_changes(payload.get("message") or "Update DailyBlog insights")
            response["publish"] = publish
            self.send_json(response, 200 if publish["ok"] else 500)
            return
        self.send_json(response)

    def read_body_json(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length > 2_000_000:
            self.send_error(413, "Payload too large")
            return {}
        raw_body = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return {}
        return payload if isinstance(payload, dict) else {}

    def send_json(self, data: dict, status: int = 200) -> None:
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def read_json(path: Path, default: dict) -> dict:
    if not path.exists():
        return default.copy()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return default.copy()
    return data if isinstance(data, dict) else default.copy()


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")
        temp_path = Path(file.name)
    temp_path.replace(path)


def normalize_user_data(data: object) -> dict:
    if not isinstance(data, dict):
        return DEFAULT_USER_DATA.copy()
    normalized = DEFAULT_USER_DATA.copy()
    for key in normalized:
        if key == "version":
            normalized[key] = data.get(key) or 1
        elif isinstance(data.get(key), dict):
            normalized[key] = data[key]
    return normalized


def publish_changes(message: str) -> dict:
    status = run_git(["status", "--short", "--", "data/user-data.json", "data/insights.json"])
    if not status["ok"]:
        return status
    if not status["stdout"].strip():
        return {"ok": True, "message": "No data changes to publish"}

    for args in (
        ["add", "data/user-data.json", "data/insights.json"],
        ["commit", "-m", message],
        ["push"],
    ):
        result = run_git(args)
        if not result["ok"]:
            return result
    return {"ok": True, "message": "Published to GitHub"}


def run_git(args: list[str]) -> dict:
    process = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        env=git_env(),
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    return {
        "ok": process.returncode == 0,
        "command": "git " + " ".join(args),
        "stdout": process.stdout.strip(),
        "stderr": process.stderr.strip(),
    }


def git_env() -> dict[str, str]:
    env = os.environ.copy()
    proxy = env.get("DAILYBLOG_GIT_PROXY")
    if proxy:
        env.setdefault("https_proxy", proxy)
        env.setdefault("http_proxy", proxy)
    return env


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    server = ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler)
    print(f"DailyBlog local server running at http://127.0.0.1:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
