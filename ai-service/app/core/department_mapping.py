from typing import Iterable


DEPARTMENT_RULES = [
    ("cough", "General Physician", "Fever and cough can begin with a general physician assessment."),
    ("fever", "General Physician", "Fever commonly starts with a general physician assessment."),
    ("chest pain", "Cardiology", "Chest pain needs cardiac evaluation or urgent triage."),
    ("shortness of breath", "Pulmonology", "Breathing symptoms fit pulmonary or urgent general assessment."),
    ("breathing difficulty", "Pulmonology", "Breathing symptoms fit pulmonary or urgent general assessment."),
    ("sore throat", "ENT", "Throat and upper airway symptoms commonly start with ENT or general review."),
    ("ear pain", "ENT", "Ear symptoms commonly fit ENT review."),
    ("rash", "Dermatology", "Skin complaints commonly fit dermatology review."),
    ("itching", "Dermatology", "Skin complaints commonly fit dermatology review."),
    ("abdominal pain", "Gastroenterology", "Abdominal complaints commonly fit gastroenterology or general review."),
    ("joint pain", "Orthopedics", "Joint and musculoskeletal symptoms commonly fit orthopedics review."),
    ("back pain", "Orthopedics", "Back and musculoskeletal symptoms commonly fit orthopedics review."),
    ("headache", "Neurology", "Neurologic review may be appropriate for persistent or significant headache."),
    ("seizure", "Neurology", "Seizure-like symptoms need neurologic or emergency review."),
    ("pregnant", "Gynecology", "Pregnancy-related symptoms should be reviewed by gynecology or emergency care."),
    ("anxiety", "Psychiatry", "Mental health symptoms may need psychiatry review."),
    ("suicidal", "Psychiatry", "Self-harm or suicidal language needs emergency psychiatric support."),
    ("depression", "Psychiatry", "Mental health symptoms may need psychiatry review."),
    ("wheezing", "Pulmonology", "Wheezing and respiratory symptoms fit pulmonary review."),
]


def map_to_department(*, symptom_text: str, candidate_conditions: Iterable[str] | None = None, age: int | None = None) -> dict[str, str]:
    combined = " ".join([symptom_text.lower(), *[item.lower() for item in (candidate_conditions or []) if item]])

    for keyword, department, reason in DEPARTMENT_RULES:
        if keyword in combined:
            return {"name": department, "reason": reason}

    if age is not None and age < 16:
        return {
            "name": "Pediatrics",
            "reason": "A child or adolescent often needs pediatric assessment as the first point of care.",
        }

    return {
        "name": "General Physician",
        "reason": "A general physician is the safest starting point when symptoms do not clearly map to a specialty.",
    }
