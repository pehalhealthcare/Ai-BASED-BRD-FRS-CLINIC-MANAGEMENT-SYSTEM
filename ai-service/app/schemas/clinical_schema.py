from typing import Any

from pydantic import BaseModel, Field


class SymptomInput(BaseModel):
    name: str = Field(..., min_length=1)
    severity: str | None = Field(default="mild")
    duration: str | None = None
    notes: str | None = None


class PatientContext(BaseModel):
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = None
    previousDiagnoses: list[str] = Field(default_factory=list)


class DiagnosisSuggestionRequest(BaseModel):
    chiefComplaint: str = Field(..., min_length=1)
    symptoms: list[SymptomInput] = Field(default_factory=list)
    vitals: dict[str, Any] = Field(default_factory=dict)
    clinicalNotes: str | None = None
    patientContext: PatientContext = Field(default_factory=PatientContext)


class FormatNoteRequest(BaseModel):
    rawNote: str = Field(..., min_length=3)
    format: str = "SOAP"
