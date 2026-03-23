# Contributing to CohortLens

Thank you for your interest. This guide covers reporting issues, development setup, and pull requests.

## Reporting issues

- Search the repository to avoid duplicates.
- Include a clear title and steps to reproduce (commands, OS, Node/Python/Docker/Foundry versions).
- Do not paste private keys, real `.env` values, or tokens.

## Development setup

| Package | Commands |
|---------|----------|
| **Contracts** | `cd packages/contracts && forge fmt && forge test` |
| **Backend** | Python 3.11+, `pip install -r requirements.txt -r requirements-dev.txt`, `uvicorn app.main:app --reload` from `packages/backend-ai` |
| **Frontend** | Node 18+, `cd packages/frontend && npm install && npm run dev` |
| **Docs site** | `cd docs && npm install && npm start` |

Follow [.cursorrules](.cursorrules) and package READMEs for architecture rules.

## Branches and commits

- Use branch prefixes when helpful: `feat/`, `fix/`, `docs/`.
- Prefer [Conventional Commits](https://www.conventionalcommits.org/) style messages (`feat:`, `fix:`, `chore:`) for cleaner changelogs ([RELEASE.md](RELEASE.md), git-cliff).

## Pull requests

1. Open a PR against `main`.
2. Describe **what** changed and **why**.
3. Split large changes when possible.
4. Run linters/tests locally:
   - `forge test`, `ruff check app tests`, `pytest`, `npm run lint`, `npm test`, `npm run build` as applicable.

## Code standards

- Never commit `.env` files or secrets.
- Keep PRs focused; avoid unrelated refactors.
- Match existing naming and typing (TypeScript strict, Pydantic v2, Solidity NatSpec where relevant).

## Security

Report vulnerabilities per [SECURITY.md](SECURITY.md), not via public issues.

## License

By contributing, you agree your contribution is licensed under the same terms as the project ([LICENSE](LICENSE)).
