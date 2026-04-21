#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PIDFILE="$PROJECT_ROOT/scripts/.dev.pids"

# Clean up any stale pid file
rm -f "$PIDFILE"

echo "Starting FinAlly dev environment..."

# Start backend
cd "$PROJECT_ROOT/backend"
uv run uvicorn app.main:app --port 8000 --reload &
BACKEND_PID=$!
echo "backend=$BACKEND_PID" >> "$PIDFILE"
echo "Backend started on http://localhost:8000 (PID $BACKEND_PID)"

# Start frontend
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
echo "frontend=$FRONTEND_PID" >> "$PIDFILE"
echo "Frontend started on http://localhost:3000 (PID $FRONTEND_PID)"

echo ""
echo "FinAlly is running:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo ""
echo "Stop with: $SCRIPT_DIR/stop_mac.sh"

# Wait for both processes
wait
