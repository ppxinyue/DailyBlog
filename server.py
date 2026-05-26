#!/usr/bin/env python3
"""Local static server plus Python analysis endpoints for Mimic."""

from __future__ import annotations

import ast
import json
import sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


MAX_BODY_BYTES = 256_000


def analyze_python_code(payload: dict[str, Any]) -> dict[str, Any]:
    code = str(payload.get("code") or "")
    expected_signature = str(payload.get("expectedSignature") or "")
    keywords = payload.get("keywords") if isinstance(payload.get("keywords"), list) else []
    errors: list[str] = []
    warnings: list[str] = []

    if len(code.encode("utf-8")) > MAX_BODY_BYTES:
        errors.append("代码过长：本地预检最多接收 256 KB。")
        return {"backend": "python-ast", "errors": errors, "warnings": warnings}

    try:
        ast.parse(code or "\n", mode="exec")
    except SyntaxError as exc:
        line = exc.lineno or 1
        column = exc.offset or 1
        message = exc.msg or "invalid syntax"
        errors.append(f"Line {line}, Col {column}: {message}。")
        if exc.text:
            warnings.append(f"Line {line}: {exc.text.strip()}")

    for line_number, line in enumerate(code.splitlines(), start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        indent = len(line[: len(line) - len(line.lstrip(" \t"))].replace("\t", "    "))
        if indent % 4 != 0:
            warnings.append(f"Line {line_number}: 缩进不是 4 的倍数，Python 可能解释成错误层级。")

    if expected_signature and expected_signature not in code:
        errors.append(f"缺少预期函数签名：{expected_signature}。")

    normalized_code = code.lower()
    keyword_hits = [
        str(keyword)
        for keyword in keywords
        if str(keyword).split(" ")[0].lower() in normalized_code
    ]
    if keywords and not keyword_hits:
        warnings.append(f"没有检测到主题关键词：{', '.join(map(str, keywords))}。这不一定错，但建议确认解法模式。")

    return {"backend": "python-ast", "errors": errors, "warnings": warnings}


class MimicHandler(SimpleHTTPRequestHandler):
    def do_POST(self) -> None:
        if self.path != "/api/python/analyze":
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown API endpoint")
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid Content-Length")
            return

        if content_length > MAX_BODY_BYTES:
            self._send_json({"backend": "python-ast", "errors": ["请求体过大。"], "warnings": []}, HTTPStatus.BAD_REQUEST)
            return

        try:
            payload = json.loads(self.rfile.read(content_length).decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid JSON")
            return

        self._send_json(analyze_python_code(payload))

    def _send_json(self, body: dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    server = ThreadingHTTPServer(("127.0.0.1", port), MimicHandler)
    print(f"Mimic local server running at http://127.0.0.1:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
