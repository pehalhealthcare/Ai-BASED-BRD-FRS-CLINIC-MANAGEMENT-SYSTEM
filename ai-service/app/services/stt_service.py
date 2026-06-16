from fastapi import UploadFile

from app.config import get_settings
from app.core.ai_response_factory import build_standard_ai_response
from app.core.files import ALLOWED_AUDIO_CONTENT_TYPES, ALLOWED_AUDIO_EXTENSIONS, build_temp_audio_path, cleanup_temp_file, save_upload_to_temp
from app.core.safety import AI_TRANSCRIPTION_EXPLANATION, get_ai_draft_disclaimer
from app.evaluation.adapter_registry import get_adapter_registry
from app.services.ai_audit_service import record_ai_audit_event
from app.utils.file_utils import validate_upload_file


async def transcribe_audio_upload(
    *,
    file: UploadFile,
    language: str = "auto",
    consultation_id: str | None = None,
    patient_id: str | None = None,
    doctor_id: str | None = None,
):
    settings = get_settings()
    validated = await validate_upload_file(
        file=file,
        allowed_extensions=ALLOWED_AUDIO_EXTENSIONS,
        field_name="file",
        allowed_content_types=ALLOWED_AUDIO_CONTENT_TYPES,
        max_upload_mb=settings.max_audio_mb,
    )

    temp_path = build_temp_audio_path(file.filename)
    adapter = get_adapter_registry().whisper_stt

    try:
        await save_upload_to_temp(file, temp_path)
        adapter_result = adapter.transcribe(file_path=str(temp_path), language=language or "auto")
    finally:
        cleanup_temp_file(temp_path)

    output = dict(adapter_result.output)
    output.setdefault("language", language or "auto")
    output.setdefault("duration_seconds", 0.0)
    output.setdefault("segments", [])
    output["disclaimer"] = get_ai_draft_disclaimer()
    output["received_file_name"] = validated.get("filename") or ""
    output.pop("fileName", None)

    response = build_standard_ai_response(
        output=output,
        confidence=adapter_result.confidence,
        explanation=adapter_result.explanation or AI_TRANSCRIPTION_EXPLANATION,
        risk_level="low",
        model_name=adapter.model_name,
        model_version=adapter.model_version,
        model_status=adapter_result.model_status,
    )

    record_ai_audit_event(
        audit_id=response.audit_id,
        endpoint="/ai/transcribe",
        patient_id=patient_id,
        payload={
            "language": language or "auto",
            "consultation_id": consultation_id,
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "filename": validated.get("filename"),
            "size_bytes": validated.get("size_bytes"),
        },
        model_provider=adapter.provider or "fallback",
        model_name=response.model_name,
        model_status=response.model_status,
        risk_level=response.risk_level,
        requires_doctor_review=response.requires_doctor_review,
        success=True,
    )

    return response
