from pydantic_settings import BaseSettings
from typing import Optional, List
import os
import tempfile
from dotenv import load_dotenv

# ── .env discovery ────────────────────────────────────────────────────
current_dir = os.path.dirname(os.path.abspath(__file__))   # core/
app_dir     = os.path.dirname(current_dir)                 # app/
backend_dir = os.path.dirname(app_dir)                     # backend/
root_dir    = os.path.dirname(backend_dir)                 # project root

for env_path in [
    os.path.join(root_dir,    ".env"),
    os.path.join(backend_dir, ".env"),
    os.path.join(os.getcwd(), ".env"),
    ".env",
]:
    if os.path.exists(env_path):
        load_dotenv(env_path, override=False)

# Detect serverless / cloud environments
is_serverless = bool(
    os.getenv("VERCEL")
    or os.getenv("VERCEL_ENV")
    or os.getenv("AWS_LAMBDA_FUNCTION_NAME")
    or os.getenv("LAMBDA_TASK_ROOT")
    or os.getenv("NETLIFY")
)


class Settings(BaseSettings):
    PROJECT_NAME: str = "DocuMind AI Document Assistant"
    API_V1_STR:   str = "/api/v1"
    IS_SERVERLESS: bool = is_serverless

    # MongoDB
    MONGODB_URL:   str = os.getenv("MONGODB_URL",   "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "doc_assistant_db")

    # Security
    JWT_SECRET:    str = os.getenv(
        "JWT_SECRET",
        "documind_default_jwt_secret_key_change_me_in_prod_9988776655",
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24))
    )

    # Rate Limiting
    RATE_LIMIT_ENABLED:  bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() in ("true", "1", "yes")
    RATE_LIMIT_REQUESTS: int  = int(os.getenv("RATE_LIMIT_REQUESTS", "300"))
    RATE_LIMIT_WINDOW:   int  = int(os.getenv("RATE_LIMIT_WINDOW",   "60"))

    # CORS
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "*")

    # Storage — /tmp on serverless, local uploads/ in dev
    UPLOAD_DIR: str = (
        os.path.join(tempfile.gettempdir(), "documind_uploads")
        if is_serverless
        else os.path.join(backend_dir, os.getenv("UPLOAD_DIR", "uploads"))
    )

    # AI / LLM
    AI_PROVIDER:    str           = os.getenv("AI_PROVIDER", "auto")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")

    def get_cors_origins(self) -> List[str]:
        if self.ALLOWED_ORIGINS == "*":
            return ["*"]
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra    = "ignore"


settings = Settings()

# Create upload dir — safe to fail on serverless (uses /tmp which always exists)
try:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
except Exception:
    pass
