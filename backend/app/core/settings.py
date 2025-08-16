from __future__ import annotations
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./app.db"
    EMAIL_MODEL_PATH: str = "/path/to/distilbert"
    RATE_LIMIT: str = "100/hour"
    CORS_ALLOWED_ORIGIN: str = "http://localhost:3000"

    class Config:
        env_file = (".env", "backend/.env", "backend/.env.example")
        extra = "ignore"

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
