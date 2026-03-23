# CohortLens — Indexers (The Graph)

Subgraphs that index DeFi protocols (e.g. **Aave v3** on Polygon) live here. Each protocol can have its own folder under [`protocols/`](protocols/).

## Requirements

- Node.js 18+
- [Graph CLI](https://thegraph.com/docs/en/subgraphs/developing/creating/install-the-graph-cli/): `npm install -g @graphprotocol/graph-cli`

## Example subgraph: Aave v3 (Polygon)

Path: [`protocols/aave-v3/`](protocols/aave-v3/).

1. Install subgraph dependencies (`@graphprotocol/graph-ts`, local CLI):

   ```bash
   cd packages/indexers/protocols/aave-v3
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

El subgrafo completo vive en [`protocols/aave-v3/`](protocols/aave-v3/); consulta su [README](protocols/aave-v3/README.md) para build, despliegue y URL de consulta (`SUBGRAPH_URL` en el backend).
