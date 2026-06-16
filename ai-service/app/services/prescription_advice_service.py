from app.safety.guardrails import sanitize_medical_output
from app.safety.medical_disclaimer import get_prescription_format_disclaimer
from app.schemas.prescription_schema import PrescriptionAdviceRequest


def _normalize_text(value: str | None) -> str:
    if not value:
        return ""

    normalized = " ".join(value.strip().split())

    if not normalized:
        return ""

    normalized = normalized[0].upper() + normalized[1:]

    if not normalized.endswith("."):
        normalized += "."

    return normalized


def format_prescription_advice(payload: PrescriptionAdviceRequest) -> dict:
    sections = []

    diagnosis = _normalize_text(payload.diagnosis)
    if diagnosis:
        sections.append(f"Diagnosis context: {diagnosis}")

    doctor_notes = _normalize_text(payload.doctorNotes)
    if doctor_notes:
        sections.append(f"Doctor notes: {doctor_notes}")

    raw_advice = _normalize_text(payload.rawAdvice) or "Doctor advice not provided."
    sections.append(f"Advice: {raw_advice}")

    response = {
        "formattedAdvice": " ".join(sections).strip(),
        "disclaimer": get_prescription_format_disclaimer(),
        "doctor_review_required": True,
    }

    return sanitize_medical_output(response)
