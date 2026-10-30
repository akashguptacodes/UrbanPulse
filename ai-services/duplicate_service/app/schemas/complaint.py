from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class ComplaintCategory(str, Enum):
    POTHOLES = "POTHOLES"
    STREET_LIGHTS = "STREET_LIGHTS"
    GARBAGE = "GARBAGE"
    DISASTERS = "DISASTERS"


class DisasterType(str, Enum):
    FIRE = "FIRE"
    FLOOD = "FLOOD"
    OTHER = "OTHER"


class DecisionRecommendation(str, Enum):
    LIKELY_DUPLICATE = "LIKELY_DUPLICATE"
    POSSIBLE_DUPLICATE = "POSSIBLE_DUPLICATE"
    UNLIKELY_DUPLICATE = "UNLIKELY_DUPLICATE"


class ComplaintInput(BaseModel):
    id: str = Field(..., min_length=1, description="Unique complaint identifier")
    title: str = Field(..., min_length=1, max_length=300, description="Title of the complaint")
    description: Optional[str] = Field(default="", description="Detailed description")
    category: ComplaintCategory = Field(..., description="Complaint category")
    disaster_type: Optional[DisasterType] = Field(
        default=None,
        description="Subtype required if category is DISASTERS (FIRE, FLOOD, OTHER)",
    )
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Geographic latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Geographic longitude")
    created_at: Optional[str] = Field(default=None, description="ISO timestamp string")

    @field_validator("title")
    @classmethod
    def clean_title(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Title cannot be empty or whitespace only")
        return cleaned

    @field_validator("description")
    @classmethod
    def clean_description(cls, v: Optional[str]) -> str:
        return (v or "").strip()

    @model_validator(mode="after")
    def validate_disaster_subtype(self) -> "ComplaintInput":
        if self.category == ComplaintCategory.DISASTERS and self.disaster_type is None:
            # Default to OTHER if unspecified for disaster category to preserve compatibility
            object.__setattr__(self, "disaster_type", DisasterType.OTHER)
        return self


class DuplicateEvaluateRequest(BaseModel):
    target_complaint: ComplaintInput = Field(..., description="The newly submitted or target complaint")
    candidate_pool: List[ComplaintInput] = Field(
        default_factory=list,
        description="Candidate complaints to evaluate for duplicates (bounded max 100)",
    )
    max_distance_meters: Optional[float] = Field(
        default=None,
        gt=0.0,
        description="Optional custom distance horizon in meters overriding defaults",
    )

    @field_validator("candidate_pool")
    @classmethod
    def check_pool_limit(cls, v: List[ComplaintInput]) -> List[ComplaintInput]:
        if len(v) > 100:
            raise ValueError("Candidate pool size exceeds maximum allowed limit of 100.")
        return v


class CandidateScoreDetail(BaseModel):
    candidate_id: str
    combined_score: float = Field(..., ge=0.0, le=1.0)
    recommendation: DecisionRecommendation
    distance_meters: float = Field(..., ge=0.0)
    geo_score: float = Field(..., ge=0.0, le=1.0)
    lexical_score: float = Field(..., ge=0.0, le=1.0)
    semantic_score: float = Field(..., ge=0.0, le=1.0)
    reason_codes: List[str] = Field(default_factory=list)
    explanation: str


class DuplicateEvaluateResponse(BaseModel):
    target_id: str
    candidates_evaluated: int
    matches: List[CandidateScoreDetail]
    top_match: Optional[CandidateScoreDetail] = None

