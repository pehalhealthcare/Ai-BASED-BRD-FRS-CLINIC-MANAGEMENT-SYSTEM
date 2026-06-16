from typing import Any

from pydantic import BaseModel, Field

from app.schemas.drug_safety_schema import DrugSafetyCheckRequest


class LabResultEntryInput(BaseModel):
    code: str | None = None
    name: str = Field(..., min_length=1)
    value: str | None = None
    numericValue: float | None = None
    unit: str | None = None
    normalRange: dict[str, Any] = Field(default_factory=dict)


class LabAnalysisRequest(BaseModel):
    resultEntries: list[LabResultEntryInput] = Field(default_factory=list, min_length=1)

class DiagnosisAssistRequest(BaseModel):
    patient_id: str | None = None
    symptoms: str = Field(..., min_length=3)
    history: str | dict[str, Any] | None = None
    vitals: dict[str, Any] = Field(default_factory=dict)
    known_conditions: list[str] = Field(default_factory=list)
    current_medications: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    lab_summary: str | None = None
    doctor_notes: str | None = None
