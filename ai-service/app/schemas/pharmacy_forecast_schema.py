from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class PharmacySalesHistoryItem(BaseModel):
    date: date
    quantity_sold: float = Field(..., ge=0)


class PharmacyForecastContext(BaseModel):
    season: str | None = None
    month: int | None = Field(default=None, ge=1, le=12)
    doctor_specialization: str | None = None
    clinic_id: str | None = None


class PharmacyDemandRequest(BaseModel):
    medicine_id: str = Field(..., min_length=1)
    medicine_name: str = Field(..., min_length=1)
    current_stock: float = Field(..., ge=0)
    reorder_level: float = Field(default=0, ge=0)
    supplier_lead_time_days: int = Field(default=0, ge=0)
    expiry_date: date | None = None
    sales_history: list[PharmacySalesHistoryItem] = Field(default_factory=list)
    context: PharmacyForecastContext = Field(default_factory=PharmacyForecastContext)


class PharmacyDemandOutput(BaseModel):
    medicine_id: str
    medicine_name: str
    next_7_days_demand: float
    next_30_days_demand: float
    stockout_risk: Literal["low", "medium", "high"]
    reorder_alert: bool
    reorder_quantity: float
    expiry_risk: Literal["low", "medium", "high"]
    days_until_stockout: float | None = None
    reason_codes: list[str] = Field(default_factory=list)


class PharmacyDemandTrainingRecord(BaseModel):
    medicine_id: str = Field(..., min_length=1)
    medicine_name: str = Field(..., min_length=1)
    date: date
    quantity_sold: float = Field(..., ge=0)
    current_stock: float = Field(default=0, ge=0)
    reorder_level: float = Field(default=0, ge=0)
    supplier_lead_time_days: int = Field(default=0, ge=0)
    expiry_date: date | None = None


class PharmacyDemandTrainingRequest(BaseModel):
    records: list[PharmacyDemandTrainingRecord] = Field(default_factory=list, min_length=1)
    save_model: bool = False


class PharmacyDemandTrainingItem(BaseModel):
    medicine_id: str
    status: Literal["trained", "skipped"]
    reason: str
    records_used: int
    model_name: str


class PharmacyDemandTrainingResponse(BaseModel):
    trained_models: list[PharmacyDemandTrainingItem] = Field(default_factory=list)
    model_status: Literal["available", "partial", "insufficient_data"]
    audit_id: str
