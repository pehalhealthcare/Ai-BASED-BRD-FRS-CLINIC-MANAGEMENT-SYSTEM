from fastapi import UploadFile

from app.config import get_settings
from app.utils.file_utils import validate_upload_file


async def transcribe_audio(file: UploadFile, language: str = "en") -> dict:
    settings = get_settings()

    await validate_upload_file(
        file=file,
        allowed_extensions={".mp3", ".wav", ".m4a", ".webm"},
        field_name="audio",
    )

    engine = "placeholder"

    if settings.whisper_enabled:
        engine = "placeholder-whisper-hook"

    return {
        "transcript": "",
        "language": language or "en",
        "confidence": 0.0,
        "engine": engine,
        "requires_manual_review": True,
    }
