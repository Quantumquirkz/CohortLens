# Subgraph Aave v3 (Polygon)

Indexa el contrato **Pool** de Aave v3 en Polygon (`0x794a61358D6845594F94dc1DB02A252b5b4814aD`) y materializa entidades por evento: `Deposit` (Supply), `Withdrawal`, `Borrow`, `Repayment`.

## Requisitos

- Node.js 18+
- Graph CLI (`npm install` en este directorio instala `@graphprotocol/graph-cli` en `devDependencies`)

## Comandos

```bash
npm install
npx graph codegen
npx graph build
```

## Despliegue local (Graph Node)

Con el stack `docker-compose` de la raíz del monorepo (`graph-node`, `ipfs`, `postgres-graph`):

1. Crea y despliega el subgrafo (ajusta el nombre/etiqueta):

```bash
npx graph create --node http://127.0.0.1:8020 cohortlens/aave-v3
npx graph deploy --node http://127.0.0.1:8020 --ipfs http://127.0.0.1:5001 cohortlens/aave-v3
```

2. Consulta GraphQL (puerto publicado en el host para el HTTP del nodo: **8020**):

`http://127.0.0.1:8020/subgraphs/name/cohortlens/aave-v3`

Esa URL debe coincidir con `SUBGRAPH_URL` en `packages/backend-ai`.

## Nota sobre `gasUsed`

Los mappings rellenan `gasUsed` con **0** porque `graph-ts` no expone de forma portable el gas usado en la transacción dentro del handler. El campo existe para esquema futuro; `avg_gas` en el backend puede ser 0 salvo que amplíes el subgrafo (p. ej. fuente off-chain o extensión del protocolo).

## GraphQL de ejemplo

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

## Servicio alojado

Despliega en [Subgraph Studio](https://thegraph.com/studio/) y usa la **Query URL** HTTPS como `SUBGRAPH_URL`.
