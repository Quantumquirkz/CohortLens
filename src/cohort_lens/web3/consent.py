"""Consent management for SSI/DID - user consent registration and verification."""

from typing import Optional

from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)


def register_consent(
    customer_id: str,
    consent_type: str,
    granted: bool,
    verifiable_credential_id: Optional[str] = None,
) -> bool:
    """Register user consent in Neon DB."""
    try:
        from cohort_lens.data.db import get_engine, create_schema
        from sqlalchemy import text

        engine = get_engine()
        create_schema(engine)
        with engine.connect() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO user_consents (customer_id, consent_type, granted, verifiable_credential_id)
                    VALUES (:customer_id, :consent_type, :granted, :vc_id)
                    """
                ),
                {
                    "customer_id": customer_id,
                    "consent_type": consent_type,
                    "granted": granted,
                    "vc_id": verifiable_credential_id,
                },
            )
            conn.commit()
        return True
    except Exception as e:
        logger.warning("Failed to register consent: %s", e)
        return False


def revoke_consent(customer_id: str, consent_type: str) -> bool:
    """Revoke consent by inserting a new record with granted=False."""
    return register_consent(customer_id, consent_type, granted=False)


def get_consent_status(customer_id: str, consent_type: Optional[str] = None) -> list:
    """Get consent status for a customer."""
    try:
        from cohort_lens.data.db import get_engine, create_schema
        from sqlalchemy import text

        engine = get_engine()
        create_schema(engine)
        if consent_type:
            q = text(
                "SELECT consent_type, granted, created_at FROM user_consents "
                "WHERE customer_id = :cid AND consent_type = :ct ORDER BY created_at DESC LIMIT 1"
            )
            params = {"cid": customer_id, "ct": consent_type}
        else:
            q = text(
                "SELECT consent_type, granted, created_at FROM user_consents "
                "WHERE customer_id = :cid ORDER BY created_at DESC"
            )
            params = {"cid": customer_id}
        with engine.connect() as conn:
            r = conn.execute(q, params)
            return [{"consent_type": row[0], "granted": row[1], "created_at": str(row[2])} for row in r]
    except Exception as e:
        logger.warning("Failed to get consent: %s", e)
        return []
