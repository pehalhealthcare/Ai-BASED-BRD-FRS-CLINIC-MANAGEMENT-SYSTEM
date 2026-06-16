from app.core.ai_response_factory import build_standard_ai_response
from app.core.safety import AI_CLINICAL_NOTE_EXPLANATION, get_ai_draft_disclaimer
from app.evaluation.adapter_registry import get_adapter_registry
from app.safety.guardrails import sanitize_medical_output
from app.safety.medical_disclaimer import get_clinical_note_disclaimer
from app.schemas.clinical_note_schema import ClinicalNoteRequest
from app.services.ai_audit_service import record_ai_audit_event


def _normalize_note(raw_note: str) -> str:
    cleaned = " ".join(raw_note.strip().split())

    if not cleaned:
        return "Not mentioned"

    cleaned = cleaned[0].upper() + cleaned[1:]

    if not cleaned.endswith("."):
        cleaned += "."

    return cleaned


def _draft_soap_output(transcript: str) -> dict:
    subjective = _normalize_note(transcript)
    output = {
        "note_type": "SOAP",
        "subjective": subjective,
        "objective": "Not mentioned",
        "assessment": "Not mentioned",
        "plan": "Not mentioned",
        "draft_ai_note": True,
    }
    output["missing_information"] = [
        label
        for label, value in {
            "Objective findings": output["objective"],
            "Assessment": output["assessment"],
            "Plan": output["plan"],
        }.items()
        if value == "Not mentioned"
    ]
    return sanitize_medical_output(output)


def format_clinical_note(payload: ClinicalNoteRequest) -> dict:
    requested_format = payload.format.strip().upper()

    if requested_format != "SOAP":
        raise ValueError("Only SOAP format is supported in the MVP.")

    transcript = payload.transcript or payload.raw_note or ""
    normalized_note = _normalize_note(transcript)
    response = {
        "format": requested_format,
        "formatted_note": {
            "subjective": normalized_note,
            "objective": "Not mentioned",
            "assessment": "Not mentioned",
            "plan": "Not mentioned",
        },
        "safety_disclaimer": get_clinical_note_disclaimer(),
    }

    return sanitize_medical_output(response)


def format_note_to_sections(raw_note: str) -> dict:
    normalized_note = _normalize_note(raw_note)
    response = {
        "subjective": normalized_note,
        "objective": "Not mentioned",
        "assessment": "Not mentioned",
        "plan": "Not mentioned",
        "disclaimer": get_clinical_note_disclaimer(),
    }

    return sanitize_medical_output(response)


def format_clinical_note_response(payload: ClinicalNoteRequest):
    requested_format = payload.format.strip().upper()
    if requested_format != "SOAP":
        raise ValueError("Only SOAP format is supported.")

    transcript = payload.transcript or payload.raw_note or ""
    formatter = get_adapter_registry().note_formatter
    adapter_result = formatter.format_soap_note(transcript=transcript, requested_format=requested_format)
    output = dict(adapter_result.output)
    output["disclaimer"] = get_ai_draft_disclaimer()

    response = build_standard_ai_response(
        output=output,
        confidence=adapter_result.confidence,
        explanation=adapter_result.explanation or AI_CLINICAL_NOTE_EXPLANATION,
        risk_level=adapter_result.risk_level,
        model_name=formatter.model_name,
        model_version=formatter.model_version,
        model_status=adapter_result.model_status,
    )

    record_ai_audit_event(
        audit_id=response.audit_id,
        endpoint="/ai/format-clinical-note",
        patient_id=payload.patient_id,
        payload={
            "consultation_id": payload.consultation_id,
            "patient_id": payload.patient_id,
            "doctor_id": payload.doctor_id,
            "format": requested_format,
            "transcript_length": len(transcript.strip()),
        },
        model_provider=formatter.provider or "fallback",
        model_name=response.model_name,
        model_status=response.model_status,
        risk_level=response.risk_level,
        requires_doctor_review=response.requires_doctor_review,
        success=True,
    )

    return response
