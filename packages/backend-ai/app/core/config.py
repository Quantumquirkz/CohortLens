"""Application configuration via environment variables."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings loaded from environment and .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://user:pass@localhost/db"
    REDIS_URL: str = "redis://localhost:6379/0"

    WEB3_RPC: str = "https://polygon-rpc.com"

    SUBGRAPH_URL: str = Field(
        default="http://127.0.0.1:8020/subgraphs/name/cohortlens/aave-v3",
        description="HTTP GraphQL endpoint for the deployed subgraph",
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


settings = Settings()
