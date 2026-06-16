from fastapi.testclient import TestClient

from app.config import get_settings
from app.evaluation.adapter_registry import get_adapter_registry
from app.main import app

client = TestClient(app)


def _reset_settings_cache() -> None:
    get_settings.cache_clear()
    get_adapter_registry.cache_clear()


def test_ocr_extract_accepts_mock_image_and_masks_sensitive_fields(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("AI_AUDIT_LOG_PATH", str(tmp_path / "ai_audit.jsonl"))
    monkeypatch.setenv("OCR_PROVIDER", "mock")
    monkeypatch.setenv("OCR_ENABLED", "true")
    monkeypatch.setenv("MASK_SENSITIVE_FIELDS", "true")
    _reset_settings_cache()

    content = b"Name: Rahul Sharma\nDOB: 12/05/1999\nPhone: 9876543210\nAadhaar: 123412341234"
    response = client.post(
        "/ai/ocr-extract",
        files={"file": ("sample.png", content, "image/png")},
        data={"document_type": "patient_id", "language": "en"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["requires_human_review"] is True
    assert data["audit_id"]
    assert data["model_status"] in {"fallback", "available"}
    assert data["output"]["extracted_fields"]["aadhaar_like_number"]["value"] == "XXXX-XXXX-1234"
    assert data["output"]["extracted_fields"]["phone"]["value"] == "98XXXXXX10"
    assert data["output"]["extracted_fields"]["phone"]["needs_review"] is True


def test_ocr_extract_rejects_unsupported_file_type(monkeypatch) -> None:
    monkeypatch.setenv("OCR_PROVIDER", "mock")
    _reset_settings_cache()

    response = client.post(
        "/ai/ocr-extract",
        files={"file": ("sample.exe", b"bad", "application/octet-stream")},
    )

    assert response.status_code == 400
    assert response.json()["success"] is False


def test_ocr_extract_rejects_large_file(monkeypatch) -> None:
    monkeypatch.setenv("OCR_PROVIDER", "mock")
    monkeypatch.setenv("OCR_MAX_FILE_MB", "1")
    _reset_settings_cache()

    response = client.post(
        "/ai/ocr-extract",
        files={"file": ("sample.png", b"a" * (1024 * 1024 + 1), "image/png")},
    )

    assert response.status_code == 400
    assert response.json()["success"] is False


def test_ocr_extract_uses_fallback_when_primary_provider_is_unavailable(monkeypatch) -> None:
    monkeypatch.setenv("OCR_PROVIDER", "paddleocr")
    monkeypatch.setenv("OCR_FALLBACK_PROVIDER", "mock")
    monkeypatch.setenv("OCR_ENABLED", "true")
    _reset_settings_cache()

    response = client.post(
        "/ai/ocr-extract",
        files={"file": ("sample.png", b"Name: Riya Sharma", "image/png")},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["model_status"] == "fallback"


def test_ocr_extract_low_confidence_fields_are_marked_for_review(monkeypatch) -> None:
    monkeypatch.setenv("OCR_PROVIDER", "mock")
    _reset_settings_cache()

    response = client.post(
        "/ai/ocr-extract",
        files={"file": ("sample.pdf", b"Name: Mohan Kumar", "application/pdf")},
        data={"document_type": "generic"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["output"]["extracted_fields"]["name"]["needs_review"] is True

