from typing import Any


RED_FLAG_DEFINITIONS = [
    ("chest pain", "chest_pain", "critical", "Chest pain can be urgent. Seek immediate medical care."),
    ("severe breathing difficulty", "severe_breathing_difficulty", "critical", "Severe breathing difficulty can be life-threatening. Seek emergency care immediately."),
    ("shortness of breath", "breathing_difficulty", "high", "Breathing difficulty needs urgent medical review, especially if worsening."),
    ("stroke", "stroke_signs", "critical", "Possible stroke symptoms need emergency medical care immediately."),
    ("slurred speech", "stroke_signs", "critical", "Possible stroke symptoms need emergency medical care immediately."),
    ("facial droop", "stroke_signs", "critical", "Possible stroke symptoms need emergency medical care immediately."),
    ("loss of consciousness", "loss_of_consciousness", "critical", "Loss of consciousness is an emergency. Seek immediate care."),
    ("unconscious", "loss_of_consciousness", "critical", "Loss of consciousness is an emergency. Seek immediate care."),
    ("severe bleeding", "severe_bleeding", "critical", "Severe bleeding requires emergency medical care."),
    ("seizure", "seizure", "critical", "A seizure can be urgent and needs immediate medical care."),
    ("anaphylaxis", "severe_allergic_reaction", "critical", "A severe allergic reaction can be life-threatening. Seek emergency care immediately."),
    ("severe allergic reaction", "severe_allergic_reaction", "critical", "A severe allergic reaction can be life-threatening. Seek emergency care immediately."),
    ("pregnancy bleeding", "pregnancy_emergency", "critical", "Bleeding during pregnancy can be urgent. Seek immediate medical care."),
    ("severe abdominal pain in pregnancy", "pregnancy_emergency", "critical", "Severe abdominal pain during pregnancy needs urgent medical care."),
    ("suicidal", "self_harm_risk", "critical", "Suicidal or self-harm thoughts need immediate emergency or crisis support."),
    ("self-harm", "self_harm_risk", "critical", "Suicidal or self-harm thoughts need immediate emergency or crisis support."),
    ("confusion", "confusion", "high", "Confusion with illness can be serious and needs urgent medical review."),
    ("stiff neck", "stiff_neck", "high", "A stiff neck with fever or confusion can be urgent and needs immediate medical review."),
    ("severe dehydration", "severe_dehydration", "high", "Possible severe dehydration needs urgent medical review."),
]


SEVERITY_ORDER = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}


def _normalize_context(*parts: str | None) -> str:
    return " ".join(part.strip().lower() for part in parts if part and part.strip())


def detect_red_flags(
    *,
    symptoms_text: str,
    age: int | None = None,
    gender: str | None = None,
    known_conditions: list[str] | None = None,
    history_text: str | None = None,
    vitals: dict[str, Any] | None = None,
    doctor_notes: str | None = None,
    lab_summary: str | None = None,
) -> list[dict[str, str]]:
    combined = _normalize_context(
        symptoms_text,
        history_text,
        doctor_notes,
        lab_summary,
        " ".join(known_conditions or []),
    )
    detected: list[dict[str, str]] = []
    seen_flags: set[str] = set()

    for pattern, flag, severity, message in RED_FLAG_DEFINITIONS:
        if pattern in combined and flag not in seen_flags:
            detected.append({"flag": flag, "severity": severity, "message": message})
            seen_flags.add(flag)

    vitals = vitals or {}

    try:
        temperature = vitals.get("temperature")
        if age is not None and age < 1 and temperature is not None and float(temperature) >= 100.4 and "infant_high_fever" not in seen_flags:
            detected.append(
                {
                    "flag": "infant_high_fever",
                    "severity": "critical",
                    "message": "High fever in an infant can be urgent. Seek immediate medical care.",
                }
            )
            seen_flags.add("infant_high_fever")

        if temperature is not None and float(temperature) >= 104 and "very_high_fever" not in seen_flags:
            detected.append(
                {
                    "flag": "very_high_fever",
                    "severity": "high",
                    "message": "Very high fever needs urgent medical review, especially if persistent or worsening.",
                }
            )
            seen_flags.add("very_high_fever")
    except (TypeError, ValueError):
        pass

    try:
        spo2 = vitals.get("spo2", vitals.get("oxygenSaturation"))
        if spo2 is not None and float(spo2) < 92 and "critical_low_spo2" not in seen_flags:
            detected.append(
                {
                    "flag": "critical_low_spo2",
                    "severity": "critical",
                    "message": "Very low oxygen saturation can be an emergency. Seek immediate medical care.",
                }
            )
            seen_flags.add("critical_low_spo2")
    except (TypeError, ValueError):
        pass

    if "fever" in combined and "confusion" in combined and "stiff neck" in combined and "fever_confusion_stiff_neck" not in seen_flags:
        detected.append(
            {
                "flag": "fever_confusion_stiff_neck",
                "severity": "critical",
                "message": "Fever with confusion and stiff neck can be an emergency. Seek immediate medical care.",
            }
        )

    if gender and gender.strip().lower() == "female":
        if "pregnant" in combined and any(term in combined for term in ["bleeding", "severe pain", "fainting"]) and "pregnancy_emergency" not in seen_flags:
            detected.append(
                {
                    "flag": "pregnancy_emergency",
                    "severity": "critical",
                    "message": "Pregnancy-related bleeding, fainting, or severe pain needs emergency medical care.",
                }
            )

    return detected


def derive_risk_level(flags: list[dict[str, str]]) -> str:
    if not flags:
        return "low"

    max_severity = max(flags, key=lambda item: SEVERITY_ORDER.get(item.get("severity", "low"), 1)).get("severity", "low")
    return max_severity
