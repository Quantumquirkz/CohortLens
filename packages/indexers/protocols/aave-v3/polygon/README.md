# Aave v3 subgraph (Polygon)

Indexes the Aave v3 **Pool** on Polygon (`0x794a61358D6845594F94dc1DB02A252b5b4814aD`) and materializes entities per event: `Deposit` (Supply), `Withdrawal`, `Borrow`, `Repayment`.

## Requirements

- Node.js 18+
- Graph CLI (`npm install` in this directory installs `@graphprotocol/graph-cli` in `devDependencies`)

## Commands

```bash
npm install
npx graph codegen
npx graph build
```

## Local deployment (Graph Node)

With the monorepo root `docker-compose` stack (`graph-node`, `ipfs`, `postgres-graph`):

1. Create and deploy the subgraph (adjust name/label):

```bash
npx graph create --node http://127.0.0.1:8020 cohortlens/aave-v3
npx graph deploy --node http://127.0.0.1:8020 --ipfs http://127.0.0.1:5001 cohortlens/aave-v3
```

2. Query GraphQL (host port for node HTTP is **8020**):

`http://127.0.0.1:8020/subgraphs/name/cohortlens/aave-v3`

That URL should match `SUBGRAPH_URL` in `packages/backend-ai`.

## Note on `gasUsed`

Mappings set `gasUsed` to **0** because `graph-ts` does not expose transaction gas used portably inside the handler. The field exists for future schema work; `avg_gas` in the backend may be 0 unless you extend the subgraph (e.g. off-chain source or protocol extension).

## Example GraphQL

```graphql
query {
  deposits(first: 5, orderBy: blockNumber, orderDirection: desc) {
    id
    amount
    blockNumber
    user { id }
  }
}
```

## Hosted service

Deploy to [Subgraph Studio](https://thegraph.com/studio/) and use the HTTPS **Query URL** as `SUBGRAPH_URL`.
