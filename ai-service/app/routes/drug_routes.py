from fastapi import APIRouter

from app.core.ai_response_factory import merge_legacy_payload
from app.schemas.common_schema import StandardAIEnvelope
from app.schemas.drug_safety_schema import DrugSafetyCheckRequest
from app.services.drug_safety_service import build_drug_safety_response
from app.utils.response import success_response

router = APIRouter(prefix="/api/v1/ai", tags=["Drug Safety"])
direct_router = APIRouter(prefix="/ai", tags=["Drug Safety"])


@router.post("/drug-safety-check", summary="Assistive drug safety screening")
def drug_safety_check(payload: DrugSafetyCheckRequest) -> dict:
    response = build_drug_safety_response(payload)
    return success_response("Drug safety analysis generated successfully", merge_legacy_payload(response.output, response))


@direct_router.post(
    "/drug-safety-check",
    summary="Foundation drug safety endpoint",
    response_model=StandardAIEnvelope,
)
def direct_drug_safety_check(payload: DrugSafetyCheckRequest) -> dict:
    response = build_drug_safety_response(payload)
    return success_response("Drug safety analysis generated successfully", response.model_dump())
