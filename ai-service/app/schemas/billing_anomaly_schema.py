from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class BillingHistoricalContext(BaseModel):
    patient_invoice_count_today: int = Field(default=0, ge=0)
    user_cancelled_invoice_count_today: int = Field(default=0, ge=0)
    patient_refund_count_30d: int = Field(default=0, ge=0)
    duplicate_invoice_count: int = Field(default=0, ge=0)
    average_invoice_amount_30d: float = Field(default=0.0, ge=0)
    average_discount_percent_30d: float = Field(default=0.0, ge=0)
    same_service_count_today: int = Field(default=0, ge=0)


class BillingItem(BaseModel):
    item_type: Literal["consultation", "lab", "pharmacy", "service", "other"]
    item_id: str | None = None
    name: str = Field(..., min_length=1)
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    expected_unit_price: float | None = Field(default=None, ge=0)
    total_price: float = Field(..., ge=0)


class BillingAnomalyRequest(BaseModel):
    invoice_id: str | None = None
    patient_id: str | None = None
    user_id: str | None = None
    invoice_status: str = Field(..., min_length=1)
    payment_status: str | None = None
    total_amount: float
    subtotal: float | None = None
    discount_amount: float | None = None
    discount_percent: float | None = None
    tax_amount: float | None = None
    paid_amount: float | None = None
    refund_amount: float | None = None
    payment_mode: str | None = None
    created_at: datetime | None = None
    cancelled_at: datetime | None = None
    items: list[BillingItem] = Field(default_factory=list)
    linked_consultation_id: str | None = None
    linked_lab_order_id: str | None = None
    linked_pharmacy_sale_id: str | None = None
    medicine_stock_deducted: bool | None = None
    lab_order_exists: bool | None = None
    manual_price_override: bool | None = None
    historical_context: BillingHistoricalContext = Field(default_factory=BillingHistoricalContext)


class TriggeredRule(BaseModel):
    code: str
    severity: Literal["low", "medium", "high", "critical"]
    message: str
    evidence: dict[str, Any] = Field(default_factory=dict)


class BillingAnomalyOutput(BaseModel):
    anomaly_score: float = Field(..., ge=0, le=1)
    triggered_rules: list[TriggeredRule] = Field(default_factory=list)


class BillingAnomalyTrainingRequest(BaseModel):
    records: list[BillingAnomalyRequest] = Field(default_factory=list, min_length=1)
    save_model: bool = True


class BillingAnomalyTrainingResponse(BaseModel):
    records_used: int
    feature_count: int
    model_name: str
    model_version: str
    saved_path: str | None = None
    model_status: Literal["available", "fallback", "insufficient_data", "unavailable"]
    message: str
