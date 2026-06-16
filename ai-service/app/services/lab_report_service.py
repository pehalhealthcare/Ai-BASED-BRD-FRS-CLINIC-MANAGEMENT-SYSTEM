from __future__ import annotations

import json
import re
from pathlib import Path

from fastapi import UploadFile

from app.core.ai_response_factory import build_standard_ai_response
from app.core.confidence import bounded_confidence, needs_review
from app.services.ai_audit_service import record_ai_audit_event
from app.services.ocr_service import extract_ocr_payload_from_upload

REFERENCE_RANGES = json.loads((Path(__file__).resolve().parents[1] / "data" / "lab_reference_ranges.json").read_text(encoding="utf-8"))


def _normalized_lines(raw_text: str) -> list[str]:
    return [line.strip() for line in (raw_text or "").splitlines() if line.strip()]


def _confidence_for_line(line: str, pages: list[dict]) -> float:
    lowered = line.lower()
    for page in pages:
        if lowered in (page.get("text") or "").lower():
            return bounded_confidence(page.get("confidence", 0.0))
    return 0.0


def _range_for_test(config: dict, gender: str | None) -> tuple[float | None, float | None]:
    normalized_gender = (gender or "").strip().lower()
    if "ranges" in config:
        for item in config.get("ranges", []):
            item_gender = (item.get("gender") or "any").strip().lower()
            if item_gender in {"any", normalized_gender}:
                return item.get("normal_min"), item.get("normal_max")
        return None, None

    selected = config.get(normalized_gender) or config.get("default") or {}
    return selected.get("min"), selected.get("max")


def _format_range(min_value: float | None, max_value: float | None) -> str | None:
    if min_value is None and max_value is None:
        return None
    return f"{min_value}-{max_value}"


def _severity_for_value(value: float, min_value: float | None, max_value: float | None, status: str) -> str:
    if status == "normal":
        return "low"
    if min_value is None and max_value is None:
        return "low"
    boundary = min_value if status == "low" else max_value
    if boundary in {None, 0}:
        return "medium"
    deviation = abs(value - boundary) / abs(boundary)
    if deviation >= 0.5:
        return "critical"
    if deviation >= 0.25:
        return "high"
    return "medium"


def _extract_lab_metadata(raw_text: str, pages: list[dict]) -> dict:
    fields = {
        "lab_name": {"value": None, "confidence": 0.0, "needs_review": True},
        "report_date": {"value": None, "confidence": 0.0, "needs_review": True},
        "patient_name": {"value": None, "confidence": 0.0, "needs_review": True},
    }

    for line in _normalized_lines(raw_text):
        lowered = line.lower()
        confidence = _confidence_for_line(line, pages)
        if not fields["lab_name"]["value"] and any(token in lowered for token in ["diagnostic", "diagnostics", "laboratory", "lab "]):
            fields["lab_name"] = {"value": line[:120], "confidence": confidence, "needs_review": True}

        if not fields["patient_name"]["value"]:
            match = re.search(r"(?:patient\s+name|name)\s*[:\-]\s*([A-Za-z][A-Za-z .]{2,})", line, flags=re.IGNORECASE)
            if match:
                fields["patient_name"] = {"value": match.group(1).strip(), "confidence": confidence, "needs_review": True}

        if not fields["report_date"]["value"]:
            match = re.search(r"(?:date|report\s+date|collected\s+on)\s*[:\-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})", line, flags=re.IGNORECASE)
            if match:
                fields["report_date"] = {"value": match.group(1).strip(), "confidence": confidence, "needs_review": True}

    return fields


