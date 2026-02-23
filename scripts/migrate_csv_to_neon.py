#!/usr/bin/env python3
"""Migrate Customers.csv to Neon DB.

Usage:
    python scripts/migrate_csv_to_neon.py [path_to_csv]

Requires NEON_DATABASE_URL in environment.
"""

import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv

load_dotenv(project_root / ".env")


def main():
    if not os.environ.get("NEON_DATABASE_URL"):
        print("Error: NEON_DATABASE_URL must be set in .env or environment")
        sys.exit(1)

    csv_path = sys.argv[1] if len(sys.argv) > 1 else None

    from cohort_lens.data.loader import load_customers
    from cohort_lens.data.preprocessor import clean_customers
    from cohort_lens.data.db import upsert_customers, create_schema, get_engine

    df = load_customers(path=csv_path)
    df = clean_customers(df)
    engine = get_engine()
    create_schema(engine)
    n = upsert_customers(df, engine=engine)
    print(f"Migrated {n} customers to Neon DB.")


if __name__ == "__main__":
    main()
