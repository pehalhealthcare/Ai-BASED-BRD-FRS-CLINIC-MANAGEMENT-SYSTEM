from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_no_show_low_risk() -> None:
    response = client.post(
        "/api/v1/ai/no-show",
        json={
            "patient_id": "PAT-00001",
            "appointment_time": "2026-04-25T10:30:00Z",
            "previous_appointments": 5,
            "missed_appointments": 0,
            "cancelled_appointments": 0,
            "is_first_visit": False,
            "booking_channel": "reception",
            "confirmation_status": "confirmed",
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["risk_level"] == "low"


def test_no_show_medium_risk() -> None:
    response = client.post(
        "/api/v1/ai/no-show",
        json={
            "patient_id": "PAT-00002",
            "appointment_time": "2026-04-25T10:30:00Z",
            "previous_appointments": 5,
            "missed_appointments": 1,
            "cancelled_appointments": 0,
            "is_first_visit": False,
            "booking_channel": "reception",
            "confirmation_status": "pending",
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["risk_level"] == "medium"


def test_no_show_high_risk() -> None:
    response = client.post(
        "/api/v1/ai/no-show",
        json={
            "patient_id": "PAT-00003",
            "appointment_time": "2026-04-25T18:30:00Z",
            "previous_appointments": 3,
            "missed_appointments": 2,
            "cancelled_appointments": 2,
            "is_first_visit": True,
            "booking_channel": "chatbot",
            "confirmation_status": "pending",
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["risk_level"] == "high"
