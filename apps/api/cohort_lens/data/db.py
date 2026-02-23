"""Neon DB (PostgreSQL) abstraction layer for CohortLens."""

from pathlib import Path
from typing import Optional

import pandas as pd
from sqlalchemy import (
    create_engine,
    text,
    MetaData,
    Table,
    Column,
    Integer,
    String,
    Numeric,
    DateTime,
    Boolean,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session

from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)

# Column mapping: DataFrame columns -> DB columns
DF_TO_DB = {
    "CustomerID": "customer_id",
    "Gender": "gender",
    "Age": "age",
    "Annual Income ($)": "annual_income",
    "Spending Score (1-100)": "spending_score",
    "Profession": "profession",
    "Work Experience": "work_experience",
    "Family Size": "family_size",
}

DB_TO_DF = {v: k for k, v in DF_TO_DB.items()}


def get_engine(database_url: Optional[str] = None) -> Engine:
    """Create SQLAlchemy engine for Neon DB."""
    import os

    url = database_url or os.environ.get("NEON_DATABASE_URL")
    if not url:
        raise ValueError(
            "NEON_DATABASE_URL must be set. Example: "
            "postgresql://user:pass@host/dbname?sslmode=require"
        )
    # Ensure sslmode for Neon
    if "sslmode" not in url and "?" not in url:
        url = f"{url}?sslmode=require"
    elif "sslmode" not in url:
        url = f"{url}&sslmode=require"
    return create_engine(url, pool_pre_ping=True)


def get_session(engine: Optional[Engine] = None) -> Session:
    """Get a SQLAlchemy session."""
    eng = engine or get_engine()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=eng)
    return SessionLocal()


def create_schema(engine: Engine) -> None:
    """Create tables if they do not exist."""
    metadata = MetaData()

    Table(
        "customers",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("customer_id", String(50), unique=True, nullable=False, index=True),
        Column("gender", String(20)),
        Column("age", Integer),
        Column("annual_income", Numeric(12, 2), nullable=False),
        Column("spending_score", Integer),
        Column("profession", String(100)),
        Column("work_experience", Integer),
        Column("family_size", Integer),
        Column("created_at", DateTime, server_default=text("NOW()")),
        Column("updated_at", DateTime, server_default=text("NOW()")),
        Column("deleted_at", DateTime, nullable=True),
    )

    Table(
        "segments",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("customer_id", String(50), nullable=False, index=True),
        Column("cluster", Integer, nullable=False),
        Column("model_version", String(50)),
        Column("created_at", DateTime, server_default=text("NOW()")),
    )

    Table(
        "predictions",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("customer_id", String(50), nullable=False, index=True),
        Column("predicted_spending", Numeric(10, 2), nullable=False),
        Column("model_version", String(50)),
        Column("features_snapshot", String),  # JSON as text for simplicity
        Column("created_at", DateTime, server_default=text("NOW()")),
    )

    Table(
        "audit_log",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("table_name", String(100), nullable=False),
        Column("record_id", String(100)),
        Column("action", String(20)),
        Column("old_values", String),  # JSON
        Column("new_values", String),  # JSON
        Column("user_id", String(100)),
        Column("created_at", DateTime, server_default=text("NOW()")),
    )

    Table(
        "user_consents",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("customer_id", String(50), nullable=False, index=True),
        Column("consent_type", String(100), nullable=False),
        Column("granted", Boolean, nullable=False),
        Column("verifiable_credential_id", String(255)),
        Column("created_at", DateTime, server_default=text("NOW()")),
    )

    Table(
        "verifiable_credentials",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("did", String(255), nullable=False),
        Column("credential_type", String(100)),
        Column("payload", String),  # JSON
        Column("revoked", Boolean, nullable=False, server_default=text("false")),
        Column("created_at", DateTime, server_default=text("NOW()")),
    )

    Table(
        "ipfs_artifacts",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("cid", String(100), nullable=False, unique=True),
        Column("artifact_type", String(50)),
        Column("metadata", String),  # JSON
        Column("created_at", DateTime, server_default=text("NOW()")),
    )

    Table(
        "subscriptions",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("tenant_id", String(100), nullable=False, index=True),
        Column("plan", String(50), nullable=False),  # basic, professional, enterprise
        Column("stripe_subscription_id", String(255)),
        Column("limits", String),  # JSON: max_customers, max_api_calls
        Column("starts_at", DateTime),
        Column("ends_at", DateTime),
        Column("created_at", DateTime, server_default=text("NOW()")),
    )

    Table(
        "users",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("username", String(100), unique=True, nullable=False, index=True),
        Column("email", String(255), unique=True, nullable=False),
        Column("hashed_password", String(255), nullable=False),
        Column("is_active", Boolean, server_default=text("true")),
        Column("is_admin", Boolean, server_default=text("false")),
        Column("tenant_id", String(100), index=True),
        Column("last_login", DateTime, nullable=True),
        Column("created_at", DateTime, server_default=text("NOW()")),
    )

    metadata.create_all(engine)
    logger.info("Schema created or already exists")


