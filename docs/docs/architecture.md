---
sidebar_position: 2
---

# Architecture

## High-level

```text
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Frontend   │────▶│  Backend AI  │────▶│  Postgres/Redis │
│  (Next.js)  │     │  (FastAPI)   │     │  IPFS (models)  │
└──────┬──────┘     └──────┬───────┘     └─────────────────┘
       │                   │
       │  Wagmi/Viem       │  web3.py
       ▼                   ▼
┌──────────────────────────────────────────────────────────┐
│              EVM (CohortRegistry, CohortOracle, …)        │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  The Graph subgraphs (per protocol/chain)                 │
└──────────────────────────────────────────────────────────┘
```

## Data flow

1. **Indexing**: subgraphs ingest protocol events; the backend queries subgraph GraphQL URLs (`SUBGRAPH_URL` / `CHAINS_JSON`).
2. **Models**: artifacts live on **IPFS**; the registry stores hashes or CIDs on-chain.
3. **Predictions**: users may pay in **LENS** via the oracle; fees split per tokenomics configuration.

See package READMEs in the repository for package-specific details.
