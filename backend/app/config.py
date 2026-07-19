from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional, Any
import os
import json
from datetime import timedelta

class Settings(BaseSettings):
    # API Configuration
    API_TITLE: str = "Fitness AI API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "AI-powered personalized fitness and health recommendation system"
    DEBUG: bool = False
    
    # Database Configuration
    
    DATABASE_URL: str = "mongodb://localhost:27017/fitness_app"
    MONGO_DB_NAME: str = "fitness_app"
    # Security Configuration
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://fitness-ai-ten-sigma.vercel.app",
    "https://fitness-f8h191twk-shop-wise-ai.vercel.app",
]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed]
                except Exception:
                    pass
            return [item.strip() for item in v.split(",") if item.strip()]
        elif isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        return v

    CORS_CREDENTIALS: bool = True
    CORS_METHODS: List[str] = ["*"]
    CORS_HEADERS: List[str] = ["*"]
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60
    
    # AI Model Configuration
    AI_MODEL_PATH: str = "app/ai/models"
    RECOMMENDATION_THRESHOLD: float = 0.7
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    
    # Email Configuration
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    
    # File Upload Configuration
    MAX_UPLOAD_SIZE: int = 5242880  # 5MB
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "gif"]
    UPLOAD_DIR: str = "uploads"
    
    # Admin Configuration
    ADMIN_EMAIL: str = "admin@fitnesshq.com"
    ADMIN_PASSWORD: str = "admin123"
    
    # Environment
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    
    # Timezone
    TIMEZONE: str = "UTC"
    
    # Token expiration times
    ACCESS_TOKEN_EXPIRE: timedelta = timedelta(minutes=30)
    REFRESH_TOKEN_EXPIRE: timedelta = timedelta(days=7)
    PASSWORD_RESET_EXPIRE: timedelta = timedelta(hours=24)
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
