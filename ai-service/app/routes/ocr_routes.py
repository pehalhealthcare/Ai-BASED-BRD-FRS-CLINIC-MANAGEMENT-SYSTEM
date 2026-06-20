from fastapi import APIRouter, File, Form, UploadFile

from app.core.ai_response_factory import merge_legacy_payload
from app.schemas.common_schema import StandardAIEnvelope
from app.services.ocr_service import extract_document_upload
from app.utils.response import success_response

router = APIRouter(prefix="/api/v1/ai", tags=["OCR"])
direct_router = APIRouter(prefix="/ai", tags=["OCR"])

OCR_RESPONSE_EXAMPLE = {
    "success": True,
    "message": "OCR extraction completed successfully",
    "data": {
        "output": {
            "document_type": "patient_id",
            "raw_text": "Name: Rahul Sharma\nDOB: 12/05/1999\nPhone: 9876543210\nAadhaar: 123412341234",
            "pages": [{"page_number": 1, "text": "Name: Rahul Sharma", "confidence": 0.0}],
            "extracted_fields": {
                "name": {"value": "Rahul Sharma", "confidence": 0.0, "needs_review": True, "source": "ocr", "masked": False},
                "phone": {"value": "98XXXXXX10", "confidence": 0.0, "needs_review": True, "source": "ocr", "masked": True},
                "aadhaar_like_number": {
                    "value": "XXXX-XXXX-1234",
                    "confidence": 0.0,
                    "needs_review": True,
                    "source": "ocr",
                    "masked": True,
                },
            },
            "requires_manual_review": True,
            "safety_note": "OCR result must be verified by clinic staff before saving.",
        },
        "confidence": 0.0,
        "explanation": "OCR extraction completed. Some fields require manual review.",
        "risk_level": "medium",
        "requires_doctor_review": False,
        "requires_human_review": True,
        "model_name": "mock",
        "model_version": "phase-18-ocr-0.1.0",
        "model_status": "fallback",
        "audit_id": "example-audit-id",
    },
}


@router.post("/ocr-extract", summary="Assistive OCR extraction", response_model=StandardAIEnvelope)
async def ocr_extract(
    file: UploadFile = File(...),
    document_type: str | None = Form(default=None),
    language: str | None = Form(default="auto"),
    mask_sensitive_fields: bool = Form(default=True),
) -> dict:
    response = await extract_document_upload(
        file, document_type=document_type, language=language, mask_sensitive_fields=mask_sensitive_fields
    )
    return success_response("OCR extraction completed successfully", response.model_dump())


@direct_router.post(
    "/ocr-extract",
    summary="Foundation OCR extraction endpoint",
    response_model=StandardAIEnvelope,
    responses={
        200: {
            "description": "Structured OCR output for review-first patient document extraction. Sensitive fields are masked by default and `requires_human_review` is always true.",
            "content": {"application/json": {"example": OCR_RESPONSE_EXAMPLE}},
        }
    },
)
async def direct_ocr_extract(
    file: UploadFile = File(...),
    document_type: str | None = Form(default=None),
    language: str | None = Form(default="auto"),
    mask_sensitive_fields: bool = Form(default=True),
) -> dict:
    response = await extract_document_upload(
        file, document_type=document_type, language=language, mask_sensitive_fields=mask_sensitive_fields
    )
    return success_response("OCR extraction completed successfully", response.model_dump())


@router.post("/ocr-patient-document", summary="Legacy OCR extraction alias")
async def ocr_patient_document(
    file: UploadFile = File(...),
    document_type: str | None = Form(default=None),
    language: str | None = Form(default="auto"),
    mask_sensitive_fields: bool = Form(default=True),
) -> dict:
    response = await extract_document_upload(
        file, document_type=document_type, language=language, mask_sensitive_fields=mask_sensitive_fields
    )
    return success_response("OCR extraction completed successfully", merge_legacy_payload(response.output, response))

