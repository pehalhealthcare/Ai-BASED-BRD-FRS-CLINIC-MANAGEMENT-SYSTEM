from collections.abc import Mapping

from app.safety.output_sanitizer import remove_unsafe_claims

RED_FLAG_PATTERNS = {
    "chest pain": "Chest pain reported",
    "breathing difficulty": "Breathing difficulty reported",
    "shortness of breath": "Breathing difficulty reported",
    "unconscious": "Possible loss of consciousness reported",
    "severe bleeding": "Severe bleeding reported",
    "stroke": "Possible stroke symptoms reported",
    "seizure": "Seizure reported",
    "severe allergic reaction": "Possible severe allergic reaction reported",
}

PRESCRIPTION_BANNED_PHRASES = [
    "take this medicine",
    "start antibiotics",
    "use this dosage",
    "confirmed diagnosis",
]


def detect_red_flags(symptoms: str) -> list[str]:
    normalized = symptoms.lower()
    return [label for pattern, label in RED_FLAG_PATTERNS.items() if pattern in normalized]


def detect_clinical_red_flags(symptoms: list[str] | None = None, vitals: Mapping | None = None, clinical_notes: str | None = None) -> list[str]:
    combined = " ".join([*(symptoms or []), clinical_notes or ""]).strip()
    flags = detect_red_flags(combined) if combined else []
    vitals = vitals or {}
    spo2 = vitals.get("spo2", vitals.get("oxygenSaturation"))
    temperature = vitals.get("temperature")

    try:
        if spo2 is not None and float(spo2) < 94:
            flags.append("Low oxygen saturation reported")
    except (TypeError, ValueError):
        pass

    try:
        if temperature is not None and float(temperature) > 103:
            flags.append("High fever reported")
    except (TypeError, ValueError):
        pass

    if "neck stiffness" in combined.lower() and "headache" in combined.lower() and "vomiting" in combined.lower():
        flags.append("Possible meningitis red flag pattern reported")

    return list(dict.fromkeys(flags))


def validate_no_prescription_advice(text: str) -> bool:
    normalized = text.lower()
    return not any(phrase in normalized for phrase in PRESCRIPTION_BANNED_PHRASES)


def sanitize_medical_output(output):
    if isinstance(output, str):
        return remove_unsafe_claims(output)

    if isinstance(output, list):
        return [sanitize_medical_output(item) for item in output]

    if isinstance(output, Mapping):
        return {key: sanitize_medical_output(value) for key, value in output.items()}

    return output
