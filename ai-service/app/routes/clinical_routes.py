from fastapi import APIRouter

from app.schemas.clinical_schema import DiagnosisSuggestionRequest, FormatNoteRequest
from app.services.clinical_note_service import format_note_to_sections
from app.services.diagnosis_suggestion_service import generate_diagnosis_suggestions
from app.utils.response import success_response

router = APIRouter(prefix="/api/v1/clinical", tags=["Clinical AI"])


@router.post("/diagnosis-suggestions", summary="Legacy clinical diagnosis suggestions")
def diagnosis_suggestions(payload: DiagnosisSuggestionRequest) -> dict:
    return success_response(
        "AI diagnosis suggestions generated successfully.",
        generate_diagnosis_suggestions(payload),
    )


@router.post("/consultation-suggestions", summary="Legacy consultation suggestions alias")
def consultation_suggestions_alias(payload: DiagnosisSuggestionRequest) -> dict:
    return success_response(
        "AI diagnosis suggestions generated successfully.",
        generate_diagnosis_suggestions(payload),
    )


@router.post("/format-note", summary="Legacy clinical note section formatter")
def format_note(payload: FormatNoteRequest) -> dict:
    return success_response(
        "Clinical note formatted successfully.",
        format_note_to_sections(payload.rawNote),
    )
