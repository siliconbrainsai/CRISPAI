"""
Enterprise Configuration & Environment Settings for CRISP AI 3.0
Loads configurations from environment variables or .env file with validation.
"""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App Information
    APP_NAME: str = "CRISP Causal AI Enterprise Backend"
    APP_VERSION: str = "3.0.0"
    ENVIRONMENT: str = "development" # development, testing, production
    DEBUG: bool = False

    # Database Configuration (Supports SQLite local & PostgreSQL production)
    DATABASE_URL: str = "sqlite:///./crisp_ai.db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_PRE_PING: bool = True
    DB_POOL_RECYCLE_SECONDS: int = 3600

    # Authentication & JWT Security
    JWT_SECRET_KEY: str = "crisp_ai_enterprise_super_secret_jwt_key_2026_dev_only"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours

    # File Storage & Upload Limits
    MAX_UPLOAD_SIZE_MB: int = 50
    STORAGE_BACKEND: str = "local" # local or s3
    STORAGE_LOCAL_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
    
    # S3 Object Storage (for Production)
    S3_BUCKET: str = ""
    S3_ENDPOINT_URL: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"

    # Distributed Job Queue (Redis / Celery) & Workers
    REDIS_URL: Optional[str] = None
    WORKER_CONCURRENCY: int = 4

    # CORS & Network Security
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]

    @property
    def PROJECT_NAME(self) -> str:
        return self.APP_NAME

    @property
    def VERSION(self) -> str:
        return self.APP_VERSION

    @property
    def LOCAL_STORAGE_DIR(self) -> str:
        return self.STORAGE_LOCAL_DIR

    @property
    def S3_BUCKET_NAME(self) -> str:
        return self.S3_BUCKET

    @property
    def cors_origins_list(self) -> List[str]:
        return self.CORS_ORIGINS

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
