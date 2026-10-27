from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SERVICE_NAME: str = "duplicate_service"
    VERSION: str = "0.1.0"
    HOST: str = "127.0.0.1"
    PORT: int = 8001
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(env_prefix="DUPLICATE_SERVICE_", extra="ignore")


settings = Settings()
