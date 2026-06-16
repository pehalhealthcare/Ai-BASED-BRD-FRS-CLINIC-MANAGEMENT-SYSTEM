from fastapi import APIRouter

from app.schemas.common_schema import StandardAIEnvelope, SuccessEnvelope
from app.schemas.pharmacy_forecast_schema import (
    PharmacyDemandRequest,
    PharmacyDemandTrainingRequest,
    PharmacyDemandTrainingResponse,
)
from app.services.pharmacy_forecast_service import generate_pharmacy_demand_forecast, train_pharmacy_demand_models
from app.utils.response import success_response

router = APIRouter(prefix="/api/v1/ai", tags=["Pharmacy Forecasting"])
direct_router = APIRouter(prefix="/ai", tags=["Pharmacy Forecasting"])

PHARMACY_DEMAND_RESPONSE_EXAMPLE = {
    "success": True,
    "message": "Pharmacy demand forecast generated successfully",
    "data": {
        "output": {
            "medicine_id": "MED-001",
            "medicine_name": "Paracetamol 500",
            "next_7_days_demand": 28.0,
            "next_30_days_demand": 120.0,
            "stockout_risk": "medium",
            "reorder_alert": True,
            "reorder_quantity": 49.0,
            "expiry_risk": "low",
            "days_until_stockout": 20.0,
            "reason_codes": ["MODEL_FORECAST_AVAILABLE", "LOW_STOCK"]
        },
        "confidence": 0.72,
        "explanation": "AutoARIMA generated a time-series demand forecast from the supplied medicine sales history. Confidence reflects data sufficiency and forecast method availability, not a validated production accuracy claim.",
        "risk_level": "medium",
        "requires_doctor_review": False,
        "requires_admin_review": True,
        "requires_human_review": False,
        "model_name": "AutoARIMA",
        "model_version": "v1",
        "model_status": "available",
        "audit_id": "generated-uuid"
    }
}

PHARMACY_TRAIN_RESPONSE_EXAMPLE = {
    "success": True,
    "message": "Pharmacy demand training completed successfully",
    "data": {
        "trained_models": [
            {
                "medicine_id": "MED-001",
                "status": "trained",
                "reason": "Training artifact prepared successfully.",
                "records_used": 45,
                "model_name": "AutoARIMA"
            },
            {
                "medicine_id": "MED-002",
                "status": "skipped",
                "reason": "Insufficient history for training.",
                "records_used": 8,
                "model_name": "fallback"
            }
        ],
        "model_status": "partial",
        "audit_id": "generated-uuid"
    }
}


@router.post("/pharmacy-demand", summary="Assistive pharmacy demand forecast", response_model=StandardAIEnvelope)
def pharmacy_demand(payload: PharmacyDemandRequest) -> dict:
    return success_response("Pharmacy demand forecast generated successfully", generate_pharmacy_demand_forecast(payload).model_dump())


@direct_router.post(
    "/pharmacy-demand",
    summary="Assistive pharmacy demand forecast",
    response_model=StandardAIEnvelope,
    responses={
        200: {
            "description": "Admin/pharmacist-facing demand forecast with fallback reorder rules when model forecasting is unavailable or data is insufficient.",
            "content": {"application/json": {"example": PHARMACY_DEMAND_RESPONSE_EXAMPLE}},
        }
    },
)
def direct_pharmacy_demand(payload: PharmacyDemandRequest) -> dict:
    return success_response("Pharmacy demand forecast generated successfully", generate_pharmacy_demand_forecast(payload).model_dump())


@router.post("/train/pharmacy-demand", summary="Prepare pharmacy forecasting artifacts", response_model=SuccessEnvelope)
def train_pharmacy_demand(payload: PharmacyDemandTrainingRequest) -> dict:
    return success_response("Pharmacy demand training completed successfully", train_pharmacy_demand_models(payload).model_dump())


@direct_router.post(
    "/train/pharmacy-demand",
    summary="Prepare pharmacy forecasting artifacts",
    response_model=SuccessEnvelope,
    responses={
        200: {
            "description": "Groups records by medicine, prepares training artifacts, and skips insufficient series without failing the entire request.",
            "content": {"application/json": {"example": PHARMACY_TRAIN_RESPONSE_EXAMPLE}},
        }
    },
)
def direct_train_pharmacy_demand(payload: PharmacyDemandTrainingRequest) -> dict:
    return success_response("Pharmacy demand training completed successfully", train_pharmacy_demand_models(payload).model_dump())
