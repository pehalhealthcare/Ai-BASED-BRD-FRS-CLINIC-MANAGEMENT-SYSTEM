from __future__ import annotations

from collections import defaultdict
from datetime import date
from uuid import uuid4

from app.core.ai_response_factory import build_standard_ai_response
from app.evaluation.adapter_registry import get_adapter_registry
from app.schemas.pharmacy_forecast_schema import (
    PharmacyDemandRequest,
    PharmacyDemandTrainingRequest,
    PharmacyDemandTrainingResponse,
)
from app.services.ai_audit_service import record_ai_audit_event

PHARMACY_CONFIDENCE_NOTE = (
    "Confidence reflects data sufficiency and forecast method availability, not a validated production accuracy claim."
)


def _round(value: float | None) -> float | None:
    if value is None:
        return None
    return round(float(value), 2)


def _calculate_days_until_stockout(current_stock: float, average_daily_sales: float) -> float | None:
    if average_daily_sales <= 0:
        return None
    return _round(current_stock / average_daily_sales)


def _calculate_expiry_risk(
    *,
    expiry_date: date | None,
    current_stock: float,
    expected_next_30_days_demand: float,
) -> str:
    if not expiry_date:
        return "low"

    days_until_expiry = (expiry_date - date.today()).days
    has_excess_stock = current_stock > expected_next_30_days_demand

    if days_until_expiry <= 30 and has_excess_stock:
        return "high"
    if days_until_expiry <= 60 and has_excess_stock:
        return "medium"
    return "low"


def _calculate_stockout_risk(
    *,
    current_stock: float,
    expected_demand_during_lead_time: float,
    next_7_days_demand: float,
) -> str:
    if current_stock <= expected_demand_during_lead_time:
        return "high"
    if current_stock <= next_7_days_demand:
        return "medium"
    return "low"


def _derive_reason_codes(
    *,
    current_stock: float,
    reorder_level: float,
    expected_demand_during_lead_time: float,
    next_7_days_demand: float,
    expiry_risk: str,
    model_status: str,
) -> list[str]:
    reason_codes: list[str] = []

    if current_stock < reorder_level:
        reason_codes.append("BELOW_REORDER_LEVEL")
    if current_stock <= expected_demand_during_lead_time:
        reason_codes.append("HIGH_LEAD_TIME_DEMAND")
    if current_stock <= next_7_days_demand:
        reason_codes.append("LOW_STOCK")
    if expiry_risk in {"medium", "high"}:
        reason_codes.append("EXPIRY_WITH_EXCESS_STOCK")
    if model_status == "insufficient_data":
        reason_codes.append("INSUFFICIENT_HISTORY")
    if model_status == "available":
        reason_codes.append("MODEL_FORECAST_AVAILABLE")
    if model_status in {"fallback", "unavailable"}:
        reason_codes.append("FALLBACK_FORECAST_USED")

    return reason_codes


def _derive_overall_risk(
    *,
    current_stock: float,
    stockout_risk: str,
    expiry_risk: str,
    average_daily_sales: float,
) -> str:
    if current_stock == 0 and average_daily_sales > 0:
        return "critical"
    if stockout_risk == "high" or expiry_risk == "high":
        return "high"
    if stockout_risk == "medium" or expiry_risk == "medium":
        return "medium"
    return "low"


