from fastapi import APIRouter

from app.core.ai_response_factory import merge_legacy_payload
from app.models.ai_response import StandardAIResponse
from app.schemas.ai_foundation_schema import DiagnosisAssistRequest
from app.schemas.common_schema import StandardAIEnvelope
from app.schemas.clinical_note_schema import ClinicalNoteRequest
from app.schemas.symptom_schema import SymptomCheckRequest
from app.services.ai_foundation_service import (
    legacy_symptom_response_from_standard,
    run_diagnosis_assist,
    run_symptom_check,
)
from app.services.clinical_note_service import format_clinical_note, format_clinical_note_response
from app.utils.response import success_response

router = APIRouter(prefix="/api/v1/ai", tags=["AI Foundation"])
direct_router = APIRouter(prefix="/ai", tags=["AI Foundation"])
public_router = APIRouter(prefix="/api/v1", tags=["AI Foundation"])

SYMPTOM_RESPONSE_EXAMPLE = {
    "success": True,
    "message": "Symptom analysis generated successfully",
    "data": {
        "output": {
            "clinical_summary": "Symptoms reported: fever, cough, sore throat for 2 days",
            "top_3_possible_conditions": [
                {
                    "condition": "Viral upper respiratory infection",
                    "likelihood": "medium",
                    "reason": "Fever, cough, and sore throat commonly fit a viral upper respiratory pattern.",
                }
            ],
            "recommended_department": {
                "name": "General Physician",
                "reason": "Fever commonly starts with a general physician assessment.",
            },
            "red_flags": [],
            "home_care_general_advice": ["Stay hydrated.", "Rest.", "Monitor symptoms and temperature."],
            "when_to_seek_emergency_care": ["Seek urgent care if breathing difficulty, chest pain, confusion, fainting, or persistent high fever occurs."],
            "follow_up_questions": ["Do you have shortness of breath?", "What is your temperature?"],
            "disclaimer": "This is AI-assisted clinical decision support only, not a final diagnosis or treatment recommendation. A qualified doctor must review and confirm.",
        },
        "confidence": 0.68,
        "explanation": "Configured LLM provider or key is unavailable; safe rule-based symptom fallback was used.",
        "risk_level": "medium",
        "requires_doctor_review": True,
        "model_name": "mock-medical-json",
        "model_version": "phase-16-foundation-0.1.0",
        "model_status": "fallback",
        "audit_id": "example-audit-id",
    },
}

DIAGNOSIS_RESPONSE_EXAMPLE = {
    "success": True,
    "message": "Diagnosis assistance generated successfully",
    "data": {
        "output": {
            "clinical_summary": "Assistive summary: fever and cough for 2 days",
            "top_3_diagnosis_suggestions": [
                {
                    "diagnosis": "Possible viral respiratory infection",
                    "likelihood": "medium",
                    "supporting_evidence": ["Fever and respiratory symptoms are present."],
                    "missing_information": ["Temperature trend", "Breathing status", "Exposure history"],
                    "contraindications_or_warnings": ["Rule out pneumonia or asthma exacerbation if breathing symptoms worsen."],
                }
            ],
            "recommended_next_questions": ["How have the symptoms changed over time?"],
            "recommended_department": {
                "name": "General Physician",
                "reason": "Fever commonly starts with a general physician assessment.",
            },
            "red_flags": [],
            "doctor_action_required": [
                "Review AI suggestions.",
                "Confirm diagnosis clinically.",
                "Approve or reject before saving.",
            ],
            "disclaimer": "Clinical decision support only. Not a final diagnosis.",
        },
        "confidence": 0.64,
        "explanation": "Configured LLM provider or key is unavailable; safe rule-based diagnosis-assist fallback was used.",
        "risk_level": "medium",
        "requires_doctor_review": True,
        "model_name": "mock-medical-json",
        "model_version": "phase-16-foundation-0.1.0",
        "model_status": "fallback",
        "audit_id": "example-audit-id",
    },
}


def _standard_payload(response: StandardAIResponse) -> dict:
    return response.model_dump()


@router.post("/symptom-check", summary="Assistive symptom clustering", response_model=None)
def symptom_check(payload: SymptomCheckRequest) -> dict:
    standard_response = run_symptom_check(payload)
    return success_response("Symptom analysis generated successfully", legacy_symptom_response_from_standard(payload, standard_response))


@public_router.post("/symptom-check", summary="Public assistive symptom clustering alias")
def public_symptom_check(payload: SymptomCheckRequest) -> dict:
    standard_response = run_symptom_check(payload)
    result = legacy_symptom_response_from_standard(payload, standard_response)
    return success_response(
        "Symptom analysis generated",
        {
            "possibleConditions": result.get("possibleConditions", []),
            "recommendedSpecialization": result.get("recommendedSpecialization", ""),
            "urgency": result.get("urgency", "low"),
            "redFlags": result.get("redFlags", []),
            "doctorNoteSummary": result.get("doctorNoteSummary", ""),
            "disclaimer": result.get("disclaimer", ""),
        },
    )


@direct_router.post(
    "/symptom-check",
    summary="Foundation symptom-check endpoint",
    response_model=StandardAIEnvelope,
    responses={
        200: {
            "description": "Structured AI-assisted symptom triage output. `model_status` is `available` for an active configured provider, `fallback` when safe rules are used, and `unavailable` if no provider and no fallback are available.",
            "content": {"application/json": {"example": SYMPTOM_RESPONSE_EXAMPLE}},
        }
    },
)
def direct_symptom_check(payload: SymptomCheckRequest) -> dict:
    return success_response("Symptom analysis generated successfully", _standard_payload(run_symptom_check(payload)))


@router.post(
    "/diagnosis-assist",
    summary="Assistive diagnosis support",
    response_model=StandardAIEnvelope,
    responses={
        200: {
            "description": "Doctor-facing clinical decision-support output. This endpoint never returns a final diagnosis and always requires doctor review.",
            "content": {"application/json": {"example": DIAGNOSIS_RESPONSE_EXAMPLE}},
        }
    },
)
def diagnosis_assist(payload: DiagnosisAssistRequest) -> dict:
    return success_response("Diagnosis assistance generated successfully", _standard_payload(run_diagnosis_assist(payload)))


@direct_router.post(
    "/diagnosis-assist",
    summary="Foundation diagnosis-assist endpoint",
    response_model=StandardAIEnvelope,
    responses={
        200: {
            "description": "Doctor-facing clinical decision-support output. This endpoint never returns a final diagnosis and always requires doctor review.",
            "content": {"application/json": {"example": DIAGNOSIS_RESPONSE_EXAMPLE}},
        }
    },
)
def direct_diagnosis_assist(payload: DiagnosisAssistRequest) -> dict:
    return success_response("Diagnosis assistance generated successfully", _standard_payload(run_diagnosis_assist(payload)))


@router.post("/format-clinical-note", summary="Legacy clinical note formatter")
def format_note(payload: ClinicalNoteRequest) -> dict:
    return success_response("Clinical note formatted successfully", format_clinical_note(payload))


@public_router.post("/format-clinical-note", summary="Public clinical note formatter alias")
def public_format_note(payload: ClinicalNoteRequest) -> dict:
    return success_response("Clinical note formatted successfully", format_clinical_note(payload))


@direct_router.post(
    "/format-clinical-note",
    summary="Foundation clinical note formatter",
    response_model=StandardAIEnvelope,
)
def direct_format_note(payload: ClinicalNoteRequest) -> dict:
    return success_response("Clinical note formatted successfully", _standard_payload(format_clinical_note_response(payload)))
