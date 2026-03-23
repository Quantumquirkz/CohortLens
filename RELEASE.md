# Release process

## Semantic versioning

- **Contracts / apps**: use **SemVer** tags `vMAJOR.MINOR.PATCH` (e.g. `v1.2.0`).
- **Pre-releases**: use `v1.2.0-rc.1` or GitHub **pre-release** with the `prerelease` flag for testnet / staging.

## Changelog with git-cliff

1. Install [git-cliff](https://github.com/orhun/git-cliff): `cargo install git-cliff` or use a release binary.
2. Configure via [cliff.toml](cliff.toml) at the repository root.
3. Generate notes:

   ```bash
   git cliff --latest --strip all
   ```

4. Paste the output into the GitHub Release description (or use `git cliff --latest` in CI as an artifact).

## Cutting a release

1. Ensure `main` is green (**CI** workflow passing).
2. Update version strings where appropriate (e.g. FastAPI `version=` in `packages/backend-ai/app/main.py`, package `version` fields).
3. Create an annotated tag:

   ```bash
   git tag -a v1.2.0 -m "Release v1.2.0"
   git push origin v1.2.0
   ```

4. On GitHub, **Draft a new release** from the tag, attach artifacts if needed, and publish.
5. **CD** workflows may deploy frontend (Vercel) or run optional IPFS steps when secrets are configured.

## npm / PyPI

This monorepo does not publish public npm or PyPI packages by default. If you add publishable libraries under `packages/`, document registry names here and add `npm publish` / `twine upload` steps to CI with trusted publishing.
