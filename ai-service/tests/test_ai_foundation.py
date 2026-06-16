import json

from fastapi.testclient import TestClient

from app.config import get_settings
from app.evaluation.adapter_registry import get_adapter_registry
from app.main import app

client = TestClient(app)


def _reset_settings_cache() -> None:
    get_settings.cache_clear()
    get_adapter_registry.cache_clear()


def test_symptom_check_normal_case_returns_phase_16_shape(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("AI_AUDIT_LOG_PATH", str(tmp_path / "ai_audit.jsonl"))
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    monkeypatch.setenv("ENABLE_LLM", "true")
    _reset_settings_cache()

    response = client.post(
        "/ai/symptom-check",
        json={
            "symptoms": "fever, cough, sore throat for 2 days",
            "age": 25,
            "gender": "male",
            "duration": "2 days",
            "known_conditions": ["asthma"],
            "current_medications": [],
            "allergies": [],
            "patient_id": "PAT-001",
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["model_status"] == "available"
    assert data["requires_doctor_review"] is True
    assert data["audit_id"]
    assert data["output"]["top_3_possible_conditions"]
    assert data["output"]["recommended_department"]["name"] == "General Physician"
    assert "final diagnosis" in data["output"]["disclaimer"].lower()

    audit_lines = (tmp_path / "ai_audit.jsonl").read_text(encoding="utf-8").strip().splitlines()
    last_record = json.loads(audit_lines[-1])
    assert last_record["audit_id"] == data["audit_id"]
    assert last_record["endpoint"] == "/ai/symptom-check"
    assert last_record["patient_id"] == "PAT-001"
    assert last_record["input_hash"]
    assert last_record["success"] is True


def test_symptom_check_chest_pain_case_is_critical(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    monkeypatch.setenv("ENABLE_LLM", "true")
    _reset_settings_cache()

    response = client.post(
        "/ai/symptom-check",
        json={
            "symptoms": "severe chest pain and severe breathing difficulty since morning",
            "age": 58,
            "gender": "female",
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["risk_level"] == "critical"
    assert any(flag["flag"] == "chest_pain" for flag in data["output"]["red_flags"])


def test_symptom_check_missing_llm_key_returns_fallback(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_API_KEY", "")
    monkeypatch.setenv("ENABLE_LLM", "true")
    monkeypatch.setenv("ENABLE_AI_FALLBACKS", "true")
    _reset_settings_cache()

    response = client.post(
        "/ai/symptom-check",
        json={
            "symptoms": "fever and cough",
            "age": 30,
            "gender": "male",
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["model_status"] == "fallback"
    assert data["output"]["top_3_possible_conditions"]


def test_diagnosis_assist_requires_doctor_review_and_avoids_final_diagnosis_wording(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    monkeypatch.setenv("ENABLE_LLM", "true")
    _reset_settings_cache()

    response = client.post(
        "/ai/diagnosis-assist",
        json={
            "patient_id": "PAT-002",
            "symptoms": "cough and fever for 2 days",
            "history": "Known asthma. No recent travel.",
            "vitals": {"temperature": 101, "spo2": 98, "pulse": 90},
            "known_conditions": ["asthma"],
            "current_medications": [],
            "allergies": [],
            "lab_summary": "",
            "doctor_notes": "",
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    flattened = json.dumps(data["output"]).lower()
    assert data["requires_doctor_review"] is True
    assert "definitely has" not in flattened
    assert "confirmed diagnosis" not in flattened
    assert "final diagnosis" in data["output"]["disclaimer"].lower()


def test_department_mapping_and_response_schema_consistency(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    monkeypatch.setenv("ENABLE_LLM", "true")
    _reset_settings_cache()

    response = client.post(
        "/ai/symptom-check",
        json={
            "symptoms": "itchy skin rash on arms",
            "age": 19,
            "gender": "female",
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["output"]["recommended_department"]["name"] == "Dermatology"
    assert set(
        [
            "output",
            "confidence",
            "explanation",
            "risk_level",
            "requires_doctor_review",
            "model_name",
            "model_version",
            "model_status",
            "audit_id",
        ]
    ).issubset(data.keys())


def test_unsafe_prescription_or_dosage_output_is_blocked(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    monkeypatch.setenv("ENABLE_LLM", "true")
    _reset_settings_cache()

    response = client.post(
        "/ai/diagnosis-assist",
        json={
            "symptoms": "fever and cough",
            "history": "Patient asks if they should take 500 mg antibiotics immediately.",
            "vitals": {"temperature": 100},
            "known_conditions": [],
            "current_medications": [],
            "allergies": [],
            "doctor_notes": "Do not provide dosage advice.",
        },
    )

    assert response.status_code == 200
    flattened = json.dumps(response.json()["data"]["output"]).lower()
    assert "take 500 mg" not in flattened
    assert "start antibiotics" not in flattened
