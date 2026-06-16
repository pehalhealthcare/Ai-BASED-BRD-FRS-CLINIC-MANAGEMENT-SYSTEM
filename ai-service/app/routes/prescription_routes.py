from fastapi import APIRouter

from app.schemas.prescription_schema import PrescriptionAdviceRequest
from app.services.prescription_advice_service import format_prescription_advice
from app.utils.response import success_response

router = APIRouter(prefix="/api/v1/prescription", tags=["Prescription AI"])


@router.post("/format-advice", summary="Legacy prescription advice formatter")
def format_advice(payload: PrescriptionAdviceRequest) -> dict:
    return success_response(
        "Advice formatted successfully",
        format_prescription_advice(payload),
    )
