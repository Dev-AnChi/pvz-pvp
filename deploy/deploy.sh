#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Only update this game's service; the Discord bot is managed separately.
docker compose pull pvz
docker compose up -d --wait --wait-timeout 60 pvz
