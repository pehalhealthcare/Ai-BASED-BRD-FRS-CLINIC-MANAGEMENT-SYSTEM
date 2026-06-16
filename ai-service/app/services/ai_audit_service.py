import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger("ai-audit")


def _audit_path() -> Path:
    settings = get_settings()
    configured = getattr(settings, "ai_audit_log_path", None) or "storage/ai_audit.jsonl"
    return Path(configured)


def _hash_payload(payload: dict[str, Any]) -> str:
    normalized = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(normalized).hexdigest()


def record_ai_audit_event(
    *,
    audit_id: str,
    endpoint: str,
    patient_id: str | None,
    payload: dict[str, Any],
    model_provider: str,
    model_name: str,
    model_status: str,
    risk_level: str,
    requires_doctor_review: bool,
    success: bool,
    error_message: str | None = None,
) -> None:
    record = {
        "audit_id": audit_id,
        "endpoint": endpoint,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "patient_id": patient_id,
        "input_hash": _hash_payload(payload),
        "model_provider": model_provider,
        "model_name": model_name,
        "model_status": model_status,
        "risk_level": risk_level,
        "requires_doctor_review": requires_doctor_review,
        "success": success,
        "error_message": error_message,
    }

    try:
        path = _audit_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record) + "\n")
    except Exception as exc:  # pragma: no cover - audit logging should never crash business flow
        logger.error("Failed to persist AI audit event: %s", exc)

    logger.info("AI audit event: %s", json.dumps(record))