def load_customers_from_db(
    engine: Optional[Engine] = None,
    database_url: Optional[str] = None,
) -> pd.DataFrame:
    """Load customers from Neon DB into a DataFrame with schema matching loader output."""
    eng = engine or get_engine(database_url)
    query = text(
        """
        SELECT customer_id, gender, age, annual_income, spending_score,
               profession, work_experience, family_size
        FROM customers
        WHERE deleted_at IS NULL
        ORDER BY customer_id
        """
    )
    with eng.connect() as conn:
        df = pd.read_sql(query, conn)
    # Rename to match expected schema (loader/preprocessor)
    df = df.rename(columns=DB_TO_DF)
    df["CustomerID"] = pd.to_numeric(df["CustomerID"], errors="coerce")
    df = df.dropna(subset=["CustomerID"])
    df["CustomerID"] = df["CustomerID"].astype(int)
    # Ensure numeric types
    df["Annual Income ($)"] = pd.to_numeric(df["Annual Income ($)"], errors="coerce")
    return df


def upsert_customers(
    df: pd.DataFrame,
    engine: Optional[Engine] = None,
) -> int:
    """Upsert customers into Neon DB. Returns number of rows upserted."""
    eng = engine or get_engine()
    create_schema(eng)

    # Map DataFrame columns to DB columns
    rows = []
    for _, row in df.iterrows():
        cid = str(row.get("CustomerID", row.get("customer_id", "")))
        rows.append({
            "customer_id": cid,
            "gender": str(row.get("Gender", row.get("gender", ""))),
            "age": int(row.get("Age", row.get("age", 0))),
            "annual_income": float(row.get("Annual Income ($)", row.get("annual_income", 0))),
            "spending_score": int(row.get("Spending Score (1-100)", row.get("spending_score", 0))),
            "profession": str(row.get("Profession", row.get("profession", ""))),
            "work_experience": int(row.get("Work Experience", row.get("work_experience", 0))),
            "family_size": int(row.get("Family Size", row.get("family_size", 1))),
        })

    with eng.connect() as conn:
        for r in rows:
            conn.execute(
                text("""
                INSERT INTO customers (customer_id, gender, age, annual_income, spending_score,
                                      profession, work_experience, family_size)
                VALUES (:customer_id, :gender, :age, :annual_income, :spending_score,
                        :profession, :work_experience, :family_size)
                ON CONFLICT (customer_id) DO UPDATE SET
                    gender = EXCLUDED.gender,
                    age = EXCLUDED.age,
                    annual_income = EXCLUDED.annual_income,
                    spending_score = EXCLUDED.spending_score,
                    profession = EXCLUDED.profession,
                    work_experience = EXCLUDED.work_experience,
                    family_size = EXCLUDED.family_size,
                    updated_at = NOW()
                """),
                r,
            )
        conn.commit()

    logger.info("Upserted %d customers to Neon DB", len(rows))
    return len(rows)
