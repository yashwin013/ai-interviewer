from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    MONGO_URI: str
    DB_NAME: str
    AI_AGENT_URL: str
    
    # NEW — required for JWT authentication
    JWT_SECRET: str

    # Pydantic v2 config
    model_config = {
        "env_file": ".env",
        "extra": "ignore"   # ignore extra unknown fields
    }


@lru_cache
def get_settings():
    return Settings()


settings = get_settings()
