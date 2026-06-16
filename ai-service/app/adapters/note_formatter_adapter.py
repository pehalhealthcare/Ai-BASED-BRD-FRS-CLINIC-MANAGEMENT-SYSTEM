from app.adapters.base import BaseModelAdapter
from app.models.adapter_result import AdapterResult
from app.safety.guardrails import sanitize_medical_output


def _normalize_sentence(text: str) -> str:
    cleaned = " ".join((text or "").strip().split())
    if not cleaned:
        return "Not mentioned"
    cleaned = cleaned[0].upper() + cleaned[1:]
    if cleaned[-1] not in ".!?":
        cleaned += "."
    return cleaned


def _collect_missing(output: dict) -> list[str]:
    missing = []
    if output["subjective"] == "Not mentioned":
        missing.append("Subjective history")
    if output["objective"] == "Not mentioned":
        missing.append("Objective findings")
    if output["assessment"] == "Not mentioned":
        missing.append("Assessment")
    if output["plan"] == "Not mentioned":
        missing.append("Plan")
    return missing


class NoteFormatterAdapter(BaseModelAdapter):
    adapter_name = "note_formatter_adapter"
    model_version = "phase-17-soap-0.1.0"

    def __init__(self, *, llm_adapter):
        self.llm_adapter = llm_adapter
        self.provider = getattr(llm_adapter, "provider", "fallback")
        self.model_name = getattr(llm_adapter, "model_name", "deterministic-note-formatter")

    @property
    def is_available(self) -> bool:
        return bool(getattr(self.llm_adapter, "is_available", False))

    def format_soap_note(self, *, transcript: str, requested_format: str = "SOAP") -> AdapterResult:
        if requested_format.upper() != "SOAP":
            raise ValueError("Only SOAP format is supported.")

        normalized = _normalize_sentence(transcript)
        output = {
            "note_type": "SOAP",
            "subjective": normalized if normalized != "Not mentioned" else "Not mentioned",
            "objective": "Not mentioned",
            "assessment": "Not mentioned",
            "plan": "Not mentioned",
            "draft_ai_note": True,
        }
        output["missing_information"] = _collect_missing(output)

        explanation = "Deterministic clinical note formatter was used because no validated clinical-note LLM formatter is configured."
        model_status = "fallback"

        if self.is_available and getattr(self.llm_adapter, "provider", "") == "mock":
            output = {
                "note_type": "SOAP",
                "subjective": normalized,
                "objective": "Not mentioned",
                "assessment": "Not mentioned",
                "plan": "Not mentioned",
                "draft_ai_note": True,
            }
            output["missing_information"] = _collect_missing(output)
            explanation = "Mock LLM formatter generated a structured SOAP draft without inventing missing clinical facts."
            model_status = "available"

        return AdapterResult(
            output=sanitize_medical_output(output),
            confidence=0.42 if model_status == "available" else 0.28,
            explanation=explanation,
            risk_level="medium",
            model_status=model_status,
        )
