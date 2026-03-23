# Contributing to CohortLens

Thank you for your interest. This document outlines the basic flow for reporting issues and proposing changes.

## Reporting issues

- Search the repository to avoid duplicates.
- Include a clear title and steps to reproduce (commands, environment: OS, Node/Python/Docker versions).
- If applicable, attach logs or screenshots without secrets (never paste private keys, real `.env` values, or tokens).

## Branches and commits

- Prefix branches with the type of change when appropriate, e.g. `feat/`, `fix/`, `docs/`.
- Write commit messages in present tense and keep them concise (e.g. "Add health check endpoint").

## Pull requests

1. Open a PR against the project's main branch.
2. Describe **what** changed and **why** (brief context).
3. If the change is large, consider splitting it into smaller PRs.
4. Ensure new code follows project standards (when linters or formatters exist, run them before submitting).

## Code standards

- Do not include `.env` files or secrets in the repository.
- Keep changes focused on the PR objective; avoid unrelated mass refactors.
- When the project adds format tools (Prettier, Ruff, `forge fmt`, etc.), use them consistently.

## License

By contributing, you agree that your contribution will be published under the same license as the project ([LICENSE](LICENSE)).
