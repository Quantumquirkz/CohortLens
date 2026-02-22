"""Pandera schemas for data validation."""

import pandera as pa

customer_schema = pa.DataFrameSchema(
    {
        "CustomerID": pa.Column(int, checks=pa.Check.greater_than(0)),
        "Gender": pa.Column(str),
        "Age": pa.Column(int, checks=pa.Check.between(18, 100)),
        "Annual Income ($)": pa.Column(float, checks=pa.Check.greater_than(0)),
        "Spending Score (1-100)": pa.Column(int, checks=pa.Check.between(0, 100)),
        "Profession": pa.Column(str),
        "Work Experience": pa.Column(int, checks=pa.Check.greater_than_or_equal_to(0)),
        "Family Size": pa.Column(int, checks=pa.Check.greater_than(0)),
    },
    strict=False,
)
