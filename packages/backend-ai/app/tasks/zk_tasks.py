"""ZK proof generation tasks (zk_tasks queue)."""

from __future__ import annotations

from typing import Any

from app.models.zk_prover import ZkProverError, generate_proof_bundle
from app.tasks.base import BaseRetryTask
from app.tasks.celery_app import celery_app


@celery_app.task(
    bind=True,
    base=BaseRetryTask,
    name="app.tasks.zk_tasks.run_zk_proof_task",
)
def run_zk_proof_task(
    self: BaseRetryTask,
    lens_id: int,
    model_onnx_path: str,
    input_vector: list[float],
    output_dict: dict[str, Any],
) -> dict[str, Any]:
    """Generate proof, upload bundle to IPFS, return metadata."""
    try:
        return generate_proof_bundle(
            lens_id=lens_id,
            model_onnx_path=model_onnx_path,
            input_data=input_vector,
            output_data=output_dict,
        )
    except ZkProverError as e:
        return {"ok": False, "error": str(e), "lens_id": lens_id}
