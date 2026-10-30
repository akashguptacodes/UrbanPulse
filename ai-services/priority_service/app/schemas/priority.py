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


class PriorityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AssessmentMethod(str, Enum):
    RULE_BASED_BASELINE = "RULE_BASED_BASELINE"
    ML_MODEL = "ML_MODEL"


class PriorityAssessRequest(BaseModel):
    complaint_id: Optional[str] = Field(default=None, description="Optional unique complaint identifier")
    category: ComplaintCategory = Field(
        ...,
        alias="primary_category",
        description="Complaint category: POTHOLES, STREET_LIGHTS, GARBAGE, DISASTERS",
    )
    disaster_type: Optional[DisasterType] = Field(
        default=None,
        description="Disaster subtype (required if category is DISASTERS: FIRE, FLOOD, OTHER)",
    )
    title: Optional[str] = Field(default="", max_length=300, description="Complaint title")
    description: str = Field(
        default="",
        max_length=5000,
        description="Detailed description of the issue (up to 5000 characters)",
    )
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0, description="Latitude")
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0, description="Longitude")

    model_config = {
        "populate_by_name": True,
        "extra": "ignore",
    }

    @field_validator("title")
    @classmethod
    def clean_title(cls, v: Optional[str]) -> str:
        return (v or "").strip()

    @field_validator("description")
    @classmethod
    def clean_description(cls, v: Optional[str]) -> str:
        return (v or "").strip()

    @model_validator(mode="after")
    def validate_category_and_disaster(self) -> "PriorityAssessRequest":
        if self.category == ComplaintCategory.DISASTERS:
            if self.disaster_type is None:
                object.__setattr__(self, "disaster_type", DisasterType.OTHER)
        else:
            if self.disaster_type is not None:
                raise ValueError(
                    f"Disaster subtype '{self.disaster_type.value}' is not allowed for category '{self.category.value}'. "
                    f"Disaster subtype is only valid when category is DISASTERS."
                )
        return self


class DetectedIndicator(BaseModel):
    dimension: str = Field(..., description="Risk dimension (e.g., SAFETY_HAZARD, PUBLIC_IMPACT)")
    matched_phrase: str = Field(..., description="Matched keyword or phrase from complaint text")
    severity_contribution: float = Field(..., description="Points contributed toward severity score")
    is_negated: bool = Field(default=False, description="Whether the term was identified in a negated context")
    context_snippet: Optional[str] = Field(default=None, description="Short surrounding text snippet")


class ScoreBreakdown(BaseModel):
    base_category_score: float
    safety_hazards_contribution: float
    public_impact_contribution: float
    damage_extent_contribution: float
    urgency_contribution: float
    raw_score: float
    final_score: float


class PriorityAssessResponse(BaseModel):
    complaint_id: Optional[str] = None
    severity_score: float = Field(..., ge=0.0, le=100.0, description="Normalized severity score 0.0 to 100.0")
    priority_level: PriorityLevel = Field(..., description="Operational priority level (LOW, MEDIUM, HIGH, CRITICAL)")
    safety_override_applied: bool = Field(default=False, description="Whether a safety override was triggered")
    safety_reasons: List[str] = Field(default_factory=list, description="Reason codes for safety overrides")
    human_review_recommended: bool = Field(default=True, description="Whether human review is recommended")
    detected_indicators: List[DetectedIndicator] = Field(
        default_factory=list,
        description="Structured severity indicators detected in text",
    )
    score_breakdown: ScoreBreakdown = Field(..., description="Detailed score component breakdown")
    assessment_method: AssessmentMethod = Field(
        default=AssessmentMethod.RULE_BASED_BASELINE,
        description="Scoring methodology used",
    )
    rule_version: str = Field(default="rules-v1.0.0", description="Rules engine version")
    explanation: str = Field(..., description="Human-readable rationale for the score and priority")
    limitations: str = Field(
        default=(
            "Decision-support estimate based on citizen-reported text and metadata. "
            "Does not verify real-world conditions or contact emergency services."
        ),
        description="Documented uncertainty and limitations statement",
    )

    # Aliases for api-contract compatibility
    @property
    def priority_score(self) -> float:
        return self.severity_score

    @property
    def priority_band(self) -> str:
        return self.priority_level.value

    @property
    def safety_override(self) -> bool:
        return self.safety_override_applied

    model_config = {
        "populate_by_name": True,
    }

