---
name: cohortlens-aave-subgraph
description: Scaffold and maintain the Aave v3 Polygon subgraph for CohortLens under packages/indexers/protocols/aave-v3 (The Graph, AssemblyScript, Graph Node or hosted deploy).
---

# CohortLens — Subgraph Aave v3 (Polygon)

## Cuándo usar

- Crear o actualizar el subgraph que indexa el **Pool** de Aave v3 en Polygon.
- Ejecutar `codegen` / `build` / despliegue contra **Graph Node** local o **Subgraph Studio**.

## Estructura

```
packages/indexers/protocols/aave-v3/
  subgraph.yaml      # dataSource Pool, red polygon, handlers de eventos
  schema.graphql     # entidades User, Deposit, Withdrawal, Borrow, Repayment
  package.json
  abis/Pool.json     # ABI mínimo (Supply, Withdraw, Borrow, Repay)
  src/mapping.ts
```

## Comandos locales

```bash
cd packages/indexers/protocols/aave-v3
npm install
npx graph codegen
npx graph build
```

## Graph Node local (docker-compose en la raíz del monorepo)

1. Arranca `postgres-graph`, `ipfs`, `graph-node` (y opcionalmente `POLYGON_RPC_URL` en el entorno del compose).
2. Admin JSON-RPC del nodo suele mapearse al host en el puerto **8020** (revisa [docker-compose.yml](../../../docker-compose.yml)).
3. Crea el subgraph y despliega (sustituye `VERSION` y la etiqueta del manifest):

```bash
# Ejemplo: crear subgrafo "cohortlens/aave-v3" en el nodo local
npx graph create --node http://127.0.0.1:8020 cohortlens/aave-v3

npx graph deploy --node http://127.0.0.1:8020 --ipfs http://127.0.0.1:5001 cohortlens/aave-v3
```

4. Con el `docker-compose` de este repo, el **Graph Node** expone HTTP en el host en el puerto **8020** (`8020:8000`). La URL de consulta GraphQL suele ser `http://127.0.0.1:8020/subgraphs/name/cohortlens/aave-v3`. Dentro de la red Docker usa `http://graph-node:8000/subgraphs/name/cohortlens/aave-v3`.

## Servicio alojado (The Graph Studio)

1. Crea un subgrafo en [The Graph Studio](https://thegraph.com/studio/).
2. Autentica `graph auth --studio <DEPLOY_KEY>`.
3. `graph deploy --studio <SUBGRAPH_SLUG>`.
4. Copia la **Query URL** HTTPS y configúrala como `SUBGRAPH_URL` en `packages/backend-ai`.

## Backend

- Variable `SUBGRAPH_URL` debe apuntar al endpoint GraphQL HTTP del subgrafo desplegado.
- El backend **no** ejecuta el indexer; solo consulta con POST GraphQL.

## Referencias

- [The Graph — Docs](https://thegraph.com/docs/)
- [Install Graph CLI](https://thegraph.com/docs/en/subgraphs/developing/creating/install-the-graph-cli/)
