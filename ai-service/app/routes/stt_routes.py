from fastapi import APIRouter, File, Form, UploadFile

from app.core.ai_response_factory import merge_legacy_payload
from app.schemas.common_schema import StandardAIEnvelope
from app.services.stt_service import transcribe_audio_upload
from app.utils.response import success_response

router = APIRouter(prefix="/api/v1/ai", tags=["Speech To Text"])
direct_router = APIRouter(prefix="/ai", tags=["Speech To Text"])
public_router = APIRouter(prefix="/api/v1", tags=["Speech To Text"])


async def _resolve_audio_upload(
    *,
    file: UploadFile | None,
    audio: UploadFile | None,
    language: str | None,
    consultation_id: str | None,
    patient_id: str | None,
    doctor_id: str | None,
):
    selected = file or audio
    if selected is None:
        raise ValueError("An audio file is required")

    return await transcribe_audio_upload(
        file=selected,
        language=language or "auto",
        consultation_id=consultation_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
    )


@router.post("/transcribe", summary="Assistive transcription")
async def transcribe(
    file: UploadFile | None = File(default=None),
    audio: UploadFile | None = File(default=None),
    language: str | None = Form(default="auto"),
    consultation_id: str | None = Form(default=None),
    patient_id: str | None = Form(default=None),
    doctor_id: str | None = Form(default=None),
) -> dict:
    standard_response = await _resolve_audio_upload(
        file=file,
        audio=audio,
        language=language,
        consultation_id=consultation_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
    )
    return success_response("Transcription generated successfully", merge_legacy_payload(standard_response.output, standard_response))


@public_router.post("/transcribe", summary="Public assistive transcription alias")
async def public_transcribe(
    file: UploadFile | None = File(default=None),
    audio: UploadFile | None = File(default=None),
    language: str | None = Form(default="auto"),
    consultation_id: str | None = Form(default=None),
    patient_id: str | None = Form(default=None),
    doctor_id: str | None = Form(default=None),
) -> dict:
    standard_response = await _resolve_audio_upload(
        file=file,
        audio=audio,
        language=language,
        consultation_id=consultation_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
    )
    return success_response("Transcription generated successfully", standard_response.output)


@direct_router.post("/transcribe", summary="Foundation transcribe endpoint", response_model=StandardAIEnvelope)
async def direct_transcribe(
    file: UploadFile | None = File(default=None),
    audio: UploadFile | None = File(default=None),
    language: str | None = Form(default="auto"),
    consultation_id: str | None = Form(default=None),
    patient_id: str | None = Form(default=None),
    doctor_id: str | None = Form(default=None),
) -> dict:
    standard_response = await _resolve_audio_upload(
        file=file,
        audio=audio,
        language=language,
        consultation_id=consultation_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
    )
    return success_response("Transcription generated successfully", standard_response.model_dump())
