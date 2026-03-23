# Aave v3 — Ethereum mainnet (template)

1. Copy `subgraph.yaml` and set `network: mainnet` and official Aave v3 Ethereum **Pool** / **PoolAddressesProvider** addresses.
2. Copy `abis/` and `schema.graphql` from [../polygon/](../polygon/) if not present here.
3. Run `npm install` and `graph codegen && graph build` in this directory.

Point the backend at this subgraph’s hosted GraphQL endpoint via `CHAINS_JSON` (`subgraph_url` for key `ethereum`).
