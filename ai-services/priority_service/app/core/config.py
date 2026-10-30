from pathlib import Path
from pydantic import AliasChoices, Field, model_validator
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
    RULES_VERSION: str = Field(
        default="rules-v1.0.0",
        validation_alias=AliasChoices("RULES_VERSION", "PRIORITY_RULES_VERSION"),
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

    # Text processing limits
    MAX_DESCRIPTION_LENGTH: int = Field(
        default=5000,
        validation_alias=AliasChoices("MAX_DESCRIPTION_LENGTH", "MAX_TEXT_LENGTH"),
    )

    # Category Base Scores (Out of 100)
    BASE_SCORE_DISASTERS: float = Field(default=50.0)
    BASE_SCORE_POTHOLES: float = Field(default=20.0)
    BASE_SCORE_STREET_LIGHTS: float = Field(default=15.0)
    BASE_SCORE_GARBAGE: float = Field(default=15.0)

    # Maximum factor contribution caps
    MAX_FACTOR_SAFETY: float = 35.0
    MAX_FACTOR_IMPACT: float = 20.0
    MAX_FACTOR_DAMAGE: float = 15.0
    MAX_FACTOR_URGENCY: float = 10.0

    # Priority Band Boundaries (0.0 to 100.0)
    # LOW: [0, THRESHOLD_MEDIUM) -> 0 to 24.9
    # MEDIUM: [THRESHOLD_MEDIUM, THRESHOLD_HIGH) -> 25.0 to 49.9
    # HIGH: [THRESHOLD_HIGH, THRESHOLD_CRITICAL) -> 50.0 to 74.9
    # CRITICAL: [THRESHOLD_CRITICAL, 100.0] -> 75.0 to 100.0
    THRESHOLD_MEDIUM: float = Field(default=25.0, validation_alias=AliasChoices("THRESHOLD_MEDIUM", "PRIORITY_THRESHOLD_MEDIUM"))
    THRESHOLD_HIGH: float = Field(default=50.0, validation_alias=AliasChoices("THRESHOLD_HIGH", "PRIORITY_THRESHOLD_HIGH"))
    THRESHOLD_CRITICAL: float = Field(default=75.0, validation_alias=AliasChoices("THRESHOLD_CRITICAL", "PRIORITY_THRESHOLD_CRITICAL"))

    # Safety Override Minimum Score
    SAFETY_OVERRIDE_MIN_SCORE: float = Field(default=90.0)

    @model_validator(mode="after")
    def validate_thresholds(self) -> "Settings":
        if not (0.0 < self.THRESHOLD_MEDIUM < self.THRESHOLD_HIGH < self.THRESHOLD_CRITICAL <= 100.0):
            raise ValueError(
                f"Priority thresholds must be strictly ascending: "
                f"0 < {self.THRESHOLD_MEDIUM} < {self.THRESHOLD_HIGH} < {self.THRESHOLD_CRITICAL} <= 100"
            )
        return self

    model_config = SettingsConfigDict(
        env_file=[SERVICE_ROOT_ENV, ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
