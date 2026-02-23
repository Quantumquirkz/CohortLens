"""IPFS client for decentralized storage of reports and artifacts."""

import json
import os
from typing import Optional

from cohort_lens.utils.logger import get_logger

logger = get_logger(__name__)


def upload_to_ipfs(content: bytes, filename: str = "artifact") -> Optional[str]:
    """
    Upload content to IPFS. Returns CID or None if IPFS not configured.
    Requires IPFS node or Pinata/Infura API.
    """
    api_url = os.environ.get("IPFS_API_URL", "http://127.0.0.1:5001")
    try:
        import requests

        resp = requests.post(
            f"{api_url.rstrip('/')}/api/v0/add",
            files={"file": (filename, content)},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        cid = data.get("Hash") or data.get("cid", {}).get("/")
        if cid:
            logger.info("Uploaded to IPFS: %s", cid)
            return cid
    except Exception as e:
        logger.warning("IPFS upload failed: %s", e)
    return None


def store_ipfs_artifact(cid: str, artifact_type: str, metadata: Optional[dict] = None) -> bool:
    """Store IPFS CID reference in Neon DB (ipfs_artifacts table)."""
    try:
        from cohort_lens.data.db import get_engine, create_schema
        from sqlalchemy import text

        engine = get_engine()
        create_schema(engine)
        with engine.connect() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO ipfs_artifacts (cid, artifact_type, metadata)
                    VALUES (:cid, :artifact_type, :metadata)
                    """
                ),
                {
                    "cid": cid,
                    "artifact_type": artifact_type,
                    "metadata": json.dumps(metadata or {}),
                },
            )
            conn.commit()
        return True
    except Exception as e:
        logger.warning("Failed to store IPFS artifact in DB: %s", e)
        return False
