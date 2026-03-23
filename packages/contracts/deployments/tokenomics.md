# CohortLens Phase 7 — Tokenomics deployment notes

## Token: LENS (`LensToken`)

- **Name / symbol**: CohortLens / LENS (18 decimals).
- **Initial mint**: configurable via `LENS_INITIAL_SUPPLY` (default `100_000_000 ether` in `DeployTokenomics.s.sol` env) to `TREASURY_ADDRESS` (or deployer if unset).
- **Roles**: `DEFAULT_ADMIN_ROLE` and `MINTER_ROLE` are transferred to the **Timelock** after deploy; the deployer renounces.
- **Governance**: `ERC20Votes` — users must **delegate** (self-delegate or delegate to another address) to accrue voting power checkpoints.

## Fee split (`CohortOracle`)

- **Defaults**: `ORACLE_CREATOR_BPS=7000`, `ORACLE_REWARDS_BPS=2000` → **10%** to `treasury`, **20%** to `Staking` (reward notifier), **70%** to the lens **owner** (model creator).
- **Registry prices**: `pricePerQuery` is in **LENS wei** (1e18 = 1 LENS).

## Staking

- **Min stake to register** a model: `MIN_STAKE_TO_REGISTER` (default `1 ether` LENS units).
- **Rewards**: oracle transfers the rewards tranche to `Staking`, then calls `notifyRewardAmount`; stakers accrue `rewardPerTokenStored` and claim via `getReward()`.
- **Slashing**: `slash(account, amount, reason)` is **`DEFAULT_ADMIN_ROLE`** on `Staking` (intended holder: **Timelock**). Governance can batch `slash` + `CohortRegistry.setLensActive` (via owner = Timelock) to disable a malicious lens.

## Governance

- **`CohortTimelock`**: `1 day` min delay (script default); proposer initially deployer, then **`CohortGovernor`** receives `PROPOSER_ROLE`; `EXECUTOR_ROLE` granted to `address(0)` (public execution).
- **`CohortGovernor`**: `votingDelay=1` block, `votingPeriod=50400` blocks (~1 week at 12s), `proposalThreshold=0`, quorum **4%** of supply (`GovernorVotesQuorumFraction` numerator `4` with denominator `100`).

## Post-deploy checklist

1. Grant `REWARD_NOTIFIER_ROLE` on `Staking` to `CohortOracle` (script does this).
2. Transfer **ownership** of `CohortRegistry` and `CohortOracle` to **Timelock** (script does this).
3. Transfer **LensToken** admin/minter to **Timelock** (script does this).
4. Optionally revoke deployer’s `PROPOSER_ROLE` on timelock after governance is live.

## Local testing

Use **Anvil** + `forge script script/DeployTokenomics.s.sol:DeployTokenomics --rpc-url http://127.0.0.1:8545 --broadcast` with `PRIVATE_KEY` and env vars documented in [packages/contracts/README.md](../README.md).
