from fastapi import APIRouter

from app.schemas.billing_anomaly_schema import BillingAnomalyRequest, BillingAnomalyTrainingRequest
from app.schemas.common_schema import StandardAIEnvelope, SuccessEnvelope
from app.services.billing_anomaly_service import analyze_billing_anomaly, train_billing_anomaly_model
from app.utils.response import success_response

router = APIRouter(prefix="/api/v1/ai", tags=["billing-anomaly"])
direct_router = APIRouter(prefix="/ai", tags=["billing-anomaly"])

BILLING_ANOMALY_EXAMPLE = {
    "output": {
        "anomaly_score": 0.84,
        "triggered_rules": [
            {
                "code": "DUPLICATE_INVOICE",
                "severity": "high",
                "message": "Possible duplicate invoice activity was found for this billing pattern.",
                "evidence": {"duplicate_invoice_count": 1},
            }
        ],
    },
    "confidence": 0.58,
    "explanation": "Billing anomaly review used explainable rule-based audit checks first. Billing anomaly model file or dependencies were unavailable, so rule-based fallback scoring was used. This output is an admin review signal only and not a final fraud determination.",
    "risk_level": "high",
    "requires_doctor_review": False,
    "requires_admin_review": True,
    "requires_human_review": True,
    "model_name": "billing_isolation_forest",
    "model_version": "v1",
    "model_status": "fallback",
    "audit_id": "generated-uuid",
}

BILLING_TRAINING_EXAMPLE = {
    "records_used": 300,
    "feature_count": 16,
    "model_name": "billing_isolation_forest",
    "model_version": "v1",
    "saved_path": "app/models/billing_isolation_forest.joblib",
    "model_status": "available",
    "message": "Billing anomaly model training completed successfully.",
}


@router.post(
    "/billing-anomaly",
    summary="Assistive billing anomaly screening",
    response_model=StandardAIEnvelope,
    responses={200: {"content": {"application/json": {"example": {"success": True, "message": "Billing anomaly analysis generated successfully", "data": BILLING_ANOMALY_EXAMPLE}}}}},
)
def billing_anomaly(payload: BillingAnomalyRequest) -> dict:
    return success_response("Billing anomaly analysis generated successfully", analyze_billing_anomaly(payload).model_dump())


@direct_router.post(
    "/billing-anomaly",
    summary="Assistive billing anomaly screening",
    response_model=StandardAIEnvelope,
)
def direct_billing_anomaly(payload: BillingAnomalyRequest) -> dict:
    return success_response("Billing anomaly analysis generated successfully", analyze_billing_anomaly(payload).model_dump())


@router.post(
    "/train/billing-anomaly",
    summary="Train or refresh the billing anomaly model",
    response_model=SuccessEnvelope,
    responses={200: {"content": {"application/json": {"example": {"success": True, "message": "Billing anomaly training completed successfully", "data": BILLING_TRAINING_EXAMPLE}}}}},
)
def train_billing_anomaly(payload: BillingAnomalyTrainingRequest) -> dict:
    return success_response(
        "Billing anomaly training completed successfully",
        train_billing_anomaly_model(payload).model_dump(),
    )


@direct_router.post(
    "/train/billing-anomaly",
    summary="Train or refresh the billing anomaly model",
    response_model=SuccessEnvelope,
)
def direct_train_billing_anomaly(payload: BillingAnomalyTrainingRequest) -> dict:
    return success_response(
        "Billing anomaly training completed successfully",
        train_billing_anomaly_model(payload).model_dump(),
    )
