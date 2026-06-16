from fastapi import APIRouter

from app.schemas.common_schema import StandardAIEnvelope
from app.schemas.lab_analysis_schema import LabAnalysisRequest
from app.schemas.lab_recommendation_schema import LabRecommendationRequest
from app.services.lab_analysis_service import analyze_lab_results
from app.services.lab_recommendation_service import build_lab_recommendation_response
from app.utils.response import success_response

router = APIRouter(prefix="/api/v1/ai", tags=["Lab Analysis"])
direct_router = APIRouter(prefix="/ai", tags=["Lab Analysis"])

LAB_ANALYSIS_RESPONSE_EXAMPLE = {
    "success": True,
    "message": "Lab analysis generated successfully",
    "data": {
        "output": {
            "abnormal_values": [
                {
                    "test_name": "Hemoglobin",
                    "value": 10.5,
                    "unit": "g/dL",
                    "status": "low",
                    "normal_range": {
                        "min": 13.0,
                        "max": 17.0,
                        "unit": "g/dL",
                        "source": "local_reference",
                    },
                    "severity": "medium",
                    "message": "Hemoglobin is below the expected reference range.",
                }
            ],
            "critical_values": [
                {
                    "test_name": "WBC",
                    "value": 32000,
                    "unit": "cells/uL",
                    "critical_rule": "above_critical_threshold",
                    "severity": "critical",
                    "message": "WBC is above the configured critical threshold and requires doctor review.",
                }
            ],
            "trend_summary": [
                {
                    "test_name": "Hemoglobin",
                    "current_value": 10.5,
                    "previous_value": 12.1,
                    "change": -1.6,
                    "change_percent": -13.22,
                    "trend": "decreasing",
                    "message": "Hemoglobin decreasing compared with the previous report.",
                }
            ],
            "manual_review_items": [],
            "overall_risk_level": "critical",
            "doctor_review_required": True,
            "rule_status": "available",
            "trend_status": "compared",
            "notes": ["AI lab analysis is assistive only and must be reviewed by a doctor."],
        },
        "confidence": 0.85,
        "explanation": "Lab values were evaluated using configured normal and critical reference ranges.",
        "risk_level": "critical",
        "requires_doctor_review": True,
        "requires_human_review": True,
        "model_name": "lab_rule_engine",
        "model_version": "1.0.0",
        "model_status": "available",
        "audit_id": "generated-uuid",
    },
}

INSUFFICIENT_REFERENCE_RESPONSE_EXAMPLE = {
    "success": True,
    "message": "Lab analysis generated successfully",
    "data": {
        "output": {
            "abnormal_values": [],
            "critical_values": [],
            "trend_summary": [],
            "manual_review_items": [
                {
                    "test_name": "Unknown Marker",
                    "value": 42,
                    "unit": "mg/dL",
                    "status": "manual_review",
                    "reason": "missing_reference_range",
                    "severity": "unknown",
                    "message": "Unknown Marker could not be evaluated because no matching local reference range was found.",
                }
            ],
            "overall_risk_level": "unknown",
            "doctor_review_required": True,
            "rule_status": "insufficient_reference_data",
            "trend_status": "no_previous_data",
            "notes": ["AI lab analysis is assistive only and must be reviewed by a doctor."],
        },
        "confidence": 0.35,
        "explanation": "Lab values were evaluated using configured normal and critical reference ranges.",
        "risk_level": "unknown",
        "requires_doctor_review": True,
        "requires_human_review": True,
        "model_name": "lab_rule_engine",
        "model_version": "1.0.0",
        "model_status": "insufficient_reference_data",
        "audit_id": "generated-uuid",
    },
}

UNIT_MISMATCH_RESPONSE_EXAMPLE = {
    "success": True,
    "message": "Lab analysis generated successfully",
    "data": {
        "output": {
            "abnormal_values": [],
            "critical_values": [],
            "trend_summary": [],
            "manual_review_items": [
                {
                    "test_name": "Creatinine",
                    "value": 1.1,
                    "unit": "umol/L",
                    "status": "manual_review",
                    "reason": "unit_mismatch",
                    "severity": "unknown",
                    "message": "Creatinine unit does not match the configured reference unit mg/dL. Manual review is required.",
                }
            ],
            "overall_risk_level": "unknown",
            "doctor_review_required": True,
            "rule_status": "available",
            "trend_status": "no_previous_data",
            "notes": [
                "AI lab analysis is assistive only and must be reviewed by a doctor.",
                "TODO: Unit conversion is not implemented yet for Creatinine.",
            ],
        },
        "confidence": 0.35,
        "explanation": "Lab values were evaluated using configured normal and critical reference ranges.",
        "risk_level": "unknown",
        "requires_doctor_review": True,
        "requires_human_review": True,
        "model_name": "lab_rule_engine",
        "model_version": "1.0.0",
        "model_status": "available",
        "audit_id": "generated-uuid",
    },
}


@router.post(
    "/lab-analysis",
    summary="Assistive lab abnormality analysis",
    response_model=StandardAIEnvelope,
)
def lab_analysis(payload: LabAnalysisRequest) -> dict:
    return success_response("Lab analysis generated successfully", analyze_lab_results(payload).model_dump())


@direct_router.post(
    "/lab-analysis",
    summary="Rule-based lab abnormality analysis endpoint",
    response_model=StandardAIEnvelope,
    responses={
        200: {
            "description": "Safe rule-based lab abnormality analysis. This endpoint never returns a final diagnosis or treatment recommendation and always requires doctor review.",
            "content": {
                "application/json": {
                    "examples": {
                        "abnormal_and_critical_values": {"value": LAB_ANALYSIS_RESPONSE_EXAMPLE},
                        "insufficient_reference_data": {"value": INSUFFICIENT_REFERENCE_RESPONSE_EXAMPLE},
                        "unit_mismatch": {"value": UNIT_MISMATCH_RESPONSE_EXAMPLE},
                    }
                }
            },
        },
        422: {
            "description": "Validation error for invalid lab analysis input.",
        },
    },
)
def direct_lab_analysis(payload: LabAnalysisRequest) -> dict:
    return success_response("Lab analysis generated successfully", analyze_lab_results(payload).model_dump())


@router.post("/lab-test-recommendations", summary="Assistive lab test recommendations")
def lab_test_recommendations(payload: LabRecommendationRequest) -> dict:
    return build_lab_recommendation_response(payload.model_dump())


@direct_router.post("/lab-test-recommendations", summary="Direct lab test recommendations")
def direct_lab_test_recommendations(payload: LabRecommendationRequest) -> dict:
    return build_lab_recommendation_response(payload.model_dump())
