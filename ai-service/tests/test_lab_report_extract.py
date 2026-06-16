from fastapi.testclient import TestClient

from app.config import get_settings
from app.evaluation.adapter_registry import get_adapter_registry
from app.main import app

client = TestClient(app)


def _reset_settings_cache() -> None:
    get_settings.cache_clear()
    get_adapter_registry.cache_clear()


def test_lab_report_extract_returns_test_results_and_abnormal_detection(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("AI_AUDIT_LOG_PATH", str(tmp_path / "ai_audit.jsonl"))
    monkeypatch.setenv("OCR_PROVIDER", "mock")
    monkeypatch.setenv("OCR_ENABLED", "true")
    _reset_settings_cache()

    report = (
        b"ABC Diagnostics\n"
        b"Patient Name: Rahul Sharma\n"
        b"Report Date: 2026-04-25\n"
        b"Hemoglobin 10.2 g/dL 13.0-17.0\n"
        b"WBC Count 12000 /cumm 4000-11000\n"
    )
    response = client.post(
        "/ai/lab-report-extract",
        files={"file": ("report.pdf", report, "application/pdf")},
        data={"patient_gender": "male"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["requires_doctor_review"] is True
    assert data["requires_human_review"] is True
    assert data["output"]["test_results"]
    statuses = {item["test_name"]: item["status"] for item in data["output"]["test_results"]}
    assert statuses["Hemoglobin"] in {"low", "critical"}
    assert (statuses.get("WBC") or statuses.get("Wbc")) in {"high", "critical"}


def test_lab_report_extract_standard_response_schema(monkeypatch) -> None:
    monkeypatch.setenv("OCR_PROVIDER", "mock")
    _reset_settings_cache()

    response = client.post(
        "/ai/lab-report-extract",
        files={"file": ("report.png", b"Creatinine 0.9 mg/dL 0.6-1.3", "image/png")},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert set(
        [
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
        ]
    ).issubset(data.keys())
