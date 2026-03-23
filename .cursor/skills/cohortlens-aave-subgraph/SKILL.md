---
name: cohortlens-aave-subgraph
description: Scaffold and maintain the Aave v3 Polygon subgraph for CohortLens under packages/indexers/protocols/aave-v3/polygon (The Graph, AssemblyScript, Graph Node or hosted deploy).
---

# CohortLens — Aave v3 subgraph (Polygon)

## When to use

- Create or update the subgraph that indexes the Aave v3 **Pool** on Polygon.
- Run `codegen` / `build` / deploy against local **Graph Node** or **Subgraph Studio**.

## Layout

```
packages/indexers/protocols/aave-v3/polygon/
  subgraph.yaml      # Pool dataSource, polygon network, event handlers
  schema.graphql     # User, Deposit, Withdrawal, Borrow, Repayment entities
  package.json
  abis/Pool.json     # minimal ABI (Supply, Withdraw, Borrow, Repay)
  src/mapping.ts
```

## Local commands

```bash
cd packages/indexers/protocols/aave-v3/polygon
npm install
npx graph codegen
npx graph build
```

## Local Graph Node (docker-compose at monorepo root)

1. Start `postgres-graph`, `ipfs`, `graph-node` (and optionally `POLYGON_RPC_URL` in compose env).
2. The node’s admin JSON-RPC is usually mapped to the host on port **8020** (see [docker-compose.yml](../../../docker-compose.yml)).
3. Create the subgraph and deploy (replace `VERSION` and manifest label):

```bash
# Example: create subgraph "cohortlens/aave-v3" on local node
npx graph create --node http://127.0.0.1:8020 cohortlens/aave-v3

npx graph deploy --node http://127.0.0.1:8020 --ipfs http://127.0.0.1:5001 cohortlens/aave-v3
```

4. With this repo’s `docker-compose`, **Graph Node** exposes HTTP on the host at **8020** (`8020:8000`). The GraphQL query URL is usually `http://127.0.0.1:8020/subgraphs/name/cohortlens/aave-v3`. Inside Docker use `http://graph-node:8000/subgraphs/name/cohortlens/aave-v3`.

## Hosted service (The Graph Studio)

1. Create a subgraph in [The Graph Studio](https://thegraph.com/studio/).
2. Authenticate `graph auth --studio <DEPLOY_KEY>`.
3. `graph deploy --studio <SUBGRAPH_SLUG>`.
4. Copy the HTTPS **Query URL** and set it as `SUBGRAPH_URL` in `packages/backend-ai`.

## Backend

- `SUBGRAPH_URL` must point to the deployed subgraph’s HTTP GraphQL endpoint.
- The backend does **not** run the indexer; it only queries via POST GraphQL.

## References

- [The Graph — Docs](https://thegraph.com/docs/)
- [Install Graph CLI](https://thegraph.com/docs/en/subgraphs/developing/creating/install-the-graph-cli/)
