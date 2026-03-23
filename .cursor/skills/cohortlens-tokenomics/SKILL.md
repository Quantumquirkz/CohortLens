# CohortLens — Phase 7 tokenomics (contracts + backend)

## When to use

Scaffolding or changing **$LENS**, **Staking**, **CohortOracle** LENS payments, **CohortRegistry** min stake, **CohortGovernor** + **CohortTimelock**, FastAPI `token_client`, or `/discover` payment verification.

## Canonical paths

- Contracts: [`packages/contracts/src/`](/packages/contracts/src/) — `LensToken.sol`, `Staking.sol`, `CohortRegistry.sol`, `CohortOracle.sol`, `CohortGovernor.sol`, `CohortTimelock.sol`
- Deploy: [`packages/contracts/script/DeployTokenomics.s.sol`](/packages/contracts/script/DeployTokenomics.s.sol), notes in [`packages/contracts/deployments/tokenomics.md`](/packages/contracts/deployments/tokenomics.md)
- Backend: [`packages/backend-ai/app/services/token_client.py`](/packages/backend-ai/app/services/token_client.py), ABIs under `app/abis/`

## Rules

- Follow OpenZeppelin **ERC20Votes** + **Governor** + **TimelockController** patterns; do not invent ad-hoc governance.
- User-paid `/discover` requires `payment_tx_hash` when `REQUIRE_LENS_PAYMENT_FOR_DISCOVER=true`.
