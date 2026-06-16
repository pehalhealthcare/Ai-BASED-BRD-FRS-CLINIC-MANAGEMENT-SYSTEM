from app.safety.guardrails import detect_red_flags, sanitize_medical_output, validate_no_prescription_advice
from app.safety.output_sanitizer import remove_unsafe_claims


def test_detect_red_flags() -> None:
    flags = detect_red_flags("chest pain and breathing difficulty")
    assert flags


def test_remove_unsafe_claims() -> None:
    sanitized = remove_unsafe_claims("This is a confirmed diagnosis and you definitely have flu. Take this medicine.")
    assert "confirmed diagnosis" not in sanitized.lower()
    assert "you definitely have" not in sanitized.lower()
    assert "consult a doctor for treatment" in sanitized.lower()


def test_sanitize_medical_output_and_no_prescription_validation() -> None:
    payload = sanitize_medical_output({"message": "You definitely have a confirmed diagnosis."})
    assert "you definitely have" not in payload["message"].lower()
    assert validate_no_prescription_advice("Discuss treatment with a doctor.") is True
    assert validate_no_prescription_advice("Take this medicine twice daily.") is False
