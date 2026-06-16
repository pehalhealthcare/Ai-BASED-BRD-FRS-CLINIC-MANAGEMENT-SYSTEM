from fastapi.testclient import TestClient

from app.config import get_settings
from app.evaluation.adapter_registry import get_adapter_registry
from app.main import app

client = TestClient(app)


def _reset_settings_cache() -> None:
    get_settings.cache_clear()
    get_adapter_registry.cache_clear()


def _payload(**overrides):
    return {
        "patient_id": "PAT-001",
        "age": 45,
        "gender": "male",
        "report_date": "2026-04-26",
        "test_results": [{"test_name": "Hemoglobin", "value": 14.0, "unit": "g/dL"}],
        "previous_results": [],
        **overrides,
    }


def test_normal_value_returns_no_abnormal_flag(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("AI_AUDIT_LOG_PATH", str(tmp_path / "ai_audit.jsonl"))
    _reset_settings_cache()

    response = client.post("/ai/lab-analysis", json=_payload())

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["output"]["abnormal_values"] == []
    assert data["output"]["critical_values"] == []
    assert data["risk_level"] == "low"


def test_low_value_returns_abnormal_low() -> None:
    response = client.post(
        "/ai/lab-analysis",
        json=_payload(test_results=[{"test_name": "Hemoglobin", "value": 10.5, "unit": "g/dL"}]),
    )

    assert response.status_code == 200
    abnormal = response.json()["data"]["output"]["abnormal_values"][0]
    assert abnormal["status"] == "low"


def test_high_value_returns_abnormal_high() -> None:
    response = client.post(
        "/ai/lab-analysis",
        json=_payload(test_results=[{"test_name": "Fasting Blood Sugar", "value": 165, "unit": "mg/dL"}]),
    )

    assert response.status_code == 200
    abnormal = response.json()["data"]["output"]["abnormal_values"][0]
    assert abnormal["status"] == "high"


def test_critical_high_returns_critical_value() -> None:
    response = client.post(
        "/ai/lab-analysis",
        json=_payload(test_results=[{"test_name": "WBC", "value": 32000, "unit": "cells/uL"}]),
    )

    assert response.status_code == 200
    critical = response.json()["data"]["output"]["critical_values"][0]
    assert critical["critical_rule"] == "above_critical_threshold"


def test_critical_low_returns_critical_value() -> None:
    response = client.post(
        "/ai/lab-analysis",
        json=_payload(test_results=[{"test_name": "Hemoglobin", "value": 6.5, "unit": "g/dL"}]),
    )

    assert response.status_code == 200
    critical = response.json()["data"]["output"]["critical_values"][0]
    assert critical["critical_rule"] == "below_critical_threshold"


def test_gender_specific_range_works() -> None:
    response = client.post(
        "/ai/lab-analysis",
        json=_payload(gender="female", test_results=[{"test_name": "Hemoglobin", "value": 12.3, "unit": "g/dL"}]),
    )

    assert response.status_code == 200
    assert response.json()["data"]["output"]["abnormal_values"] == []


def test_age_specific_range_works() -> None:
    response = client.post(
        "/ai/lab-analysis",
        json=_payload(age=10, test_results=[{"test_name": "Creatinine", "value": 1.2, "unit": "mg/dL"}]),
    )

    assert response.status_code == 200
    abnormal = response.json()["data"]["output"]["abnormal_values"][0]
    assert abnormal["test_name"] == "Creatinine"


def test_alias_mapping_works() -> None:
    response = client.post(
        "/ai/lab-analysis",
        json=_payload(test_results=[{"test_name": "FBS", "value": 130, "unit": "mg/dL"}]),
    )

    assert response.status_code == 200
    abnormal = response.json()["data"]["output"]["abnormal_values"][0]
    assert abnormal["test_name"] == "Fasting Blood Sugar"


def test_missing_reference_range_returns_manual_review() -> None:
    response = client.post(
        "/ai/lab-analysis",
        json=_payload(test_results=[{"test_name": "Unknown Marker", "value": 42, "unit": "mg/dL"}]),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["model_status"] == "insufficient_reference_data"
    assert data["output"]["manual_review_items"][0]["reason"] == "missing_reference_range"


def test_unit_mismatch_returns_manual_review() -> None:
    response = client.post(
        "/ai/lab-analysis",
        json=_payload(test_results=[{"test_name": "Creatinine", "value": 1.1, "unit": "umol/L"}]),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["model_status"] == "available"
    assert data["output"]["manual_review_items"][0]["reason"] == "unit_mismatch"


def test_trend_increasing_works() -> None:
    response = client.post(
        "/ai/lab-analysis",
        json=_payload(
            test_results=[{"test_name": "Creatinine", "value": 1.2, "unit": "mg/dL"}],
            previous_results=[
                {
                    "report_date": "2026-03-26",
                    "test_name": "Creatinine",
                    "value": 1.0,
                    "unit": "mg/dL",
                }
            ],
        ),
    )

    assert response.status_code == 200
    trend = response.json()["data"]["output"]["trend_summary"][0]
    assert trend["trend"] == "increasing"


def test_trend_decreasing_works() -> None:
    response = client.post(
        "/ai/lab-analysis",
        json=_payload(
            test_results=[{"test_name": "Hemoglobin", "value": 10.5, "unit": "g/dL"}],
            previous_results=[
                {
                    "report_date": "2026-03-26",
                    "test_name": "Hemoglobin",
                    "value": 12.1,
                    "unit": "g/dL",
                }
            ],
        ),
    )

    assert response.status_code == 200
    trend = response.json()["data"]["output"]["trend_summary"][0]
    assert trend["trend"] == "decreasing"


def test_trend_stable_works() -> None:
    response = client.post(
        "/ai/lab-analysis",
        json=_payload(
            test_results=[{"test_name": "Creatinine", "value": 1.04, "unit": "mg/dL"}],
            previous_results=[
                {
                    "report_date": "2026-03-26",
                    "test_name": "Creatinine",
                    "value": 1.0,
                    "unit": "mg/dL",
                }
            ],
        ),
    )

    assert response.status_code == 200
    trend = response.json()["data"]["output"]["trend_summary"][0]
    assert trend["trend"] == "stable"


def test_no_previous_data_handled_safely() -> None:
    response = client.post("/ai/lab-analysis", json=_payload(previous_results=[]))

    assert response.status_code == 200
    assert response.json()["data"]["output"]["trend_status"] == "no_previous_data"


def test_response_follows_standardized_ai_response_schema() -> None:
    response = client.post("/ai/lab-analysis", json=_payload())

    assert response.status_code == 200
    data = response.json()["data"]
    assert {
        "output",
        "confidence",
        "explanation",
        "risk_level",
        "requires_doctor_review",
        "requires_human_review",
        "model_name",
        "model_version",
        "model_status",
        "audit_id",
    }.issubset(data.keys())


def test_invalid_input_returns_422() -> None:
    response = client.post("/ai/lab-analysis", json={"test_results": []})

    assert response.status_code == 422


def test_missing_reference_file_returns_safe_unavailable_response(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("AI_AUDIT_LOG_PATH", str(tmp_path / "ai_audit.jsonl"))
    _reset_settings_cache()

    from app.rules import lab_reference_ranges

    original_path = lab_reference_ranges.REFERENCE_FILE_PATH
    lab_reference_ranges.REFERENCE_FILE_PATH = tmp_path / "missing.json"
    try:
        response = client.post("/ai/lab-analysis", json=_payload())
    finally:
        lab_reference_ranges.REFERENCE_FILE_PATH = original_path

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["model_status"] == "unavailable"
    assert "Lab reference data unavailable." in data["output"]["notes"]
