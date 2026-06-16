from pydantic import BaseModel, Field, model_validator

from app.schemas.clinical_schema import DiagnosisSuggestionRequest, FormatNoteRequest, PatientContext, SymptomInput


class ClinicalNoteRequest(BaseModel):
    transcript: str | None = Field(default=None, min_length=1)
    raw_note: str | None = Field(default=None, min_length=1)
    patient_id: str | None = None
    doctor_id: str | None = None
    consultation_id: str | None = None
    format: str = "SOAP"

    @model_validator(mode="after")
    def validate_source(self):
        source_text = self.transcript or self.raw_note
        if not source_text or len(source_text.strip()) < 3:
            raise ValueError("transcript must be at least 3 characters long")
        return self


class ClinicalFormatNoteRequest(FormatNoteRequest):
    pass


class ConsultationSuggestionPatient(PatientContext):
    knownAllergies: list[str] = Field(default_factory=list)
    existingConditions: list[str] = Field(default_factory=list)


class ConsultationSuggestionRequest(DiagnosisSuggestionRequest):
    consultationId: str = Field(..., min_length=1)
    patient: ConsultationSuggestionPatient | None = None
    previousHistorySummary: str | None = None


__all__ = [
    "ClinicalNoteRequest",
    "ClinicalFormatNoteRequest",
    "ConsultationSuggestionPatient",
    "ConsultationSuggestionRequest",
    "DiagnosisSuggestionRequest",
    "FormatNoteRequest",
    "PatientContext",
    "SymptomInput",
]
