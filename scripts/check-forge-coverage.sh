#!/usr/bin/env bash
# Run Foundry coverage and fail if line coverage is below MIN_COVERAGE_PCT (default 50).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIN="${MIN_COVERAGE_PCT:-50}"

cd "$ROOT/packages/contracts"
forge coverage --report lcov --report-file lcov.info
python3 "$ROOT/scripts/parse_lcov_pct.py" lcov.info "$MIN"