def generate_pharmacy_demand_forecast(payload: PharmacyDemandRequest):
    adapter = get_adapter_registry().forecasting
    model_result = adapter.forecast(
        medicine_id=payload.medicine_id,
        medicine_name=payload.medicine_name,
        sales_history=[item.model_dump(mode="json") for item in payload.sales_history],
    )

    expected_demand_during_lead_time = _round(model_result.average_daily_sales * payload.supplier_lead_time_days) or 0.0
    days_until_stockout = _calculate_days_until_stockout(payload.current_stock, model_result.average_daily_sales)
    expiry_risk = _calculate_expiry_risk(
        expiry_date=payload.expiry_date,
        current_stock=payload.current_stock,
        expected_next_30_days_demand=model_result.next_30_days_demand,
    )
    stockout_risk = _calculate_stockout_risk(
        current_stock=payload.current_stock,
        expected_demand_during_lead_time=expected_demand_during_lead_time,
        next_7_days_demand=model_result.next_7_days_demand,
    )
    reorder_quantity = _round(
        max(
            0.0,
            model_result.next_30_days_demand + expected_demand_during_lead_time - payload.current_stock,
        )
    ) or 0.0
    reorder_alert = (
        payload.current_stock < payload.reorder_level
        or payload.current_stock <= expected_demand_during_lead_time
        or reorder_quantity > 0
    )
    reason_codes = _derive_reason_codes(
        current_stock=payload.current_stock,
        reorder_level=payload.reorder_level,
        expected_demand_during_lead_time=expected_demand_during_lead_time,
        next_7_days_demand=model_result.next_7_days_demand,
        expiry_risk=expiry_risk,
        model_status=model_result.model_status,
    )
    risk_level = _derive_overall_risk(
        current_stock=payload.current_stock,
        stockout_risk=stockout_risk,
        expiry_risk=expiry_risk,
        average_daily_sales=model_result.average_daily_sales,
    )

    response = build_standard_ai_response(
        output={
            "medicine_id": payload.medicine_id,
            "medicine_name": payload.medicine_name,
            "next_7_days_demand": _round(model_result.next_7_days_demand) or 0.0,
            "next_30_days_demand": _round(model_result.next_30_days_demand) or 0.0,
            "stockout_risk": stockout_risk,
            "reorder_alert": reorder_alert,
            "reorder_quantity": reorder_quantity,
            "expiry_risk": expiry_risk,
            "days_until_stockout": days_until_stockout,
            "reason_codes": reason_codes,
        },
        confidence=model_result.confidence,
        explanation=f"{model_result.explanation} {PHARMACY_CONFIDENCE_NOTE}",
        risk_level=risk_level,
        requires_doctor_review=False,
        requires_admin_review=True,
        requires_human_review=False,
        model_name=model_result.model_name,
        model_version=adapter.model_version,
        model_status=model_result.model_status,
    )

    record_ai_audit_event(
        audit_id=response.audit_id,
        endpoint="/ai/pharmacy-demand",
        patient_id=None,
        payload=payload.model_dump(mode="json"),
        model_provider=adapter.provider or "fallback",
        model_name=response.model_name,
        model_status=response.model_status,
        risk_level=response.risk_level,
        requires_doctor_review=response.requires_doctor_review,
        success=True,
    )

    return response


def train_pharmacy_demand_models(payload: PharmacyDemandTrainingRequest) -> PharmacyDemandTrainingResponse:
    adapter = get_adapter_registry().forecasting
    grouped_records: dict[str, list[dict]] = defaultdict(list)
    medicine_names: dict[str, str] = {}

    for record in payload.records:
        grouped_records[record.medicine_id].append(
            {
                "date": record.date,
                "quantity_sold": record.quantity_sold,
            }
        )
        medicine_names[record.medicine_id] = record.medicine_name

    trained_models = []
    trained_count = 0
    skipped_count = 0

    for medicine_id, records in grouped_records.items():
        sorted_records = sorted(records, key=lambda item: item["date"])
        result = adapter.train(
            medicine_id=medicine_id,
            medicine_name=medicine_names.get(medicine_id, medicine_id),
            sales_history=sorted_records,
            save_model=payload.save_model,
        )
        trained_models.append(result)

        if result["status"] == "trained":
            trained_count += 1
        else:
            skipped_count += 1

    if trained_count and skipped_count:
        model_status = "partial"
    elif trained_count:
        model_status = "available"
    else:
        model_status = "insufficient_data"

    response = PharmacyDemandTrainingResponse(
        trained_models=trained_models,
        model_status=model_status,
        audit_id=str(uuid4()),
    )

    record_ai_audit_event(
        audit_id=response.audit_id,
        endpoint="/ai/train/pharmacy-demand",
        patient_id=None,
        payload=payload.model_dump(mode="json"),
        model_provider=adapter.provider or "fallback",
        model_name="pharmacy_demand_training",
        model_status=model_status,
        risk_level="low",
        requires_doctor_review=False,
        success=True,
    )

    return response
