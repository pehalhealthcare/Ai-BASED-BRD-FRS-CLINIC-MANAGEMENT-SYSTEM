from pathlib import Path

from fastapi.testclient import TestClient

from app.core.settings import get_settings
from app.evaluation.adapter_registry import get_adapter_registry
from app.main import app

client = TestClient(app)


class FakeXGBClassifier:
    def __init__(self, **_kwargs):
        self.bias = 0.5

    def fit(self, rows, labels):
        self.bias = sum(labels) / max(1, len(labels))
        return self

    def predict_proba(self, rows):
        probabilities = []

        for row in rows:
            previous_no_shows = row[1]
            previous_cancellations = row[2]
            lead_time_hours = row[3]
            reminder_sent = row[4]
            probability = self.bias + (0.14 * previous_no_shows) + (0.06 * previous_cancellations)

            if lead_time_hours > 168:
                probability += 0.08
            if not reminder_sent:
                probability += 0.05

            probability = max(0.05, min(0.95, probability))
            probabilities.append([1 - probability, probability])

        return probabilities


def _reset_training_environment(monkeypatch, model_dir, min_rows="6"):
    monkeypatch.setenv("NO_SHOW_MODEL_DIR", str(model_dir))
    monkeypatch.setenv("NO_SHOW_MIN_TRAINING_ROWS", min_rows)
    monkeypatch.setenv("NO_SHOW_ENABLE_TRAINING", "true")
    get_settings.cache_clear()
    get_adapter_registry.cache_clear()


def _training_record(index, *, status="attended", previous_no_shows=0, previous_cancellations=0, payment_status="paid"):
    return {
        "patient_id": f"PAT-{index:03d}",
        "appointment_date": "2026-05-10",
        "appointment_time": "11:00",
        "weekday": "monday",
        "doctor_id": f"DOC-{index % 2}",
        "department": "General Physician",
        "booking_source": "reception",
        "previous_visits": max(0, 5 - previous_no_shows),
        "previous_no_shows": previous_no_shows,
        "previous_cancellations": previous_cancellations,
        "lead_time_hours": 24 + (index * 4),
        "reminder_sent": index % 2 == 0,
        "payment_status": payment_status,
        "status": status,
    }


def test_no_show_training_rejects_insufficient_data(tmp_path, monkeypatch) -> None:
    _reset_training_environment(monkeypatch, tmp_path / "insufficient", min_rows="10")

    response = client.post(
        "/ai/train/no-show",
        json={
            "records": [
                _training_record(1, status="attended"),
                _training_record(2, status="no_show", previous_no_shows=2),
                _training_record(3, status="cancelled"),
            ]
        },
    )

    assert response.status_code == 400
    errors = response.json()["errors"]
    assert errors[0]["data"]["model_status"] == "insufficient_data"
    assert errors[0]["data"]["rows_excluded_cancelled"] == 1


def test_no_show_training_saves_model_files_and_excludes_cancelled(tmp_path, monkeypatch) -> None:
    _reset_training_environment(monkeypatch, tmp_path / "trained")
    from app.services import no_show_service

    monkeypatch.setattr(no_show_service, "_load_xgboost_classifier", lambda: FakeXGBClassifier)

    records = [
        _training_record(1, status="attended"),
        _training_record(2, status="attended"),
        _training_record(3, status="no_show", previous_no_shows=2, payment_status="pending"),
        _training_record(4, status="no_show", previous_no_shows=3, previous_cancellations=2, payment_status="pending"),
        _training_record(5, status="attended"),
        _training_record(6, status="cancelled", previous_no_shows=1),
        _training_record(7, status="attended"),
    ]

    response = client.post("/api/v1/ai/train/no-show", json={"records": records})

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["model_status"] == "available"
    assert data["rows_excluded_cancelled"] == 1
    assert Path(data["saved_files"]["model"]).exists()
    assert Path(data["saved_files"]["preprocessor"]).exists()
    assert Path(data["saved_files"]["metadata"]).exists()
    assert Path(data["saved_files"]["metrics"]).exists()


def test_no_show_prediction_uses_trained_model_when_available(tmp_path, monkeypatch) -> None:
    _reset_training_environment(monkeypatch, tmp_path / "trained_predict")
    from app.services import no_show_service

    monkeypatch.setattr(no_show_service, "_load_xgboost_classifier", lambda: FakeXGBClassifier)

    training_records = [
        _training_record(1, status="attended"),
        _training_record(2, status="attended"),
        _training_record(3, status="no_show", previous_no_shows=2, payment_status="pending"),
        _training_record(4, status="no_show", previous_no_shows=3, previous_cancellations=2, payment_status="pending"),
        _training_record(5, status="attended"),
        _training_record(6, status="attended"),
    ]
    train_response = client.post("/api/v1/ai/train/no-show", json={"records": training_records})
    assert train_response.status_code == 200

    get_adapter_registry.cache_clear()

    predict_response = client.post(
        "/ai/no-show-predict",
        json=_training_record(
            20,
            status="attended",
            previous_no_shows=3,
            previous_cancellations=2,
            payment_status="pending",
        ),
    )

    assert predict_response.status_code == 200
    data = predict_response.json()["data"]
    assert data["model_status"] == "available"
    assert data["output"]["risk_score"] >= 0.35
