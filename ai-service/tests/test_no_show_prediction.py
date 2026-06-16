from app.evaluation.adapter_registry import get_adapter_registry
from app.main import app
from app.core.settings import get_settings
from fastapi.testclient import TestClient

client = TestClient(app)


def _reset_no_show_environment(monkeypatch, model_dir, min_rows="100"):
    monkeypatch.setenv("NO_SHOW_MODEL_DIR", str(model_dir))
    monkeypatch.setenv("NO_SHOW_MIN_TRAINING_ROWS", min_rows)
    get_settings.cache_clear()
    get_adapter_registry.cache_clear()


def _payload(**overrides):
    payload = {
        "patient_id": "PAT-0001",
        "appointment_date": "2026-05-01",
        "appointment_time": "10:30",
        "doctor_id": "DOC-001",
        "department": "General Physician",
        "booking_source": "reception",
        "previous_visits": 4,
        "previous_no_shows": 0,
        "previous_cancellations": 0,
        "lead_time_hours": 8,
        "reminder_sent": True,
        "payment_status": "paid",
    }
    payload.update(overrides)
    return payload


def test_no_show_predict_returns_fallback_when_model_missing(tmp_path, monkeypatch) -> None:
    _reset_no_show_environment(monkeypatch, tmp_path / "no_show_missing")

    response = client.post("/ai/no-show-predict", json=_payload())

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["model_status"] == "fallback"
    assert data["audit_id"]
    assert data["output"]["requires_staff_review"] is True
    assert data["output"]["risk_level"] in {"low", "medium", "high"}


def test_no_show_predict_high_risk_for_multiple_previous_no_shows(tmp_path, monkeypatch) -> None:
    _reset_no_show_environment(monkeypatch, tmp_path / "no_show_high")

    response = client.post(
        "/api/v1/ai/no-show",
        json=_payload(
            previous_visits=1,
            previous_no_shows=3,
            previous_cancellations=2,
            reminder_sent=False,
            lead_time_hours=240,
            payment_status="pending",
        ),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["risk_level"] == "high"
    assert "HIGH_PREVIOUS_NO_SHOWS" in data["reason_codes"]


def test_no_show_predict_low_risk_with_good_attendance_history(tmp_path, monkeypatch) -> None:
    _reset_no_show_environment(monkeypatch, tmp_path / "no_show_low")

    response = client.post(
        "/api/v1/ai/no-show",
        json=_payload(
            previous_visits=6,
            previous_no_shows=0,
            previous_cancellations=0,
            reminder_sent=True,
            lead_time_hours=4,
            payment_status="paid",
        ),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["risk_level"] in {"low", "medium"}
    assert data["requires_staff_review"] is True
