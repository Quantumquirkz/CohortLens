# CohortLens — Contracts (Foundry)

Project smart contracts. Source code lives in [`src/`](src/).

## Requirements

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`, `anvil`)

## Dependencies

Install OpenZeppelin contracts:

```bash
forge install OpenZeppelin/openzeppelin-contracts
```

(If the repo already has `lib/openzeppelin-contracts`, this step can be skipped.)

## Commands

```bash
# Build
forge build

# Test
forge test

# Deploy Phase 7 (LENS, timelock, governor, staking, registry, oracle)
forge script script/DeployTokenomics.s.sol:DeployTokenomics --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

See [`deployments/tokenomics.md`](deployments/tokenomics.md) for supply and governance parameters.

## Local chain (Anvil)

```bash
anvil
# another terminal
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge script script/DeployTokenomics.s.sol:DeployTokenomics --rpc-url http://127.0.0.1:8545 --broadcast
```

## Environment variables

- `PRIVATE_KEY` — Deployer wallet private key (for scripts)
- `SEPOLIA_RPC_URL` — Sepolia RPC endpoint (e.g. from Infura or Alchemy)
- `ETHERSCAN_API_KEY` — Required for `--verify` on Etherscan
- `TREASURY_ADDRESS`, `LENS_INITIAL_SUPPLY`, `MIN_STAKE_TO_REGISTER`, `ORACLE_CREATOR_BPS`, `ORACLE_REWARDS_BPS` — optional overrides for `DeployTokenomics` (see script)

## Configuration

Configuration in [`foundry.toml`](foundry.toml): Solidity **0.8.24**, optimizer enabled. The Sepolia profile uses `SEPOLIA_RPC_URL` from the environment.
