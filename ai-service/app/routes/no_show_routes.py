from fastapi import APIRouter, HTTPException

from app.core.ai_response_factory import merge_legacy_payload
from app.schemas.common_schema import StandardAIEnvelope
from app.schemas.no_show_schema import NoShowPredictionRequest, NoShowTrainingRequest
from app.services.ai_foundation_service import run_no_show_prediction
from app.services.no_show_service import train_no_show_model
from app.utils.response import success_response

router = APIRouter(prefix="/api/v1/ai", tags=["No-Show Prediction"])
direct_router = APIRouter(prefix="/ai", tags=["No-Show Prediction"])

NO_SHOW_PREDICTION_EXAMPLE = {
    "success": True,
    "message": "No-show risk generated successfully",
    "data": {
        "output": {
            "risk_score": 0.72,
            "risk_level": "high",
            "reason_codes": ["HIGH_PREVIOUS_NO_SHOWS", "REMINDER_NOT_SENT"],
            "recommended_action": "Call patient, confirm attendance, and consider controlled overbooking only if clinic policy allows.",
            "requires_staff_review": True,
            "reasons": ["Patient has multiple previous no-shows.", "Reminder has not been sent yet."],
            "score": 0.72,
        },
        "confidence": 0.72,
        "explanation": "XGBoost no-show model prediction generated successfully.",
        "risk_level": "high",
        "requires_doctor_review": False,
        "model_name": "xgboost_no_show",
        "model_version": "phase-20-xgb-20260426120000",
        "model_status": "available",
        "audit_id": "example-audit-id",
    },
}

NO_SHOW_TRAINING_EXAMPLE = {
    "success": True,
    "message": "No-show model trained successfully",
    "data": {
        "rows_received": 160,
        "rows_used_for_training": 152,
        "rows_excluded_cancelled": 8,
        "rows_excluded_invalid": 0,
        "model_name": "xgboost_no_show",
        "model_version": "phase-20-xgb-20260426120000",
        "model_status": "available",
        "metrics": {
            "accuracy": 0.78,
            "precision": 0.75,
            "recall": 0.7,
            "f1": 0.72,
            "roc_auc": 0.81,
        },
        "saved_files": {
            "model": "app/models/no_show/no_show_xgboost.pkl",
            "preprocessor": "app/models/no_show/no_show_preprocessor.json",
            "metadata": "app/models/no_show/metadata.json",
            "metrics": "app/models/no_show/metrics.json",
        },
        "summary": "No-show model trained successfully.",
    },
}


@router.post("/no-show", summary="Legacy no-show scoring route")
def no_show(payload: NoShowPredictionRequest) -> dict:
    standard_response = run_no_show_prediction(payload)
    return success_response(
        "No-show risk generated successfully",
        merge_legacy_payload(standard_response.output, standard_response),
    )


@router.post(
    "/no-show-predict",
    summary="Predict appointment no-show risk",
    response_model=StandardAIEnvelope,
    responses={
        200: {
            "description": "Predictive assistance for appointment attendance risk. This score is assistive only and must not be used to deny care.",
            "content": {"application/json": {"example": NO_SHOW_PREDICTION_EXAMPLE}},
        }
    },
)
def no_show_predict(payload: NoShowPredictionRequest) -> dict:
    return success_response("No-show risk generated successfully", run_no_show_prediction(payload).model_dump())


@direct_router.post(
    "/no-show-predict",
    summary="Direct no-show risk prediction endpoint",
    response_model=StandardAIEnvelope,
    responses={
        200: {
            "description": "Predictive assistance for appointment attendance risk. `model_status` may be `available`, `fallback`, `insufficient_data`, or `unavailable`.",
            "content": {"application/json": {"example": NO_SHOW_PREDICTION_EXAMPLE}},
        }
    },
)
def direct_no_show_predict(payload: NoShowPredictionRequest) -> dict:
    return success_response("No-show risk generated successfully", run_no_show_prediction(payload).model_dump())


@router.post(
    "/train/no-show",
    summary="Train the no-show prediction model",
    responses={
        200: {
            "description": "Training summary for the no-show model.",
            "content": {"application/json": {"example": NO_SHOW_TRAINING_EXAMPLE}},
        }
    },
)
def train_no_show(payload: NoShowTrainingRequest) -> dict:
    result = train_no_show_model(payload)

    if result["model_status"] == "insufficient_data":
        raise HTTPException(status_code=400, detail=[{"message": result["summary"], "data": result}])

    if result["model_status"] == "unavailable":
        raise HTTPException(status_code=503, detail=[{"message": result["summary"], "data": result}])

    return success_response("No-show model trained successfully", result)


@direct_router.post(
    "/train/no-show",
    summary="Direct no-show model training endpoint",
    responses={
        200: {
            "description": "Training summary for the no-show model.",
            "content": {"application/json": {"example": NO_SHOW_TRAINING_EXAMPLE}},
        }
    },
)
def direct_train_no_show(payload: NoShowTrainingRequest) -> dict:
    result = train_no_show_model(payload)

    if result["model_status"] == "insufficient_data":
        raise HTTPException(status_code=400, detail=[{"message": result["summary"], "data": result}])

    if result["model_status"] == "unavailable":
        raise HTTPException(status_code=503, detail=[{"message": result["summary"], "data": result}])

    return success_response("No-show model trained successfully", result)
