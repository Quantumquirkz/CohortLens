---
sidebar_position: 7
---

# Examples

## Health check

```bash
curl -sS http://localhost:8000/health
```

## Cohort discovery (when API is running)

```bash
curl -sS -X POST http://localhost:8000/api/v1/cohorts/discover \
  -H "Content-Type: application/json" \
  -d '{"protocol":"aave-v3","chain":"polygon"}'
```

Adjust the body to match current FastAPI schemas in `packages/backend-ai/app/schemas/`.

## Contracts (Foundry)

```bash
cd packages/contracts
forge test
forge script script/DeployTokenomics.s.sol --rpc-url "$SEPOLIA_RPC_URL" --broadcast
```

Use testnets first; mainnet operations should use multisig workflows described in deployment docs.
