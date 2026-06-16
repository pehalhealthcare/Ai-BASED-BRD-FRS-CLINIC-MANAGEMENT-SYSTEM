from fastapi.testclient import TestClient

from app.config import get_settings
from app.evaluation.adapter_registry import get_adapter_registry
from app.main import app

client = TestClient(app)


def _reset_caches() -> None:
    get_settings.cache_clear()
    get_adapter_registry.cache_clear()


def test_format_clinical_note_returns_soap_structure(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    monkeypatch.setenv("ENABLE_LLM", "true")
    _reset_caches()

    response = client.post(
        "/ai/format-clinical-note",
        json={
            "transcript": "patient says fever and cough for two days and poor appetite",
            "format": "SOAP",
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["output"]["note_type"] == "SOAP"
    assert set(["subjective", "objective", "assessment", "plan", "draft_ai_note", "missing_information"]).issubset(
        data["output"].keys()
    )


def test_format_clinical_note_does_not_invent_missing_values(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    monkeypatch.setenv("ENABLE_AI_FALLBACKS", "true")
    _reset_caches()

    response = client.post(
        "/ai/format-clinical-note",
        json={
            "transcript": "patient says fever and cough for two days",
            "format": "SOAP",
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["requires_doctor_review"] is True
    assert data["output"]["objective"] == "Not mentioned"
    assert data["output"]["assessment"] == "Not mentioned"
    assert data["output"]["plan"] == "Not mentioned"
