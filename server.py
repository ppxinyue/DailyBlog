#!/usr/bin/env python3
"""Local static server for Mimic."""

from __future__ import annotations

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    server = ThreadingHTTPServer(("127.0.0.1", port), SimpleHTTPRequestHandler)
    print(f"Mimic local server running at http://127.0.0.1:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
