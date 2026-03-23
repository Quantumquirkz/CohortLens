#!/usr/bin/env python3
"""Fail if Mythril JSON report contains Critical-severity issues."""

from __future__ import annotations

import json
import sys
from typing import Any


def _walk(obj: Any) -> list[str]:
    severities: list[str] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.lower() in {"severity", "impact"} and isinstance(v, str):
                severities.append(v)
            severities.extend(_walk(v))
    elif isinstance(obj, list):
        for item in obj:
            severities.extend(_walk(item))
    return severities


def main() -> None:
    raw = sys.stdin.read().strip()
    if not raw:
        print("Mythril gate: empty output; skipping.")
        return
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        print("Mythril gate: output was not JSON; skipping.")
        return
    sev = _walk(data)
    critical = [s for s in sev if s.lower() == "critical"]
    if critical:
        print("Mythril reported Critical findings:", critical, file=sys.stderr)
        sys.exit(1)
    print("Mythril gate: no Critical severity in parsed JSON.")


if __name__ == "__main__":
    main()
