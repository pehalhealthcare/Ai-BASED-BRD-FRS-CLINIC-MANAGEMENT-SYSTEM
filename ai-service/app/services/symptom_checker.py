from dataclasses import dataclass

from app.safety.guardrails import detect_red_flags, sanitize_medical_output
from app.safety.medical_disclaimer import get_medical_disclaimer
from app.schemas.symptom_schema import SymptomCheckRequest


@dataclass(frozen=True)
class ConditionRule:
    name: str
    keywords: tuple[str, ...]
    confidence: float
    reason: str
    specialization: str
    urgency: str = "medium"


CONDITION_RULES = (
    ConditionRule(
        name="Viral Fever",
        keywords=("fever", "cough", "body pain", "fatigue", "sore throat"),
        confidence=0.72,
        reason="Fever, cough, body pain, and fatigue commonly appear in viral infections.",
        specialization="General Physician",
    ),
    ConditionRule(
        name="Upper Respiratory Tract Infection",
        keywords=("cold", "cough", "sore throat", "headache"),
        confidence=0.68,
        reason="Cold, sore throat, cough, and headache commonly appear in upper respiratory infections.",
        specialization="General Physician",
    ),
    ConditionRule(
        name="Gastroenteritis",
        keywords=("stomach pain", "vomiting", "diarrhea"),
        confidence=0.76,
        reason="Stomach pain, vomiting, and diarrhea may suggest a gastrointestinal infection.",
        specialization="General Physician",
    ),
    ConditionRule(
        name="Dermatitis or Allergic Rash",
        keywords=("skin rash", "itching", "allergic reaction"),
        confidence=0.66,
        reason="Skin rash and itching can be seen in allergic or inflammatory skin conditions.",
        specialization="Dermatology",
    ),
    ConditionRule(
        name="Inflammatory Joint Condition",
        keywords=("joint pain", "fatigue", "swelling"),
        confidence=0.63,
        reason="Joint pain with fatigue may occur in inflammatory or rheumatologic conditions.",
        specialization="Orthopedics",
    ),
)

SPECIALIZATION_OVERRIDES = {
    "breathing difficulty": "Pulmonology",
    "chest pain": "Cardiology",
    "skin rash": "Dermatology",
    "joint pain": "Orthopedics",
    "stomach pain": "Gastroenterology",
}


def _normalize_symptoms(symptoms: str) -> str:
    return symptoms.lower().strip()


def _build_doctor_summary(payload: SymptomCheckRequest) -> str:
    normalized_symptoms = payload.symptoms.strip()
    summary = f"Patient reports {normalized_symptoms}."

    if payload.duration and payload.duration.strip().lower() not in normalized_symptoms.lower():
        summary = f"{summary[:-1]} for {payload.duration.strip()}."

    if payload.known_conditions:
        summary = f"{summary} Known conditions: {', '.join(payload.known_conditions)}."

    return summary


def analyze_symptoms(payload: SymptomCheckRequest) -> dict:
    normalized = _normalize_symptoms(payload.symptoms)
    red_flags = detect_red_flags(normalized)
    matches: list[dict] = []

    for rule in CONDITION_RULES:
        matched_keywords = [keyword for keyword in rule.keywords if keyword in normalized]

        if not matched_keywords:
            continue

        adjusted_confidence = min(0.95, rule.confidence + max(0, len(matched_keywords) - 1) * 0.04)
        matches.append(
            {
                "name": rule.name,
                "confidence": round(adjusted_confidence, 2),
                "reason": rule.reason,
                "_specialization": rule.specialization,
                "_urgency": rule.urgency,
            }
        )

    if not matches:
        matches.append(
            {
                "name": "Undifferentiated Symptom Cluster",
                "confidence": 0.45,
                "reason": "The symptom pattern requires doctor review for further clinical assessment.",
                "_specialization": "General Physician",
                "_urgency": "medium",
            }
        )

    matches = sorted(matches, key=lambda item: item["confidence"], reverse=True)[:3]
    recommended_specialization = matches[0]["_specialization"]
    urgency = matches[0]["_urgency"]

    for keyword, specialization in SPECIALIZATION_OVERRIDES.items():
        if keyword in normalized:
            recommended_specialization = specialization
            break

    if red_flags:
        urgency = "high"
        recommended_specialization = "Emergency / Urgent Care"

    response = {
        "possible_conditions": [
            {
                "name": item["name"],
                "confidence": item["confidence"],
                "reason": item["reason"],
            }
            for item in matches
        ],
        "recommended_specialization": recommended_specialization,
        "urgency": urgency,
        "red_flags": red_flags,
        "doctor_note_summary": _build_doctor_summary(payload),
        "safety_disclaimer": get_medical_disclaimer(),
    }

    return sanitize_medical_output(response)
