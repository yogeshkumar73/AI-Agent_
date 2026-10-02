from pydantic_settings import BaseSettings
from typing import Optional, List
import os
import tempfile
from dotenv import load_dotenv

# Search for .env in current working dir, backend folder, and root folder
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir))
root_dir = os.path.dirname(backend_dir)

env_candidates = [
    os.path.join(root_dir, ".env"),
    os.path.join(backend_dir, ".env"),
    os.path.join(os.getcwd(), ".env"),
    ".env"
]

for env_path in env_candidates:
    if os.path.exists(env_path):
        load_dotenv(env_path, override=False)

is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME") or os.getenv("LAMBDA_TASK_ROOT"))

class Settings(BaseSettings):
    PROJECT_NAME: str = "DocuMind AI Document Assistant"
    API_V1_STR: str = "/api/v1"
    IS_SERVERLESS: bool = is_serverless
    
    # MongoDB
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "doc_assistant_db")
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "documind_default_jwt_secret_key_change_me_in_prod_9988776655")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))
    
    # CORS
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "*")
    
    # Storage (Adaptive: uses /tmp on Vercel/Serverless, local folder in dev/docker)
    UPLOAD_DIR: str = os.path.join(tempfile.gettempdir(), "documind_uploads") if is_serverless else os.path.join(backend_dir, os.getenv("UPLOAD_DIR", "uploads"))
    
    # AI / LLM Configuration
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "auto")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")

    def get_cors_origins(self) -> List[str]:
        if self.ALLOWED_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
try:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
except Exception:
    pass
