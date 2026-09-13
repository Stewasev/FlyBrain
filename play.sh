#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo
echo "  Male CNS atlas"
echo "  Live:  https://stewasev.github.io/FlyBrain/"
echo "  Local: http://127.0.0.1:8000/"
echo

if [[ ! -f index.html ]]; then
  echo "Run this from the FlyBrain folder (the one with index.html)." >&2
  exit 1
fi
if [[ ! -f data/runtime/neurons.json.gz ]]; then
  echo "Missing data/runtime. Clone the full repo:" >&2
  echo "  git clone https://github.com/Stewasev/FlyBrain.git" >&2
  exit 1
fi

PY=""
if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
fi
if [[ -z "$PY" ]]; then
  echo "Need Python 3. On macOS:  brew install python" >&2
  echo "On Debian/Ubuntu:        sudo apt install python3" >&2
  exit 1
fi

open_url() {
  if command -v open >/dev/null 2>&1; then
    open "$1"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$1" >/dev/null 2>&1 || true
  elif command -v wslview >/dev/null 2>&1; then
    wslview "$1"
  else
    echo "Open $1 in a browser."
  fi
}

echo "Starting server. Press Ctrl+C to stop."
echo
(sleep 1; open_url "http://127.0.0.1:8000/") &

if ! "$PY" -m http.server 8000 --bind 127.0.0.1; then
  echo
  echo "Port 8000 is already in use — opening that copy instead."
  open_url "http://127.0.0.1:8000/"
fi
