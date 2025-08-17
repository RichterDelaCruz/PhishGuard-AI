from __future__ import annotations
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./app.db"
    # Use the repo-bundled DistilBERT model by default
    EMAIL_MODEL_PATH: str = "models/email"
    RATE_LIMIT: str = "100/hour"
    CORS_ALLOWED_ORIGIN: str = "http://localhost:3000"

    class Config:
        # Only load actual env files; do not include the example file
        # to avoid overriding defaults
        env_file = ("backend/.env", ".env")
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
