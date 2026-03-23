# CohortLens — Indexers (The Graph)

Subgraphs that index DeFi protocols (e.g. **Aave v3** on Polygon) live here. Each protocol may have subfolders per network: `protocols/<protocol>/<chain>/` (e.g. [`protocols/aave-v3/polygon/`](protocols/aave-v3/polygon/)).

## Requirements

- Node.js 18+
- [Graph CLI](https://thegraph.com/docs/en/subgraphs/developing/creating/install-the-graph-cli/): `npm install -g @graphprotocol/graph-cli`

## Example subgraph: Aave v3 (Polygon)

Path: [`protocols/aave-v3/polygon/`](protocols/aave-v3/polygon/).

1. Install subgraph dependencies (`@graphprotocol/graph-ts`, local CLI):

   ```bash
   cd packages/indexers/protocols/aave-v3/polygon
   npm install
   ```

2. Generate types and code from the manifest:

   ```bash
   npx graph codegen
   ```

3. Build the subgraph:

   ```bash
   npx graph build
   ```

4. To deploy against a local **Graph Node** (e.g. the `graph-node` service from `docker-compose` at the monorepo root), configure the admin URL and follow the [official deployment docs](https://thegraph.com/docs/en/deploying/deploying-a-subgraph-to-hosted/).

General documentation: [The Graph — Docs](https://thegraph.com/docs/).

## Aave v3 (Polygon)

The subgraph lives under [`protocols/aave-v3/polygon/`](protocols/aave-v3/polygon/); the [protocol README](protocols/aave-v3/README.md) describes the per-network layout. The query URL must match `SUBGRAPH_URL` or `CHAINS_JSON` in the backend.
