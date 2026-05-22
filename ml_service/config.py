"""
AIM Marketplace — ML Microservice Configuration.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "AIM ML Service"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8100

    # Django backend URL for callbacks
    DJANGO_BACKEND_URL: str = "http://localhost:8000/api"
    DJANGO_SERVICE_TOKEN: str = ""

    # Model paths
    SPACY_MODEL: str = "en_core_web_sm"
    SENTENCE_MODEL: str = "all-MiniLM-L6-v2"

    # Redis for caching embeddings
    REDIS_URL: str = "redis://localhost:6379/2"

    # Thresholds
    DUPLICATE_SIMILARITY_THRESHOLD: float = 0.85
    AI_DETECTION_PERPLEXITY_THRESHOLD: float = 15.0
    CHEAT_RISK_HIGH_THRESHOLD: float = 70.0
    QUALIFICATION_PASS_THRESHOLD: float = 50.0

    class Config:
        env_prefix = "AIM_ML_"
        env_file = ".env"


settings = Settings()
