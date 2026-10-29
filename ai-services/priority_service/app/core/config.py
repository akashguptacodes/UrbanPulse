from pathlib import Path
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Path to the priority service's own .env file
SERVICE_ROOT_ENV = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    SERVICE_NAME: str = Field(
        default="priority_service",
        validation_alias=AliasChoices("SERVICE_NAME", "PRIORITY_SERVICE_NAME"),
    )
    VERSION: str = Field(
        default="0.1.0",
        validation_alias=AliasChoices("VERSION", "PRIORITY_SERVICE_VERSION"),
    )
    HOST: str = Field(
        default="127.0.0.1",
        validation_alias=AliasChoices("HOST", "PRIORITY_SERVICE_HOST"),
    )
    PORT: int = Field(
        default=8002,
        validation_alias=AliasChoices("PORT", "PRIORITY_SERVICE_PORT"),
    )
    ENVIRONMENT: str = Field(
        default="development",
        validation_alias=AliasChoices("ENVIRONMENT", "PRIORITY_SERVICE_ENVIRONMENT", "NODE_ENV"),
    )

    model_config = SettingsConfigDict(
        env_file=[SERVICE_ROOT_ENV, ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
