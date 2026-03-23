# Mainnet deployment and Gnosis Safe

## Recommended flow

1. **Prepare parameters** in a secure environment: `PRIVATE_KEY` (cold wallet or CI with hardware signing is discouraged for mainnet; prefer local Foundry + Ledger or Safe `delegatecall` patterns from your security policy).
2. **Set** `GOVERNANCE_MULTISIG` to your **Gnosis Safe** address that should receive Timelock `PROPOSER_ROLE` entries (the script sets `proposers[0] = GOVERNANCE_MULTISIG`).
3. Run `DeployProduction.s.sol` on **Ethereum mainnet** (or fork-test first):

   ```bash
   export PRIVATE_KEY=... # deployer EOA — use minimal funds; rotate after deploy
   export GOVERNANCE_MULTISIG=0xYourSafe
   export TREASURY_ADDRESS=0xTreasury
   forge script script/DeployProduction.s.sol:DeployProduction \
     --rpc-url "$MAINNET_RPC_URL" \
     --broadcast \
     --slow
   ```

4. **Verify** contracts on Etherscan (`forge verify-contract` or Foundry verify plugin).
5. **Transfer admin** if any component still points at the deployer outside the script path (double-check `LensToken` roles and `Ownable` targets — the script renounces deployer admin on LENS after granting the Timelock).
6. **Record** canonical addresses in `deployments/mainnet.json` and tag a release.

## Safe-only operations

- Routine parameter changes should go through **Governor** proposals executed by the **Timelock**, with the Safe as proposer where applicable.
- Avoid storing operational private keys in GitHub Actions for mainnet; prefer hardware wallets or Safe Transaction Builder for sensitive calls.
