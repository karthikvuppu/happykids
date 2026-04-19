from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database — set DATABASE_URL env var on Render to the PostgreSQL connection string
    DATABASE_URL: str = "sqlite:///./happykids.db"

    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Hospital In-Patient Management System"

    # Security — always set SECRET_KEY via env var in production
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS — set FRONTEND_URL env var to your Render frontend URL
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        origins = [self.FRONTEND_URL, "http://localhost:3000", "http://localhost:8080"]
        return list(set(origins))

    class Config:
        env_file = ".env"

settings = Settings()
