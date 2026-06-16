from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_prescription_advice_requires_doctor_review() -> None:
    response = client.post(
        "/api/v1/prescription/format-advice",
        json={
            "diagnosis": "Viral fever",
            "doctorNotes": "Patient is stable.",
            "rawAdvice": "Hydration and rest for three days"
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["doctor_review_required"] is True
    assert "doctor approval is mandatory" in payload["data"]["disclaimer"].lower()


def test_prescription_advice_does_not_invent_medicine_fields() -> None:
    response = client.post(
        "/api/v1/prescription/format-advice",
        json={
            "diagnosis": "Acute febrile illness",
            "doctorNotes": "Doctor wants cleaner advice wording.",
            "rawAdvice": "Return for review if fever persists."
        },
    )

    assert response.status_code == 200
    payload = response.json()["data"]
    assert "formattedAdvice" in payload
    assert "medicines" not in payload
    assert "dosage" not in payload
