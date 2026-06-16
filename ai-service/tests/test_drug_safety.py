from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def build_payload(**overrides):
    payload = {
        "patient": {
            "id": "patient_1",
            "age": 45,
            "gender": "male",
            "allergies": [],
            "conditions": [],
            "pregnancy_status": None,
            "kidney_disease": False,
            "liver_disease": False,
        },
        "medications": [
            {
                "name": "Vitamin C",
                "generic_name": "vitamin c",
                "ingredients": ["vitamin c"],
                "dosage": "500 mg",
                "frequency": "once daily",
                "duration": "5 days",
            }
        ],
        "existing_medications": [],
    }
    payload.update(overrides)
    return payload


def test_no_alerts_returns_severity_none():
    response = client.post("/ai/drug-safety-check", json=build_payload())
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["output"]["severity"] == "none"
    assert data["requires_doctor_review"] is True
    assert data["audit_id"]


def test_warfarin_and_ibuprofen_returns_high_interaction():
    response = client.post(
        "/ai/drug-safety-check",
        json=build_payload(
            medications=[
                {
                    "name": "Ibuprofen",
                    "generic_name": "ibuprofen",
                    "ingredients": ["ibuprofen"],
                    "dosage": "400 mg",
                    "frequency": "as needed",
                    "duration": "3 days",
                }
            ],
            existing_medications=[{"name": "Warfarin", "generic_name": "warfarin", "ingredients": ["warfarin"]}],
        ),
    )
    data = response.json()["data"]["output"]
    assert data["severity"] == "high"
    assert data["interaction_alerts"]


def test_penicillin_allergy_with_amoxicillin_returns_critical():
    response = client.post(
        "/ai/drug-safety-check",
        json=build_payload(
            patient={
                "id": "patient_1",
                "age": 30,
                "gender": "male",
                "allergies": ["penicillin"],
                "conditions": [],
                "pregnancy_status": None,
                "kidney_disease": False,
                "liver_disease": False,
            },
            medications=[
                {
                    "name": "Amoxicillin",
                    "generic_name": "amoxicillin",
                    "ingredients": ["amoxicillin"],
                    "dosage": "500 mg",
                    "frequency": "twice daily",
                    "duration": "5 days",
                }
            ],
        ),
    )
    data = response.json()["data"]["output"]
    assert data["severity"] == "critical"
    assert data["allergy_alerts"]


def test_kidney_disease_with_ibuprofen_returns_medium():
    response = client.post(
        "/ai/drug-safety-check",
        json=build_payload(
            patient={
                "id": "patient_1",
                "age": 50,
                "gender": "female",
                "allergies": [],
                "conditions": ["kidney_disease"],
                "pregnancy_status": None,
                "kidney_disease": True,
                "liver_disease": False,
            },
            medications=[
                {
                    "name": "Ibuprofen",
                    "generic_name": "ibuprofen",
                    "ingredients": ["ibuprofen"],
                    "dosage": "400 mg",
                    "frequency": "as needed",
                    "duration": "3 days",
                }
            ],
        ),
    )
    data = response.json()["data"]["output"]
    assert data["severity"] == "medium"
    assert data["contraindication_alerts"]


def test_duplicate_therapy_detected():
    response = client.post(
        "/ai/drug-safety-check",
        json=build_payload(
            medications=[
                {
                    "name": "Paracetamol",
                    "generic_name": "paracetamol",
                    "ingredients": ["paracetamol"],
                    "dosage": "500 mg",
                    "frequency": "twice daily",
                    "duration": "5 days",
                },
                {
                    "name": "Acetaminophen",
                    "generic_name": "acetaminophen",
                    "ingredients": ["acetaminophen"],
                    "dosage": "500 mg",
                    "frequency": "twice daily",
                    "duration": "5 days",
                },
            ]
        ),
    )
    data = response.json()["data"]["output"]
    assert data["duplicate_therapy_alerts"]
    assert data["severity"] == "medium"


def test_highest_severity_wins_and_response_includes_audit():
    response = client.post(
        "/ai/drug-safety-check",
        json=build_payload(
            patient={
                "id": "patient_1",
                "age": 30,
                "gender": "male",
                "allergies": ["penicillin"],
                "conditions": ["kidney_disease"],
                "pregnancy_status": None,
                "kidney_disease": True,
                "liver_disease": False,
            },
            medications=[
                {
                    "name": "Amoxicillin",
                    "generic_name": "amoxicillin",
                    "ingredients": ["amoxicillin"],
                    "dosage": "500 mg",
                    "frequency": "twice daily",
                    "duration": "5 days",
                },
                {
                    "name": "Ibuprofen",
                    "generic_name": "ibuprofen",
                    "ingredients": ["ibuprofen"],
                    "dosage": "400 mg",
                    "frequency": "as needed",
                    "duration": "3 days",
                },
            ],
            existing_medications=[{"name": "Warfarin", "generic_name": "warfarin", "ingredients": ["warfarin"]}],
        ),
    )
    data = response.json()["data"]
    assert data["output"]["severity"] == "critical"
    assert data["audit_id"]
    assert data["requires_doctor_review"] is True
