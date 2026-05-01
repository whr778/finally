#!/usr/bin/env bash
# Stop and remove the FinAlly container (macOS / Linux).
# The named volume "finally-data" is preserved so the SQLite database survives.
set -euo pipefail

CONTAINER_NAME="finally"

if docker ps -a --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"; then
    echo "Stopping container $CONTAINER_NAME..."
    docker rm -f "$CONTAINER_NAME" >/dev/null
    echo "Stopped. Volume 'finally-data' preserved."
else
    echo "No container named $CONTAINER_NAME is running."
fi
