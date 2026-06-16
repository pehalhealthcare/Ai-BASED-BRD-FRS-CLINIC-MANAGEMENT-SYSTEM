from fastapi.testclient import TestClient

from app.config import get_settings
from app.evaluation.adapter_registry import get_adapter_registry
from app.main import app
from app.adapters.whisper_adapter import WhisperAdapter

client = TestClient(app)


def _reset_caches() -> None:
    get_settings.cache_clear()
    get_adapter_registry.cache_clear()


def test_transcribe_rejects_unsupported_file_type(monkeypatch) -> None:
    monkeypatch.setenv("ENABLE_STT", "true")
    monkeypatch.setenv("STT_PROVIDER", "mock")
    _reset_caches()

    response = client.post(
        "/ai/transcribe",
        files={"file": ("sample.txt", b"not-audio", "text/plain")},
        data={"language": "en"},
    )

    assert response.status_code == 400
    assert response.json()["success"] is False


def test_transcribe_rejects_oversized_file(monkeypatch) -> None:
    monkeypatch.setenv("ENABLE_STT", "true")
    monkeypatch.setenv("STT_PROVIDER", "mock")
    monkeypatch.setenv("MAX_AUDIO_MB", "1")
    _reset_caches()

    response = client.post(
        "/ai/transcribe",
        files={"file": ("sample.wav", b"0" * (1024 * 1024 + 32), "audio/wav")},
        data={"language": "en"},
    )

    assert response.status_code == 400
    assert response.json()["success"] is False


def test_transcribe_returns_safe_unavailable_when_model_missing(monkeypatch) -> None:
    monkeypatch.setenv("ENABLE_STT", "true")
    monkeypatch.setenv("STT_PROVIDER", "faster_whisper")
    _reset_caches()

    def fail_load(self):
        raise RuntimeError("missing whisper runtime")

    monkeypatch.setattr(WhisperAdapter, "_load_faster_whisper", fail_load)

    response = client.post(
        "/ai/transcribe",
        files={"file": ("sample.wav", b"fake-audio-bytes", "audio/wav")},
        data={"language": "en"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["model_status"] == "unavailable"
    assert data["requires_doctor_review"] is True
    assert data["output"]["transcript"] == ""
