from fastapi.testclient import TestClient

from app.config import get_settings
from app.evaluation.adapter_registry import get_adapter_registry
from app.main import app

client = TestClient(app)


def _reset_settings_cache() -> None:
    get_settings.cache_clear()
    get_adapter_registry.cache_clear()


def test_ocr_upload_legacy_alias_still_requires_review(monkeypatch) -> None:
    monkeypatch.setenv("OCR_PROVIDER", "mock")
    monkeypatch.setenv("OCR_ENABLED", "true")
    _reset_settings_cache()

    response = client.post(
        "/api/v1/ai/ocr-patient-document",
        files={"file": ("sample.png", b"Name: Rahul Sharma\nPhone: 9876543210", "image/png")},
        data={"document_type": "patient_id"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["requires_manual_review"] is True


def test_transcribe_placeholder_upload() -> None:
    response = client.post(
        "/api/v1/ai/transcribe",
        files={"audio": ("sample.wav", b"fake-audio-bytes", "audio/wav")},
        data={"language": "en"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["engine"] in {"placeholder", "stt-disabled", "unavailable", "runtime-error"}
    assert payload["data"]["requires_doctor_review"] is True
