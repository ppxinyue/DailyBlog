#!/usr/bin/env zsh
set -euo pipefail

cd "$(dirname "$0")/.."

port="${1:-4173}"
python3 server.py "$port"
