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

# Deploy to Sepolia
forge script script/DeployContracts.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

## Environment variables

- `PRIVATE_KEY` — Deployer wallet private key (for scripts)
- `SEPOLIA_RPC_URL` — Sepolia RPC endpoint (e.g. from Infura or Alchemy)
- `ETHERSCAN_API_KEY` — Required for `--verify` on Etherscan

## Configuration

Configuration in [`foundry.toml`](foundry.toml): Solidity **0.8.20**, optimizer enabled. The Sepolia profile uses `SEPOLIA_RPC_URL` from the environment.