def _extract_test_results(raw_text: str, pages: list[dict], patient_gender: str | None) -> list[dict]:
    lines = _normalized_lines(raw_text)
    results = []
    seen = set()

    for canonical_name, config in REFERENCE_RANGES.items():
        aliases = [canonical_name.lower(), *[alias.lower() for alias in config.get("aliases", [])]]

        for line in lines:
            lowered = line.lower()
            if not any(alias in lowered for alias in aliases):
                continue

            key = (canonical_name, line)
            if key in seen:
                continue
            seen.add(key)

            matched_alias = next(alias for alias in aliases if alias in lowered)
            tail = line[lowered.index(matched_alias) + len(matched_alias) :]
            value_match = re.search(r"([<>]?\s*-?\d+(?:\.\d+)?)", tail)
            if not value_match:
                continue

            numeric_raw = value_match.group(1).replace(" ", "").replace("<", "").replace(">", "")
            try:
                value = float(numeric_raw)
            except ValueError:
                continue

            unit_match = re.search(rf"{re.escape(value_match.group(1))}\s*([A-Za-z/%µ^0-9.-]+)", tail)
            inline_range = re.search(r"(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)", tail)
            min_value, max_value = _range_for_test(config, patient_gender)
            status = "unknown"

            if min_value is not None and value < float(min_value):
                status = "low"
            elif max_value is not None and value > float(max_value):
                status = "high"
            elif min_value is not None or max_value is not None:
                status = "normal"

            severity = _severity_for_value(value, min_value, max_value, status)
            confidence = _confidence_for_line(line, pages)
            normal_range = inline_range.group(0) if inline_range else _format_range(min_value, max_value)

            results.append(
                {
                    "test_name": canonical_name,
                    "value": value,
                    "unit": unit_match.group(1) if unit_match else config.get("unit"),
                    "normal_range": normal_range,
                    "status": "critical" if severity == "critical" and status in {"low", "high"} else status,
                    "severity": severity,
                    "confidence": confidence,
                    "needs_review": needs_review(confidence) or status != "normal",
                }
            )

    return results


async def extract_lab_report_upload(
    file: UploadFile,
    *,
    patient_age: int | None = None,
    patient_gender: str | None = None,
    report_type: str | None = None,
):
    from app.config import get_settings

    settings = get_settings()
    payload = await extract_ocr_payload_from_upload(file, document_type="lab_report", language=settings.ocr_language)
    metadata = _extract_lab_metadata(payload["raw_text"], payload["pages"])
    test_results = _extract_test_results(payload["raw_text"], payload["pages"], patient_gender)
    abnormal_values = [item for item in test_results if item["status"] in {"low", "high", "critical"}]
    critical_values = [item for item in test_results if item["severity"] == "critical" or item["status"] == "critical"]

    summary = (
        "Some values appear outside the normal range. Doctor/lab technician review is required."
        if abnormal_values
        else "No obvious abnormal values were extracted, but human review is still required."
    )

    output = {
        "raw_text": payload["raw_text"],
        "lab_name": metadata["lab_name"],
        "report_date": metadata["report_date"],
        "patient_name": metadata["patient_name"],
        "test_results": test_results,
        "abnormal_values": abnormal_values,
        "critical_values": critical_values,
        "summary": summary,
    }

    response = build_standard_ai_response(
        output=output,
        confidence=payload["confidence"],
        explanation=payload["explanation"] or "Lab report extraction completed using OCR and rule-based normal range detection.",
        risk_level="critical" if critical_values else "medium" if abnormal_values else "low",
        requires_doctor_review=True,
        requires_human_review=True,
        model_name=f"{payload['model_name']} + lab_range_rules",
        model_version=payload["model_version"],
        model_status=payload["model_status"],
    )

    record_ai_audit_event(
        audit_id=response.audit_id,
        endpoint="/ai/lab-report-extract",
        patient_id=None,
        payload={
            "filename": payload["validated"].get("filename"),
            "size_bytes": payload["validated"].get("size_bytes"),
            "patient_age": patient_age,
            "patient_gender": patient_gender,
            "report_type": report_type,
        },
        model_provider=settings.ocr_provider,
        model_name=response.model_name,
        model_status=response.model_status,
        risk_level=response.risk_level,
        requires_doctor_review=response.requires_doctor_review,
        success=True,
    )

    return response
