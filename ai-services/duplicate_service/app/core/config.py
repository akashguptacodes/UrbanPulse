from pathlib import Path
from pydantic import AliasChoices, Field, model_validator
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

    # Multi-signal Weights (Must be non-negative and sum to 1.0)
    GEO_WEIGHT: float = Field(default=0.40, validation_alias=AliasChoices("GEO_WEIGHT", "WEIGHT_GEO"))
    LEXICAL_WEIGHT: float = Field(default=0.20, validation_alias=AliasChoices("LEXICAL_WEIGHT", "WEIGHT_LEXICAL"))
    SEMANTIC_WEIGHT: float = Field(default=0.40, validation_alias=AliasChoices("SEMANTIC_WEIGHT", "WEIGHT_SEMANTIC"))

    # Decision Band Thresholds
    THRESHOLD_LIKELY_DUPLICATE: float = Field(
        default=0.75,
        validation_alias=AliasChoices("THRESHOLD_LIKELY_DUPLICATE", "THRESHOLD_LIKELY"),
    )
    THRESHOLD_POSSIBLE_DUPLICATE: float = Field(
        default=0.50,
        validation_alias=AliasChoices("THRESHOLD_POSSIBLE_DUPLICATE", "THRESHOLD_POSSIBLE"),
    )

    # Search Horizons and Distances (in meters)
    DEFAULT_SEARCH_RADIUS_METERS: float = Field(
        default=300.0,
        validation_alias=AliasChoices("DEFAULT_SEARCH_RADIUS_METERS", "SEARCH_RADIUS_METERS"),
    )
    # Hyper-local proximity threshold (in meters).
    # Compatible complaints within this radius are guaranteed at least POSSIBLE_DUPLICATE.
    HYPER_LOCAL_DISTANCE_METERS: float = Field(
        default=15.0,
        validation_alias=AliasChoices("HYPER_LOCAL_DISTANCE_METERS", "PROXIMITY_FLOOR_METERS"),
    )
    HORIZON_POTHOLES: float = 100.0
    HORIZON_STREET_LIGHTS: float = 100.0
    HORIZON_GARBAGE: float = 150.0
    HORIZON_DISASTERS: float = 500.0

    # Candidate Constraints
    MAX_CANDIDATE_POOL_SIZE: int = Field(default=100, validation_alias=AliasChoices("MAX_CANDIDATE_POOL_SIZE", "MAX_CANDIDATES"))

    # Semantic Embedding Model Configuration
    EMBEDDING_MODEL_NAME: str = Field(
        default="all-MiniLM-L6-v2",
        validation_alias=AliasChoices("EMBEDDING_MODEL_NAME", "MODEL_NAME"),
    )
    USE_MOCK_EMBEDDINGS: bool = Field(
        default=False,
        validation_alias=AliasChoices("USE_MOCK_EMBEDDINGS", "MOCK_EMBEDDINGS"),
    )

    @model_validator(mode="after")
    def validate_weights(self) -> "Settings":
        total_weight = self.GEO_WEIGHT + self.LEXICAL_WEIGHT + self.SEMANTIC_WEIGHT
        if abs(total_weight - 1.0) > 1e-4:
            raise ValueError(f"Weights must sum to 1.0. Current sum: {total_weight:.4f}")
        if self.GEO_WEIGHT < 0 or self.LEXICAL_WEIGHT < 0 or self.SEMANTIC_WEIGHT < 0:
            raise ValueError("All weights must be non-negative.")
        if self.THRESHOLD_POSSIBLE_DUPLICATE >= self.THRESHOLD_LIKELY_DUPLICATE:
            raise ValueError("THRESHOLD_POSSIBLE_DUPLICATE must be strictly less than THRESHOLD_LIKELY_DUPLICATE.")
        return self

    model_config = SettingsConfigDict(
        env_file=[SERVICE_ROOT_ENV, ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
