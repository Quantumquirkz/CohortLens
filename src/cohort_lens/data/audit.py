"""Audit log for tracking all CRUD operations in CohortLens."""

import json
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import text

from cohort_lens.data.db import get_engine, create_schema
from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)


def write_audit_log(
    table_name: str,
    record_id: str,
    action: str,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    user_id: Optional[str] = None,
) -> bool:
    """
    Write an entry to the audit_log table.

    Args:
        table_name: The table being modified (e.g. 'customers', 'user_consents').
        record_id: The primary key or identifier of the affected record.
        action: One of 'INSERT', 'UPDATE', 'DELETE'.
        old_values: Previous values (for UPDATE/DELETE).
        new_values: New values (for INSERT/UPDATE).
        user_id: The authenticated user performing the action.

    Returns:
        True on success, False on failure.
    """
    try:
        engine = get_engine()
        create_schema(engine)
        with engine.connect() as conn:
            conn.execute(
                text("""
                INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_id)
                VALUES (:table_name, :record_id, :action, :old_values, :new_values, :user_id)
                """),
                {
                    "table_name": table_name,
                    "record_id": str(record_id),
                    "action": action.upper(),
                    "old_values": json.dumps(old_values) if old_values else None,
                    "new_values": json.dumps(new_values) if new_values else None,
                    "user_id": user_id,
                },
            )
            conn.commit()
        logger.debug("Audit log: %s %s.%s by %s", action, table_name, record_id, user_id)
        return True
    except Exception as e:
        logger.warning("Failed to write audit log: %s", e)
        return False


def get_audit_log(
    table_name: Optional[str] = None,
    record_id: Optional[str] = None,
    limit: int = 100,
) -> list[dict]:
    """
    Retrieve audit log entries, optionally filtered by table and/or record.

    Returns:
        List of audit log entries as dicts.
    """
    try:
        engine = get_engine()
        create_schema(engine)

        conditions = []
        params: dict[str, Any] = {"limit": limit}
        if table_name:
            conditions.append("table_name = :table_name")
            params["table_name"] = table_name
        if record_id:
            conditions.append("record_id = :record_id")
            params["record_id"] = record_id

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        query = text(
            f"SELECT id, table_name, record_id, action, old_values, new_values, user_id, created_at "
            f"FROM audit_log {where} ORDER BY created_at DESC LIMIT :limit"
        )
        with engine.connect() as conn:
            rows = conn.execute(query, params).fetchall()
            return [
                {
                    "id": row[0],
                    "table_name": row[1],
                    "record_id": row[2],
                    "action": row[3],
                    "old_values": json.loads(row[4]) if row[4] else None,
                    "new_values": json.loads(row[5]) if row[5] else None,
                    "user_id": row[6],
                    "created_at": str(row[7]),
                }
                for row in rows
            ]
    except Exception as e:
        logger.warning("Failed to read audit log: %s", e)
        return []
