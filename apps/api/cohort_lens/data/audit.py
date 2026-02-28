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
    offset: int = 0,
) -> dict:
    """
    Retrieve audit log entries with pagination, optionally filtered by table and/or record.

    Returns:
        Dict with 'entries' list, 'total' count, 'limit', and 'offset'.
    """
    try:
        engine = get_engine()
        create_schema(engine)

        conditions = []
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if table_name:
            conditions.append("table_name = :table_name")
            params["table_name"] = table_name
        if record_id:
            conditions.append("record_id = :record_id")
            params["record_id"] = record_id

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Get total count
        count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}
        count_query = text(f"SELECT COUNT(*) FROM audit_log {where}")
        total = 0

        query = text(
            f"SELECT id, table_name, record_id, action, old_values, new_values, user_id, created_at "
            f"FROM audit_log {where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        )
        with engine.connect() as conn:
            total_row = conn.execute(count_query, count_params).fetchone()
            total = total_row[0] if total_row else 0

            rows = conn.execute(query, params).fetchall()
            entries = [
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
            return {"entries": entries, "total": total, "limit": limit, "offset": offset}
    except Exception as e:
        logger.warning("Failed to read audit log: %s", e)
        return {"entries": [], "total": 0, "limit": limit, "offset": offset}
