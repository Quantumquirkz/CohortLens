"""Celery tasks: oracle event scan and fulfill."""

from __future__ import annotations

import redis

from app.core.config import settings
from app.services.blockchain_client import fulfill_request, get_oracle_contract, get_web3
from app.services.chain_manager import ChainManagerError, get_chain_config
from app.tasks.base import OracleScanTask
from app.tasks.celery_app import celery_app


def _args_from_event(decoded: object) -> dict:
    if isinstance(decoded, dict):
        raw = decoded.get("args")
        if isinstance(raw, dict):
            return raw
    args = getattr(decoded, "args", None)
    if args is not None:
        if isinstance(args, dict):
            return args
        rid = getattr(args, "requestId", None)
        if rid is not None:
            return {"requestId": rid}
    return {}


@celery_app.task(
    bind=True,
    base=OracleScanTask,
    name="app.tasks.oracle_tasks.scan_and_fulfill_oracle",
)
def scan_and_fulfill_oracle(self: OracleScanTask) -> str:
    if not settings.ORACLE_OWNER_PRIVATE_KEY:
        return "skipped: missing ORACLE_OWNER_PRIVATE_KEY"
    try:
        chain = get_chain_config(settings.ORACLE_SCAN_CHAIN)
    except ChainManagerError as e:
        return f"skipped: invalid oracle chain: {e}"
    if not chain.cohort_oracle_address:
        return "skipped: missing cohort_oracle_address for scan chain"

    w3 = get_web3(chain.rpc_url)
    contract = get_oracle_contract(w3, chain.cohort_oracle_address)
    r = redis.from_url(settings.REDIS_URL)

    last_key = "oracle:last_scanned_block"
    lb_raw = r.get(last_key)
    latest = int(w3.eth.block_number)

    if lb_raw is None:
        from_block = settings.ORACLE_FROM_BLOCK
    else:
        from_block = int(lb_raw) + 1

    span = settings.ORACLE_SCAN_CHUNK_BLOCKS
    to_block = min(from_block + span - 1, latest)

    if from_block > latest:
        return "no new blocks"

    ev = contract.events.PredictionRequested
    raw_logs = ev.get_logs(from_block=from_block, to_block=to_block)

    fulfilled = 0
    for log in raw_logs:
        decoded = contract.events.PredictionRequested().process_log(log)
        args = _args_from_event(decoded)
        request_id = int(args["requestId"])
        done_key = f"oracle:fulfilled:{request_id}"
        if r.get(done_key):
            continue
        pending = r.get(f"oracle:pending:{request_id}")
        if not pending:
            continue
        fulfill_request(
            w3,
            contract,
            settings.ORACLE_OWNER_PRIVATE_KEY,
            request_id,
            pending,
        )
        r.setex(done_key, settings.ORACLE_PENDING_TTL_SECONDS, "1")
        r.delete(f"oracle:pending:{request_id}")
        fulfilled += 1

    r.set(last_key, str(to_block))
    return f"blocks {from_block}-{to_block} logs={len(raw_logs)} fulfilled={fulfilled}"
