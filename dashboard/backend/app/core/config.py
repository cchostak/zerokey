import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """ZeroKey Dashboard & Control Plane Application Settings."""

    PROJECT_NAME: str = "ZeroKey Control Plane API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # SPIRE & SPIFFE Configuration
    TRUST_DOMAIN: str = os.getenv("TRUST_DOMAIN", "demo.local")
    SPIRE_SERVER_SOCKET: str = os.getenv(
        "SPIRE_SERVER_SOCKET", "/run/spire/server-sockets/api.sock"
    )
    SPIRE_SERVER_CONTAINER: str = os.getenv("SPIRE_SERVER_CONTAINER", "spire-server")
    SPIRE_SERVER_HOST: str = os.getenv("SPIRE_SERVER_HOST", "spire-server")
    SPIRE_SERVER_PORT: int = int(os.getenv("SPIRE_SERVER_PORT", "8081"))

    # OIDC Provider
    OIDC_INTERNAL_URL: str = os.getenv("OIDC_INTERNAL_URL", "http://spire-oidc:8080")
    OIDC_EXTERNAL_URL: str = os.getenv("OIDC_EXTERNAL_URL", "http://localhost:8088")

    # Workload Services
    BACKEND_API_URL: str = os.getenv("BACKEND_API_URL", "https://backend-api:8443")
    CLIENT_WORKER_CONTAINER: str = os.getenv("CLIENT_WORKER_CONTAINER", "client-worker")

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
