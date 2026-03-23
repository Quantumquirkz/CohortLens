"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Settings loaded from environment and .env file."""

    DATABASE_URL: str = "postgresql://user:pass@localhost/db"
    REDIS_URL: str = "redis://localhost:6379"
    WEB3_RPC: str = "https://polygon-rpc.com"

    class Config:
        env_file = ".env"


settings = Settings()
