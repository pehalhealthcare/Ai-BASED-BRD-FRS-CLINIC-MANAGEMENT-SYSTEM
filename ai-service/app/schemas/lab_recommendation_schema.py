from pydantic import BaseModel, Field


class LabRecommendationRequest(BaseModel):
    symptoms: str = Field(default="", max_length=4000)
    diagnosis: str = Field(default="", max_length=2000)
    age: int | None = Field(default=None, ge=0, le=120)
    patient_id: str | None = None
    consultation_id: str | None = None
