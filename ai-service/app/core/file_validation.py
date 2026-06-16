from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import get_settings

ALLOWED_DOCUMENT_EXTENSIONS = {".png", ".jpg", ".jpeg", ".pdf"}
ALLOWED_DOCUMENT_CONTENT_TYPES = {
    "image/png",
    "image/jpeg",
    "application/pdf",
    "application/octet-stream",
}


async def validate_upload_file(
    file: UploadFile,
    allowed_extensions: set[str],
    field_name: str,
    *,
    allowed_content_types: set[str] | None = None,
    max_upload_mb: int | None = None,
) -> dict:
    settings = get_settings()
    suffix = Path(file.filename or "").suffix.lower()

    if suffix not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=[
                {
                    "field": field_name,
                    "message": f"Unsupported file type. Allowed: {', '.join(sorted(allowed_extensions))}",
                }
            ],
        )

    normalized_types = {item.lower() for item in (allowed_content_types or set())}
    if normalized_types and (file.content_type or "").lower() not in normalized_types:
        raise HTTPException(
            status_code=400,
            detail=[{"field": field_name, "message": "Unsupported file content type"}],
        )

    contents = await file.read()
    size_limit_mb = max_upload_mb if max_upload_mb is not None else settings.max_upload_mb
    max_bytes = size_limit_mb * 1024 * 1024

    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=[{"field": field_name, "message": f"File exceeds {size_limit_mb} MB limit"}],
        )

    await file.seek(0)

    return {
        "extension": suffix,
        "size_bytes": len(contents),
        "filename": file.filename,
        "content_type": file.content_type,
    }
