from app.utils.response import success_response


def _match_terms(text: str, terms: list[str]) -> bool:
    lowered = text.lower()
    return any(term in lowered for term in terms)


def recommend_lab_tests(*, symptoms: str = "", diagnosis: str = "", age: int | None = None) -> dict:
    text = f"{symptoms} {diagnosis}".strip()
    suggestions: list[dict[str, str]] = []

    if _match_terms(text, ["fever", "cough", "sore throat", "cold", "flu"]):
        suggestions.append(
            {
                "test_name": "Complete Blood Count (CBC)",
                "reason": "Fever and respiratory symptoms often warrant a baseline blood count.",
                "priority": "routine",
            }
        )

    if _match_terms(text, ["fever", "infection", "weakness", "fatigue"]):
        suggestions.append(
            {
                "test_name": "C-Reactive Protein (CRP)",
                "reason": "Inflammatory markers help assess infection severity.",
                "priority": "routine",
            }
        )

    if _match_terms(text, ["chest pain", "breath", "shortness of breath", "wheezing"]):
        suggestions.extend(
            [
                {
                    "test_name": "Chest X-Ray",
                    "reason": "Respiratory or chest symptoms may require imaging review.",
                    "priority": "urgent",
                },
                {
                    "test_name": "Arterial Blood Gas (ABG)",
                    "reason": "Breathing difficulty may require oxygenation assessment.",
                    "priority": "urgent",
                },
            ]
        )

    if _match_terms(text, ["diabetes", "sugar", "thirst", "polyuria", "glucose"]):
        suggestions.append(
            {
                "test_name": "Fasting Blood Glucose / HbA1c",
                "reason": "Glucose-related symptoms suggest glycemic evaluation.",
                "priority": "routine",
            }
        )

    if _match_terms(text, ["abdominal pain", "vomit", "nausea", "diarrhea", "jaundice"]):
        suggestions.extend(
            [
                {
                    "test_name": "Liver Function Test (LFT)",
                    "reason": "Abdominal or hepatic symptoms may require liver panel review.",
                    "priority": "routine",
                },
                {
                    "test_name": "Ultrasound Abdomen",
                    "reason": "Persistent abdominal symptoms may need imaging support.",
                    "priority": "routine",
                },
            ]
        )

    if _match_terms(text, ["thyroid", "weight gain", "weight loss", "palpitation", "tremor"]):
        suggestions.append(
            {
                "test_name": "Thyroid Function Test (TFT)",
                "reason": "Metabolic or thyroid-related symptoms suggest TFT screening.",
                "priority": "routine",
            }
        )

    if age is not None and age >= 40 and _match_terms(text, ["fatigue", "weakness", "anemia"]):
        suggestions.append(
            {
                "test_name": "Iron Studies",
                "reason": "Fatigue in older adults may warrant iron deficiency screening.",
                "priority": "routine",
            }
        )

    if not suggestions:
        suggestions.append(
            {
                "test_name": "Basic Metabolic Panel",
                "reason": "Non-specific symptoms benefit from a baseline metabolic panel.",
                "priority": "routine",
            }
        )

    deduped: list[dict[str, str]] = []
    seen = set()

    for item in suggestions:
        key = item["test_name"].lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)

    return {
        "suggested_tests": deduped[:6],
        "clinical_summary": text or "Symptoms not specified",
        "disclaimer": "AI lab test suggestions are assistive only. A doctor must confirm the final order list.",
        "model_status": "fallback",
    }


def build_lab_recommendation_response(payload: dict) -> dict:
    output = recommend_lab_tests(
        symptoms=payload.get("symptoms", ""),
        diagnosis=payload.get("diagnosis", ""),
        age=payload.get("age"),
    )
    return success_response("Lab test recommendations generated successfully", output)
