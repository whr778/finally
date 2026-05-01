#!/usr/bin/env bash
# Start the FinAlly container (macOS / Linux).
# Idempotent: builds the image if missing, replaces a running container if present.
set -euo pipefail

IMAGE_NAME="finally:latest"
CONTAINER_NAME="finally"
VOLUME_NAME="finally-data"
PORT="${FINALLY_PORT:-8000}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

BUILD=0
OPEN_BROWSER=0
for arg in "$@"; do
    case "$arg" in
        --build) BUILD=1 ;;
        --open)  OPEN_BROWSER=1 ;;
        -h|--help)
            echo "Usage: $0 [--build] [--open]"
            echo "  --build  Rebuild the Docker image even if it already exists"
            echo "  --open   Open http://localhost:${PORT} in the default browser"
            exit 0
            ;;
    esac
done

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "No .env found; copying .env.example -> .env"
        cp .env.example .env
    else
        echo "Warning: no .env or .env.example found; container will run without env vars"
    fi
fi

if [ "$BUILD" -eq 1 ] || ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    echo "Building image $IMAGE_NAME..."
    docker build -t "$IMAGE_NAME" .
fi

if docker ps -a --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"; then
    echo "Removing existing container $CONTAINER_NAME..."
    docker rm -f "$CONTAINER_NAME" >/dev/null
fi

ENV_ARG=()
if [ -f .env ]; then
    ENV_ARG=(--env-file .env)
fi

echo "Starting container $CONTAINER_NAME on port $PORT..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "${PORT}:8000" \
    -v "${VOLUME_NAME}:/app/db" \
    "${ENV_ARG[@]}" \
    "$IMAGE_NAME" >/dev/null

URL="http://localhost:${PORT}"
echo "FinAlly is starting: ${URL}"

if [ "$OPEN_BROWSER" -eq 1 ]; then
    if command -v open >/dev/null 2>&1; then
        open "$URL"
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$URL"
    fi
fi
