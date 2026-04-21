#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PIDFILE="$PROJECT_ROOT/scripts/.dev.pids"

if [ ! -f "$PIDFILE" ]; then
  echo "No running processes found (no pid file)."
  echo "Checking for stray processes..."

  # Kill any uvicorn or next-dev on standard ports
  lsof -ti:8000 2>/dev/null | xargs kill 2>/dev/null && echo "Killed process on port 8000" || true
  lsof -ti:3000 2>/dev/null | xargs kill 2>/dev/null && echo "Killed process on port 3000" || true
  exit 0
fi

echo "Stopping FinAlly dev environment..."

while IFS='=' read -r name pid; do
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null && echo "Stopped $name (PID $pid)" || true
  else
    echo "$name (PID $pid) already stopped"
  fi
done < "$PIDFILE"

rm -f "$PIDFILE"
echo "Done."
