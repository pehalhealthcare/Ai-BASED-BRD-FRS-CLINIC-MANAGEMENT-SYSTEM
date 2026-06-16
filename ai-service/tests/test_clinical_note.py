from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_clinical_note_soap_formatting() -> None:
    response = client.post(
        "/api/v1/ai/format-clinical-note",
        json={
            "raw_note": "patient has fever and cough for two days no chest pain appetite low",
            "format": "SOAP",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["format"] == "SOAP"
    assert payload["data"]["formatted_note"]["subjective"]
    assert payload["data"]["formatted_note"]["objective"] == "Not mentioned"
    assert payload["data"]["formatted_note"]["assessment"] == "Not mentioned"
    assert "must be reviewed" in payload["data"]["safety_disclaimer"]


def test_clinical_format_note_route_returns_soap_sections() -> None:
    response = client.post(
        "/api/v1/clinical/format-note",
        json={
            "rawNote": "Patient has fever and cough for 2 days with low appetite."
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["subjective"]
    assert payload["data"]["objective"]
    assert payload["data"]["assessment"]
    assert payload["data"]["plan"]
    assert payload["data"]["disclaimer"]
