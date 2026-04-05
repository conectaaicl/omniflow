from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "OmniFlow SaaS"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "change-this-secret-in-production-min-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    CORS_ORIGINS: str = "*"
    WHATSAPP_VERIFY_TOKEN: str = "omniflow_verify_token"
    N8N_API_SECRET: str = ""

    # Platform superadmin bootstrap (set in .env to auto-create on first boot)
    SUPERADMIN_EMAIL: Optional[str] = None
    SUPERADMIN_PASSWORD: Optional[str] = None

    # Email — Resend (for password reset)
    RESEND_API_KEY: Optional[str] = None
    FROM_EMAIL: str = "OmniFlow <onboarding@resend.dev>"

    # Mercado Pago
    MP_ACCESS_TOKEN: Optional[str] = None
    MP_PUBLIC_KEY: Optional[str] = None
    FRONTEND_URL: str = "https://osw.conectaai.cl"
    BACKEND_URL: str = "https://osw.conectaai.cl"

    REDIS_URL: str = "redis://omniflow_redis:6379/0"

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

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()
