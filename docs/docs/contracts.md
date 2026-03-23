---
sidebar_position: 5
---

# Smart contracts reference

Contracts live in [`packages/contracts`](https://github.com/Quantumquirkz/CohortLens/tree/main/packages/contracts).

## NatSpec and docs

- Prefer **NatSpec** comments on public/external functions.
- Run **`forge doc`** from `packages/contracts` to generate reference output; copy relevant pages into this docs site when releasing major versions.

## Key contracts

| Contract | Role |
|----------|------|
| `LensToken` | ERC20 + voting |
| `Staking` | Stake LENS, rewards |
| `CohortRegistry` | Register lenses / models |
| `CohortOracle` | Predictions and fee split |
| `CohortGovernor` / `CohortTimelock` | Governance |

Deployment JSON files: `packages/contracts/deployments/`.
