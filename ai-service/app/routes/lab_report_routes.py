from fastapi import APIRouter, File, Form, UploadFile

from app.schemas.common_schema import StandardAIEnvelope
from app.services.lab_report_service import extract_lab_report_upload
from app.utils.response import success_response

router = APIRouter(prefix="/api/v1/ai", tags=["Lab Report Extraction"])
direct_router = APIRouter(prefix="/ai", tags=["Lab Report Extraction"])

LAB_REPORT_RESPONSE_EXAMPLE = {
    "success": True,
    "message": "Lab report extraction completed successfully",
    "data": {
        "output": {
            "raw_text": "Hemoglobin 10.2 g/dL 13.0-17.0",
            "lab_name": {"value": "ABC Diagnostics", "confidence": 0.0, "needs_review": True},
            "report_date": {"value": "2026-04-25", "confidence": 0.0, "needs_review": True},
            "patient_name": {"value": "Rahul Sharma", "confidence": 0.0, "needs_review": True},
            "test_results": [
                {
                    "test_name": "Hemoglobin",
                    "value": 10.2,
                    "unit": "g/dL",
                    "normal_range": "13.0-17.0",
                    "status": "low",
                    "severity": "medium",
                    "confidence": 0.0,
                    "needs_review": True,
                }
            ],
            "abnormal_values": [],
            "critical_values": [],
            "summary": "Some values appear outside the normal range. Doctor/lab technician review is required.",
        },
        "confidence": 0.0,
        "explanation": "Lab report extraction completed using OCR and rule-based normal range detection.",
        "risk_level": "medium",
        "requires_doctor_review": True,
        "requires_human_review": True,
        "model_name": "mock + lab_range_rules",
        "model_version": "phase-18-ocr-0.1.0",
        "model_status": "fallback",
        "audit_id": "example-audit-id",
    },
}


@router.post("/lab-report-extract", summary="Assistive lab report extraction", response_model=StandardAIEnvelope)
async def lab_report_extract(
    file: UploadFile = File(...),
    patient_age: int | None = Form(default=None),
    patient_gender: str | None = Form(default=None),
    report_type: str | None = Form(default=None),
) -> dict:
    response = await extract_lab_report_upload(
        file,
        patient_age=patient_age,
        patient_gender=patient_gender,
        report_type=report_type,
    )
    return success_response("Lab report extraction completed successfully", response.model_dump())


@direct_router.post(
    "/lab-report-extract",
    summary="Foundation lab report extraction endpoint",
    response_model=StandardAIEnvelope,
    responses={
        200: {
            "description": "Structured lab report OCR extraction with rule-based abnormal value detection. Output is assistive only and always requires doctor or lab technician review.",
            "content": {"application/json": {"example": LAB_REPORT_RESPONSE_EXAMPLE}},
        }
    },
)
async def direct_lab_report_extract(
    file: UploadFile = File(...),
    patient_age: int | None = Form(default=None),
    patient_gender: str | None = Form(default=None),
    report_type: str | None = Form(default=None),
) -> dict:
    response = await extract_lab_report_upload(
        file,
        patient_age=patient_age,
        patient_gender=patient_gender,
        report_type=report_type,
    )
    return success_response("Lab report extraction completed successfully", response.model_dump())
