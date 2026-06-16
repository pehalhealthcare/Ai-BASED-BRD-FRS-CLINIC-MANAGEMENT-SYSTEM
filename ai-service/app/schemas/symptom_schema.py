from pydantic import BaseModel, Field, field_validator


class SymptomCheckRequest(BaseModel):
    symptoms: str = Field(..., min_length=3)
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = None
    duration: str | None = None
    known_conditions: list[str] = Field(default_factory=list)
    current_medications: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    patient_id: str | None = None
    language: str = "en"

    @field_validator("symptoms")
    @classmethod
    def normalize_symptoms(cls, value: str) -> str:
        normalized = value.strip()

        if len(normalized) < 3:
            raise ValueError("symptoms must be at least 3 characters long")

        return normalized
