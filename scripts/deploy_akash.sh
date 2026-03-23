#!/usr/bin/env bash
# Akash SDL deployment (requires akash CLI and configured wallet).
set -euo pipefail

SDL="${1:-deploy/akash/deploy.yaml}"
if [[ ! -f "$SDL" ]]; then
  echo "Usage: $0 [path/to/deploy.yaml]" >&2
  exit 1
fi

: "${AKASH_KEY_NAME:?Set AKASH_KEY_NAME (key name in akash)}"

echo "Creating deployment from $SDL ..."
akash tx deployment create "$SDL" \
  --from "$AKASH_KEY_NAME" \
  --chain-id "${AKASH_CHAIN_ID:-akashnet-2}" \
  --node "${AKASH_NODE:-https://rpc.akash.forbole.com:443}" \
  -y

echo "Next: akash provider send-manifest (or your provider flow) and verify the lease."
