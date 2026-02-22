"""Tests for data loader."""
import pytest
from pathlib import Path
import pandas as pd
from cohort_lens.data.loader import load_customers
from cohort_lens.data.schemas import customer_schema

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "customers_sample.csv"

def test_load_customers_success():
    df = load_customers(FIXTURE_PATH, validate=True)
    assert not df.empty
    assert len(df) >= 3
    assert "CustomerID" in df.columns

def test_load_customers_schema_validation():
    df = load_customers(FIXTURE_PATH, validate=True)
    customer_schema.validate(df)

def test_load_customers_file_not_found():
    with pytest.raises(FileNotFoundError):
        load_customers("/nonexistent/path.csv")
