#!/usr/bin/env bash
# Local smoke test: Anvil + Foundry deploy + backend health (optional).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export ANVIL_PORT="${ANVIL_PORT:-8545}"
export ANVIL_RPC_URL="http://127.0.0.1:${ANVIL_PORT}"

if ! command -v anvil >/dev/null 2>&1; then
  echo "Foundry (anvil) is required: https://book.getfoundry.sh" >&2
  exit 1
fi

if ! command -v forge >/dev/null 2>&1; then
  echo "Foundry (forge) is required" >&2
  exit 1
fi

cleanup() {
  if [ -n "${ANVIL_PID:-}" ]; then
    kill "${ANVIL_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "Starting anvil on port ${ANVIL_PORT}..."
anvil --port "${ANVIL_PORT}" --silent &
ANVIL_PID=$!
sleep 2

echo "Deploying tokenomics stack to anvil..."
cd "$ROOT/packages/contracts"
export PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
forge script script/DeployTokenomics.s.sol:DeployTokenomics \
  --rpc-url "$ANVIL_RPC_URL" \
  --broadcast \
  --slow

echo "Anvil deploy finished. Set backend WEB3_RPC / CHAINS_JSON to point at this RPC for full-stack tests."

if command -v curl >/dev/null 2>&1; then
  if [ "${SKIP_BACKEND_HEALTH:-0}" != "1" ] && command -v uvicorn >/dev/null 2>&1; then
    echo "Tip: run backend with DATABASE_URL=sqlite:///:memory: and WEB3_RPC=${ANVIL_RPC_URL}, then: curl -sS http://127.0.0.1:8000/health"
  fi
fi

echo "verify_production.sh completed successfully."
