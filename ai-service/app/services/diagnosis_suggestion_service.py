from app.safety.guardrails import detect_clinical_red_flags, sanitize_medical_output
from app.safety.medical_disclaimer import get_consultation_suggestion_disclaimer
from app.schemas.clinical_schema import DiagnosisSuggestionRequest

MODEL_NAME = "rule-based-mvp-clinical-assistant"
MODEL_VERSION = "0.1.0"


def _symptom_names(payload: DiagnosisSuggestionRequest) -> list[str]:
    return [item.name.strip().lower() for item in payload.symptoms if item.name and item.name.strip()]


def _build_suggestion(
    *,
    condition: str,
    confidence: float,
    reasoning: str,
    recommended_specialization: str,
    red_flags: list[str],
    recommended_tests: list[str],
) -> dict:
    return {
        "condition": condition,
        "confidence": round(confidence, 2),
        "reasoning": reasoning,
        "recommendedSpecialization": recommended_specialization,
        "redFlags": red_flags,
        "recommendedTests": recommended_tests,
        "safetyNote": "AI-generated suggestion. Doctor validation required.",
    }


def generate_diagnosis_suggestions(payload: DiagnosisSuggestionRequest) -> dict:
    symptom_names = _symptom_names(payload)
    vitals = payload.vitals or {}
    clinical_notes = payload.clinicalNotes or ""
    red_flags = detect_clinical_red_flags(symptom_names, vitals, clinical_notes)
    suggestions: list[dict] = []

    if "fever" in symptom_names and "cough" in symptom_names:
        suggestions.append(
            _build_suggestion(
                condition="Possible viral fever or upper respiratory infection",
                confidence=0.72,
                reasoning="Fever and cough commonly appear together in viral febrile and upper respiratory presentations.",
                recommended_specialization="General Physician",
                red_flags=red_flags,
                recommended_tests=["CBC"],
            )
        )

    if "headache" in symptom_names and ("nausea" in symptom_names or "vomiting" in symptom_names):
        suggestions.append(
            _build_suggestion(
                condition="Possible migraine or acute headache syndrome",
                confidence=0.63,
                reasoning="Headache with nausea or vomiting can fit a migraine-like pattern, but doctor evaluation is required.",
                recommended_specialization="General Physician",
                red_flags=red_flags,
                recommended_tests=["Blood pressure monitoring"],
            )
        )

    if "abdominal pain" in symptom_names:
        suggestions.append(
            _build_suggestion(
                condition="Possible gastrointestinal illness",
                confidence=0.61,
                reasoning="Abdominal pain can arise from gastrointestinal causes and needs clinical examination to narrow safely.",
                recommended_specialization="General Physician",
                red_flags=red_flags,
                recommended_tests=["CBC", "Abdominal examination"],
            )
        )

    if "shortness of breath" in symptom_names or "breathlessness" in symptom_names:
        suggestions.append(
            _build_suggestion(
                condition="Urgent respiratory review recommended",
                confidence=0.88,
                reasoning="Breathlessness can indicate urgent cardiopulmonary compromise and should be escalated promptly.",
                recommended_specialization="Emergency / General Physician",
                red_flags=red_flags,
                recommended_tests=["Pulse oximetry", "Chest examination"],
            )
        )

    if "chest pain" in symptom_names:
        suggestions.append(
            _build_suggestion(
                condition="Urgent chest pain evaluation recommended",
                confidence=0.9,
                reasoning="Chest pain is a high-risk symptom that requires urgent medical review and clinical correlation.",
                recommended_specialization="Emergency / Cardiology",
                red_flags=red_flags,
                recommended_tests=["ECG", "Vital signs monitoring"],
            )
        )

    if not suggestions:
        suggestions.append(
            _build_suggestion(
                condition="General physician review advised",
                confidence=0.5,
                reasoning="The current information is non-specific and needs doctor-led assessment.",
                recommended_specialization="General Physician",
                red_flags=red_flags,
                recommended_tests=[],
            )
        )

    response = {
        "suggestions": suggestions[:3],
        "disclaimer": "This is not a diagnosis. Doctor validation is mandatory.",
        "modelName": MODEL_NAME,
        "modelVersion": MODEL_VERSION,
    }

    return sanitize_medical_output(response)
