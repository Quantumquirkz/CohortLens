"""Application configuration via environment variables."""

import json
import logging
from pathlib import Path

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ChainConfig(BaseModel):
    """Per-chain settings (subgraph + RPC + contracts)."""

    subgraph_url: str
    rpc_url: str
    cohort_oracle_address: str = ""
    cohort_registry_address: str = ""


class Settings(BaseSettings):
    """Settings loaded from environment and .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://cohortlens:cohortlens@localhost:5432/cohortlens"
    REDIS_URL: str = "redis://localhost:6379/0"

    WEB3_RPC: str = "https://polygon-rpc.com"

    SUBGRAPH_URL: str = Field(
        default="http://127.0.0.1:8020/subgraphs/name/cohortlens/aave-v3",
        description="HTTP GraphQL endpoint for the deployed subgraph (fallback if CHAINS_JSON is empty)",
    )
    CHAINS_JSON: str = Field(
        default="",
        description='JSON: {"polygon":{"subgraph_url":"...","rpc_url":"...","cohort_oracle_address":"","cohort_registry_address":""}}',
    )
    DEFAULT_CHAIN: str = "polygon"
    ORACLE_SCAN_CHAIN: str = Field(
        default="polygon",
        description="Chain the Celery worker scans for CohortOracle",
    )
    SUBGRAPH_TIMEOUT_SECONDS: float = 60.0
    SUBGRAPH_PAGE_SIZE: int = 1000

    SEPOLIA_RPC_URL: str = "https://rpc.sepolia.org"
    COHORT_ORACLE_ADDRESS: str = ""
    COHORT_LENS_ID: int = 0

    ORACLE_REQUESTER_PRIVATE_KEY: str = ""
    ORACLE_OWNER_PRIVATE_KEY: str = ""

    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/1")

    ORACLE_SCAN_CHUNK_BLOCKS: int = 2000
    ORACLE_PENDING_TTL_SECONDS: int = 86400
    ORACLE_FROM_BLOCK: int = 0

    IPFS_API_URL: str = "http://127.0.0.1:5001"
    COHORT_REGISTRY_ADDRESS: str = ""
    REGISTRY_UPLOADER_PRIVATE_KEY: str = ""
    MODEL_CACHE_DIR: Path = Field(default=Path("/tmp/cohortlens_models"))
    MAX_UPLOAD_BYTES: int = 50 * 1024 * 1024

    REQUIRE_WALLET_AUTH: bool = False
    RATE_LIMIT_DEFAULT: str = "60/minute"
    RATE_LIMIT_PREDICT: str = "20/minute"

    COHORT_CACHE_TTL_SECONDS: int = Field(
        default=3600,
        description="Redis TTL for POST /cohorts/discover results",
    )

    PROMETHEUS_ENABLED: bool = True

    ENABLE_ZK_PROOF_FOR_ONNX: bool = Field(
        default=False,
        description="If true, async ONNX predictions generate a ZK proof and upload JSON to IPFS",
    )
    EZKL_BINARY: str = Field(
        default="ezkl",
        description="Path or name of the EZKL CLI binary for advanced proving",
    )

    AKASH_CLI_ENABLED: bool = Field(
        default=False,
        description="If true, akash_client may invoke the Akash CLI (advanced operators)",
    )

    def get_chains(self) -> dict[str, ChainConfig]:
        """Logical chain id -> config; backward compatible with a single SUBGRAPH_URL."""
        if self.CHAINS_JSON.strip():
            try:
                raw: dict[str, object] = json.loads(self.CHAINS_JSON)
            except json.JSONDecodeError as e:
                logging.getLogger(__name__).warning("Invalid CHAINS_JSON, using fallback: %s", e)
                raw = {}
            out: dict[str, ChainConfig] = {}
            for k, v in raw.items():
                if isinstance(v, dict):
                    out[str(k).lower()] = ChainConfig.model_validate(v)
            if out:
                return out
        return {
            "polygon": ChainConfig(
                subgraph_url=self.SUBGRAPH_URL,
                rpc_url=self.SEPOLIA_RPC_URL or self.WEB3_RPC,
                cohort_oracle_address=self.COHORT_ORACLE_ADDRESS,
                cohort_registry_address=self.COHORT_REGISTRY_ADDRESS,
            ),
        }


settings = Settings()
