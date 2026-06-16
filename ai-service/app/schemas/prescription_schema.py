from pydantic import BaseModel, Field


class PrescriptionAdviceRequest(BaseModel):
    diagnosis: str | None = Field(default=None)
    doctorNotes: str | None = Field(default=None)
    rawAdvice: str = Field(..., min_length=1)
