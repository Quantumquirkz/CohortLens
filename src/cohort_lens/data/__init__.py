"""Data loading and preprocessing for CohortLens."""
from cohort_lens.data.loader import load_customers
from cohort_lens.data.preprocessor import clean_customers, encode_for_prediction

try:
    from cohort_lens.data.db import (
        load_customers_from_db,
        upsert_customers,
        create_schema,
        get_engine,
    )
    __all__ = [
        "load_customers",
        "clean_customers",
        "encode_for_prediction",
        "load_customers_from_db",
        "upsert_customers",
        "create_schema",
        "get_engine",
    ]
except ImportError:
    __all__ = ["load_customers", "clean_customers", "encode_for_prediction"]
