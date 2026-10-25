#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/artifacts/punk-platform-v3/imported"
export PORT="${PORT:-3000}"
echo "[PUNK API V4] Starting Express on port $PORT (X + Stonk + registry)"
exec node server.js
