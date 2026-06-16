from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.settings import get_settings

ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".webm", ".ogg"}
ALLOWED_AUDIO_CONTENT_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/webm",
    "audio/ogg",
    "application/octet-stream",
}


def build_temp_document_path(filename: str | None) -> Path:
    settings = get_settings()
    suffix = Path(filename or "document.pdf").suffix.lower() or ".pdf"
    temp_dir = Path(settings.document_temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)
    return temp_dir / f"{uuid4()}{suffix}"


def build_temp_audio_path(filename: str | None) -> Path:
    settings = get_settings()
    suffix = Path(filename or "audio.webm").suffix.lower() or ".webm"
    temp_dir = Path(settings.audio_temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)
    return temp_dir / f"{uuid4()}{suffix}"


async def save_upload_to_temp(file: UploadFile, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    await file.seek(0)
    with destination.open("wb") as handle:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)
    await file.seek(0)


def cleanup_temp_file(path: Path | None) -> None:
    if not path:
        return

    try:
        if path.exists():
            path.unlink()
    except OSError:
        pass
