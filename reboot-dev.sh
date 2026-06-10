#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$ROOT_DIR/web"
PORT="${PORT:-5173}"
HOST="${HOST:-127.0.0.1}"

if [[ ! -d "$WEB_DIR" ]]; then
  echo "Expected web/ at $WEB_DIR" >&2
  exit 1
fi

kill_port() {
  local pids
  pids="$(lsof -ti tcp:"$PORT" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "Stopping anything on port $PORT..."
    kill $pids 2>/dev/null || true
    sleep 1
    pids="$(lsof -ti tcp:"$PORT" 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      kill -9 $pids 2>/dev/null || true
    fi
  fi
}

echo "Rebooting Stella editor dev server..."
kill_port

cd "$WEB_DIR"

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting editor at http://$HOST:$PORT"
exec npm exec -- vite --host "$HOST" --port "$PORT"
