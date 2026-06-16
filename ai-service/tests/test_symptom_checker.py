import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.evaluation.adapter_registry import get_adapter_registry
from app.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def _setup_env(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    monkeypatch.setenv("ENABLE_LLM", "true")
    get_settings.cache_clear()
    get_adapter_registry.cache_clear()

def test_symptom_checker_normal_case() -> None:
    response = client.post(
        "/api/v1/ai/symptom-check",
        json={
            "symptoms": "fever, cough and body pain for 2 days",
            "age": 28,
            "gender": "male",
            "duration": "2 days",
            "known_conditions": ["diabetes"],
            "language": "en",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["message"] == "Symptom analysis generated successfully"
    assert len(payload["data"]["possible_conditions"]) <= 3
    assert payload["data"]["recommended_specialization"] == "General Physician"
    assert payload["data"]["urgency"] in {"low", "medium", "high"}
    assert payload["data"]["doctor_note_summary"] == "Patient reports fever, cough and body pain for 2 days. Known conditions: diabetes."
    assert "final diagnosis" in payload["data"]["safety_disclaimer"]


def test_symptom_checker_red_flag_case() -> None:
    response = client.post(
        "/api/v1/ai/symptom-check",
        json={
            "symptoms": "chest pain and severe breathing difficulty since morning",
            "age": 55,
            "gender": "female",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["urgency"] == "high"
    assert payload["data"]["recommended_specialization"] == "Emergency / Urgent Care"
    assert payload["data"]["red_flags"]
