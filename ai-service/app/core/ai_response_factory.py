from uuid import uuid4

from app.models.ai_response import StandardAIResponse


def build_standard_ai_response(
    *,
    output,
    confidence: float,
    explanation: str,
    risk_level: str = "unknown",
    requires_doctor_review: bool = True,
    requires_admin_review: bool = False,
    requires_human_review: bool = False,
    model_name: str,
    model_version: str,
    model_status: str,
) -> StandardAIResponse:
    bounded_confidence = max(0.0, min(1.0, round(confidence, 2)))

    return StandardAIResponse(
        output=output,
        confidence=bounded_confidence,
        explanation=explanation,
        risk_level=risk_level,
        requires_doctor_review=requires_doctor_review,
        requires_admin_review=requires_admin_review,
        requires_human_review=requires_human_review,
        model_name=model_name,
        model_version=model_version,
        model_status=model_status,
        audit_id=str(uuid4()),
    )


def merge_legacy_payload(legacy_payload: dict, standard_response: StandardAIResponse) -> dict:
    merged = dict(legacy_payload)
    merged.update(standard_response.model_dump())
    return merged
