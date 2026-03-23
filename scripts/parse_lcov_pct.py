#!/usr/bin/env python3
"""Parse Foundry lcov.info and exit 1 if line coverage is below minimum."""

from __future__ import annotations

import sys
from pathlib import Path


def line_coverage_pct(lcov_path: Path) -> float:
    lf = 0
    lh = 0
    for line in lcov_path.read_text(encoding="utf-8", errors="replace").splitlines():
        if line.startswith("LF:"):
            lf += int(line.split(":", 1)[1].strip())
        elif line.startswith("LH:"):
            lh += int(line.split(":", 1)[1].strip())
    if lf == 0:
        return 100.0
    return 100.0 * lh / lf


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: parse_lcov_pct.py <lcov.info> <min_percent>", file=sys.stderr)
        sys.exit(2)
    path = Path(sys.argv[1])
    min_pct = float(sys.argv[2])
    pct = line_coverage_pct(path)
    print(f"Line coverage: {pct:.2f}% (minimum {min_pct}%)")
    if pct + 1e-9 < min_pct:
        sys.exit(1)


if __name__ == "__main__":
    main()
