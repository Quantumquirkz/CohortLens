"""Data loading, preprocessing, and persistence for CohortLens."""
from cohort_lens.data.loader import load_customers
from cohort_lens.data.preprocessor import clean_customers, encode_for_prediction

try:
    from cohort_lens.data.db import (
        load_customers_from_db,
        upsert_customers,
        create_schema,
        get_engine,
    )
    from cohort_lens.data.audit import write_audit_log, get_audit_log
    from cohort_lens.data.persistence import (
        persist_segments,
        persist_prediction,
        persist_predictions_batch,
        set_model_version,
        get_model_version,
    )
    from cohort_lens.data.drift import check_drift, save_baseline

    __all__ = [
        "load_customers",
        "clean_customers",
        "encode_for_prediction",
        "load_customers_from_db",
        "upsert_customers",
        "create_schema",
        "get_engine",
        "write_audit_log",
        "get_audit_log",
        "persist_segments",
        "persist_prediction",
        "persist_predictions_batch",
        "set_model_version",
        "get_model_version",
        "check_drift",
        "save_baseline",
    ]
except ImportError:
    __all__ = ["load_customers", "clean_customers", "encode_for_prediction"]
