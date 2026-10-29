from pathlib import Path
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Path to the duplicate detection service's own .env file
SERVICE_ROOT_ENV = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    SERVICE_NAME: str = Field(
        default="duplicate_service",
        validation_alias=AliasChoices("SERVICE_NAME", "DUPLICATE_SERVICE_NAME"),
    )
    VERSION: str = Field(
        default="0.1.0",
        validation_alias=AliasChoices("VERSION", "DUPLICATE_SERVICE_VERSION"),
    )
    HOST: str = Field(
        default="127.0.0.1",
        validation_alias=AliasChoices("HOST", "DUPLICATE_SERVICE_HOST"),
    )
    PORT: int = Field(
        default=8001,
        validation_alias=AliasChoices("PORT", "DUPLICATE_SERVICE_PORT"),
    )
    ENVIRONMENT: str = Field(
        default="development",
        validation_alias=AliasChoices("ENVIRONMENT", "DUPLICATE_SERVICE_ENVIRONMENT", "NODE_ENV"),
    )

    model_config = SettingsConfigDict(
        env_file=[SERVICE_ROOT_ENV, ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
