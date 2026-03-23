---
sidebar_position: 8
---

# Security overview

## CI tooling

The [CI workflow](https://github.com/Quantumquirkz/CohortLens/actions/workflows/ci.yml) runs:

| Tool | Role |
|------|------|
| **Slither** | Static analysis; fails the job on **High** severity findings (`--fail-high`). |
| **Mythril** | Symbolic analysis on a sample contract; gated for **Critical** when JSON output parses; job is allowed to not block merges if the tool errors (see workflow). |
| **forge coverage** | Line coverage gate via `scripts/check-forge-coverage.sh` (`MIN_COVERAGE_PCT`, default 45% in CI). |

## Preliminary audit log

| Date | Commit | Notes |
|------|--------|-------|
| _TBD_ | _local / CI run_ | Fill after running Slither/Mythril locally or from Actions artifacts. |

### Maintainer checklist

1. Run `forge test` and `forge coverage` in `packages/contracts`.
2. Run `slither . --fail-high` after `forge build`.
3. Optionally run Mythril with a bounded timeout on upgraded contracts.
4. Record high/critical findings and mitigations in this table.

| Finding | Severity | Mitigation |
|---------|----------|------------|
| _None recorded_ | — | — |

## Reporting

Follow the root [SECURITY.md](https://github.com/Quantumquirkz/CohortLens/blob/main/SECURITY.md) policy for coordinated disclosure.
