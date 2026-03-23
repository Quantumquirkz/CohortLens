"""Resolve per-chain configuration (subgraph, RPC, contracts)."""

from __future__ import annotations

from app.core.config import ChainConfig, settings


class ChainManagerError(ValueError):
    """Unknown chain or incomplete configuration."""


def list_chain_ids() -> list[str]:
    """Configured chain identifiers (lowercase)."""
    return sorted(settings.get_chains().keys())


def get_chain_config(chain_id: str) -> ChainConfig:
    """Return configuration for ``chain_id`` (e.g. ``polygon``)."""
    key = chain_id.lower().strip()
    chains = settings.get_chains()
    if key not in chains:
        available = ", ".join(sorted(chains)) or "(none)"
        msg = f"Unknown chain: {chain_id!r}. Available: {available}"
        raise ChainManagerError(msg)
    return chains[key]


def is_oracle_configured_for_chain(chain: ChainConfig) -> bool:
    """True if RPC + oracle are set and we can record a request (user-paid tx or server key)."""
    if not chain.rpc_url or not chain.cohort_oracle_address:
        return False
    if settings.REQUIRE_LENS_PAYMENT_FOR_DISCOVER:
        return True
    return bool(settings.ORACLE_REQUESTER_PRIVATE_KEY)
