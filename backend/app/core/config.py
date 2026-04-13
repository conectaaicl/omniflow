from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "OmniFlow SaaS"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "change-this-secret-in-production-min-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    CORS_ORIGINS: str = "*"

    # Platform superadmin bootstrap
    SUPERADMIN_EMAIL: Optional[str] = None
    SUPERADMIN_PASSWORD: Optional[str] = None

    # URLs
    FRONTEND_URL: str = "https://osw.conectaai.cl"
    BACKEND_URL: str = "https://osw.conectaai.cl"

    # Redis
    REDIS_URL: str = "redis://omniflow_redis:6379/0"

    # PostgreSQL
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "omniflow"
    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    # MailSaaS integration
    MAILSAAS_URL: str = "https://mail.conectaai.cl"
    MAILSAAS_API_KEY: str = ""

    @property
    def database_url(self) -> str:
        if self.SQLALCHEMY_DATABASE_URI:
            return self.SQLALCHEMY_DATABASE_URI
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

    # Meta / WhatsApp
    META_APP_ID: str = ""
    GROQ_API_KEY: str = ""
    META_APP_SECRET: str = ""
    WHATSAPP_VERIFY_TOKEN: str = "omniflow_verify_token"
    META_WEBHOOK_SECRET: str = ""   # for X-Hub-Signature-256 validation

    # Encryption (Fernet key — generate: python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
    ENCRYPTION_KEY: str = ""

    # n8n
    N8N_URL: str = "http://omniflow_n8n:5678"
    N8N_API_KEY: str = ""
    N8N_API_SECRET: str = ""

    # Email via mail.conectaai.cl
    MAILSAAS_URL: str = "https://mail.conectaai.cl"
    MAILSAAS_API_KEY: str = ""
    FROM_EMAIL: str = "OmniFlow <noreply@omniflow.cl>"

    # Mercado Pago
    MP_ACCESS_TOKEN: Optional[str] = None
    MP_PUBLIC_KEY: Optional[str] = None

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")


settings = Settings()
