#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PORT="${PORT:-3000}"
if [[ "${NODE_ENV:-}" != "production" ]]; then
  echo "[PUNK] Building bundled frontend for Preview..."
  cd "$ROOT"
  BASE_PATH="${BASE_PATH:-/}" PORT="$PORT" pnpm --filter @workspace/punk-platform-v3 build
fi
if [[ ! -f "$ROOT/artifacts/punk-platform-v3/dist/public/index.html" ]]; then
  echo "ERROR: Compiled frontend missing. Run pnpm build before starting." >&2
  exit 1
fi
cd "$ROOT/artifacts/punk-platform-v3/imported"
echo "[PUNK] Starting Express + compiled frontend on port $PORT"
exec node server.js
