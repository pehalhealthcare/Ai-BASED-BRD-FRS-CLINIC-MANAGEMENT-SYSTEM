from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_consultation_suggestions_include_disclaimer() -> None:
    response = client.post(
        "/api/v1/clinical/diagnosis-suggestions",
        json={
            "chiefComplaint": "Fever and cough",
            "patientContext": {
                "age": 30,
                "gender": "male",
                "previousDiagnoses": [],
            },
            "symptoms": [
                {"name": "fever", "severity": "moderate", "duration": "2 days", "notes": ""},
                {"name": "cough", "severity": "mild", "duration": "2 days", "notes": ""},
            ],
            "vitals": {"temperature": 101},
            "clinicalNotes": "Patient reports fever and cough for two days.",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["message"] == "AI diagnosis suggestions generated successfully."
    assert payload["data"]["suggestions"]
    assert "doctor validation is mandatory" in payload["data"]["disclaimer"].lower()
    assert "doctor validation" in payload["data"]["suggestions"][0]["safetyNote"].lower()


def test_consultation_suggestions_flag_chest_pain() -> None:
    response = client.post(
        "/api/v1/clinical/diagnosis-suggestions",
        json={
            "chiefComplaint": "Chest pain",
            "patientContext": {
                "age": 52,
                "gender": "female",
                "previousDiagnoses": [],
            },
            "symptoms": [{"name": "chest pain", "severity": "severe", "duration": "today", "notes": ""}],
            "vitals": {},
            "clinicalNotes": "Chest pain started this morning.",
        },
    )

    assert response.status_code == 200
    suggestions = response.json()["data"]["suggestions"]
    flattened_flags = [flag for item in suggestions for flag in item["redFlags"]]
    assert any("Chest pain" in flag for flag in flattened_flags)


def test_consultation_suggestions_flag_low_spo2() -> None:
    response = client.post(
        "/api/v1/clinical/diagnosis-suggestions",
        json={
            "chiefComplaint": "Breathlessness",
            "patientContext": {
                "age": 65,
                "gender": "male",
                "previousDiagnoses": ["COPD"],
            },
            "symptoms": [
                {"name": "cough", "severity": "moderate", "duration": "2 days", "notes": ""},
                {"name": "shortness of breath", "severity": "severe", "duration": "1 day", "notes": ""},
            ],
            "vitals": {"oxygenSaturation": 90},
            "clinicalNotes": "Low oxygen saturation noted.",
        },
    )

    assert response.status_code == 200
    suggestions = response.json()["data"]["suggestions"]
    flattened_flags = [flag for item in suggestions for flag in item["redFlags"]]
    assert any("Low oxygen saturation" in flag for flag in flattened_flags)


def test_consultation_suggestions_flag_shortness_of_breath() -> None:
    response = client.post(
        "/api/v1/clinical/diagnosis-suggestions",
        json={
            "chiefComplaint": "Shortness of breath",
            "patientContext": {
                "age": 47,
                "gender": "male",
                "previousDiagnoses": [],
            },
            "symptoms": [
                {"name": "shortness of breath", "severity": "moderate", "duration": "1 day", "notes": ""},
                {"name": "fatigue", "severity": "mild", "duration": "1 day", "notes": ""},
            ],
            "vitals": {"oxygenSaturation": 97},
            "clinicalNotes": "Shortness of breath worsens with minimal exertion.",
        },
    )

    assert response.status_code == 200
    suggestions = response.json()["data"]["suggestions"]
    flattened_flags = [flag for item in suggestions for flag in item["redFlags"]]
    assert any("Breathing difficulty" in flag for flag in flattened_flags)


def test_consultation_suggestions_flag_high_fever() -> None:
    response = client.post(
        "/api/v1/clinical/diagnosis-suggestions",
        json={
            "chiefComplaint": "High fever",
            "patientContext": {
                "age": 19,
                "gender": "female",
                "previousDiagnoses": [],
            },
            "symptoms": [
                {"name": "fever", "severity": "severe", "duration": "1 day", "notes": ""},
                {"name": "headache", "severity": "moderate", "duration": "1 day", "notes": ""},
            ],
            "vitals": {"temperature": 104},
            "clinicalNotes": "Very high fever since last night.",
        },
    )

    assert response.status_code == 200
    suggestions = response.json()["data"]["suggestions"]
    flattened_flags = [flag for item in suggestions for flag in item["redFlags"]]
    assert any("High fever" in flag for flag in flattened_flags)
