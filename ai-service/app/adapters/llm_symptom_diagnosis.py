from app.adapters.base import BaseModelAdapter
from app.models.adapter_result import AdapterResult
from app.schemas.clinical_schema import DiagnosisSuggestionRequest
from app.schemas.symptom_schema import SymptomCheckRequest
from app.services.diagnosis_suggestion_service import generate_diagnosis_suggestions
from app.services.symptom_checker import analyze_symptoms


class LLMSymptomDiagnosisAdapter(BaseModelAdapter):
    adapter_name = "llm_symptom_diagnosis"
    model_version = "foundation-0.1.0"

    def __init__(self, *, provider: str, api_key: str, enable_fallbacks: bool):
        self.provider = (provider or "rule_based").strip().lower()
        self.api_key = api_key or ""
        self.enable_fallbacks = enable_fallbacks
        self.model_name = f"{self.provider}-symptom-diagnosis"

    @property
    def is_available(self) -> bool:
        return self.provider == "rule_based" or bool(self.api_key)

    def _status_and_explanation(self, domain_label: str) -> tuple[str, str]:
        if self.provider == "rule_based":
            return ("ready", f"Rule-based {domain_label} adapter executed locally.")

        if self.enable_fallbacks:
            return (
                "fallback",
                f"Configured provider '{self.provider}' is unavailable or not integrated; safe rule-based fallback was used.",
            )

        return (
            "unavailable",
            f"Configured provider '{self.provider}' is unavailable and AI fallbacks are disabled.",
        )

    def symptom_check(self, payload: SymptomCheckRequest) -> AdapterResult:
        status, explanation = self._status_and_explanation("symptom-check")

        if status == "unavailable":
            return AdapterResult(
                output={
                    "possible_conditions": [],
                    "recommended_specialization": "General Physician",
                    "urgency": "unknown",
                    "red_flags": [],
                    "doctor_note_summary": "Clinical review required because the configured symptom model is unavailable.",
                    "safety_disclaimer": "A qualified doctor must review and confirm any clinical interpretation.",
                },
                confidence=0.0,
                explanation=explanation,
                risk_level="unknown",
                model_status=status,
            )

        fallback_output = analyze_symptoms(payload)
        return AdapterResult(
            output=fallback_output,
            confidence=max((item["confidence"] for item in fallback_output["possible_conditions"]), default=0.0),
            explanation=explanation,
            risk_level=fallback_output.get("urgency", "unknown"),
            model_status=status,
        )

    def diagnosis_assist(self, payload: DiagnosisSuggestionRequest) -> AdapterResult:
        status, explanation = self._status_and_explanation("diagnosis-assist")

        if status == "unavailable":
            return AdapterResult(
                output={
                    "suggestions": [],
                    "disclaimer": "AI diagnosis assistance is unavailable. Doctor-led assessment is required.",
                    "modelName": self.model_name,
                    "modelVersion": self.model_version,
                },
                confidence=0.0,
                explanation=explanation,
                risk_level="unknown",
                model_status=status,
            )

        fallback_output = generate_diagnosis_suggestions(payload)
        highest_confidence = max((item["confidence"] for item in fallback_output["suggestions"]), default=0.0)
        red_flags = [flag for item in fallback_output["suggestions"] for flag in item.get("redFlags", [])]
        risk_level = "high" if red_flags else "medium"

        return AdapterResult(
            output=fallback_output,
            confidence=highest_confidence,
            explanation=explanation,
            risk_level=risk_level,
            model_status=status,
        )
