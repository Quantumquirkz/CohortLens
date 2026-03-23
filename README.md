# CohortLens

[![CI](https://github.com/Quantumquirkz/CohortLens/actions/workflows/ci.yml/badge.svg)](https://github.com/Quantumquirkz/CohortLens/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Tools and services for cohort analysis and on-chain data: smart contracts (Foundry), ML API ([`packages/backend-ai`](packages/backend-ai/README.md)), Next.js web interface ([`packages/frontend`](packages/frontend/README.md)), and The Graph indexers ([`packages/indexers`](packages/indexers/README.md)).

**Documentation site (Docusaurus):** build and run locally with `cd docs && npm install && npm start`, or see [docs/docs/intro.md](docs/docs/intro.md) in the repository.

## Monorepo architecture

```text
packages/
├── contracts/   # Solidity (Foundry)
├── backend-ai/  # FastAPI + ML
├── frontend/    # Next.js + Wagmi
└── indexers/    # Subgraphs (The Graph)
```

- **Contracts**: on-chain logic and deployment scripts.
- **Backend AI**: HTTP API, future integration with Postgres and Redis from `docker-compose`.
- **Frontend**: web app and wallet connection.
- **Indexers**: subgraphs per protocol (e.g. Aave v3 on Polygon).

## Requirements

- **Node.js** 18+ (for frontend and `graph-cli` in indexers)
- **Python** 3.11+ (backend without Docker)
- **Docker** and Docker Compose (integrated environment)
- **Foundry** (`forge`, `cast`) for [`packages/contracts`](packages/contracts/README.md)

## Quick start with Docker

1. Copy example variables and adjust as needed:

   ```bash
   cp .env.example .env
   ```

2. Start services (app Postgres, Graph Node Postgres, Redis, IPFS, Graph Node, backend, frontend):

   ```bash
   docker compose up --build
   ```

   Full startup (especially **Graph Node** and **IPFS**) can take time and use significant resources. For a lighter cycle (API and databases only):

   ```bash
   docker compose up --build postgres postgres-graph redis backend-ai frontend ipfs
   ```

   Or manually exclude `graph-node` from the profile if you add profiles later.

3. Check the backend: [http://localhost:8000/health](http://localhost:8000/health) should return `{"status":"ok"}`.

4. Frontend: [http://localhost:3000](http://localhost:3000).

5. **Graph Node** (if running): HTTP on host mapped to port **8020** (equivalent to container port 8000).

## Default ports

| Service        | Host port |
| -------------- | ----------- |
| Frontend       | 3000        |
| Backend AI     | 8000        |
| Postgres (app) | 5432        |
| Postgres Graph | 5433        |
| Redis          | 6379        |
| Graph Node HTTP| 8020        |
| IPFS API       | 5001        |

## Package documentation

- [Contracts (Foundry)](packages/contracts/README.md)
- [Backend AI](packages/backend-ai/README.md)
- [Frontend](packages/frontend/README.md)
- [Indexers](packages/indexers/README.md)

## License and community

This project is licensed under the MIT license; see [LICENSE](LICENSE).

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security](SECURITY.md)
- [Releases](RELEASE.md)
