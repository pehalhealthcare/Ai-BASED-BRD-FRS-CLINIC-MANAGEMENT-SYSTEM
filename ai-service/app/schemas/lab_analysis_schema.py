from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class LabAnalysisTestResult(BaseModel):
    test_name: str = Field(..., min_length=1)
    value: float
    unit: str = Field(..., min_length=1)


class PreviousLabAnalysisTestResult(LabAnalysisTestResult):
    report_date: date


class LabAnalysisRequest(BaseModel):
    patient_id: str | None = None
    age: int | None = Field(default=None, ge=0, le=130)
    gender: Literal["male", "female", "other"] | None = None
    report_date: date | None = None
    test_results: list[LabAnalysisTestResult] = Field(default_factory=list, min_length=1)
    previous_results: list[PreviousLabAnalysisTestResult] = Field(default_factory=list)


class LabNormalRange(BaseModel):
    min: float | None = None
    max: float | None = None
    unit: str
    source: str = "local_reference"


class LabAbnormalValue(BaseModel):
    test_name: str
    value: float
    unit: str
    status: str
    normal_range: LabNormalRange | None = None
    severity: str
    message: str


class LabCriticalValue(BaseModel):
    test_name: str
    value: float
    unit: str
    critical_rule: str
    severity: str
    message: str


class LabTrendSummary(BaseModel):
    test_name: str
    current_value: float
    previous_value: float
    change: float
    change_percent: float
    trend: str
    message: str


class LabManualReviewItem(BaseModel):
    test_name: str
    value: float
    unit: str
    status: str = "manual_review"
    reason: str
    severity: str = "unknown"
    message: str


class LabAnalysisOutput(BaseModel):
    abnormal_values: list[LabAbnormalValue] = Field(default_factory=list)
    critical_values: list[LabCriticalValue] = Field(default_factory=list)
    trend_summary: list[LabTrendSummary] = Field(default_factory=list)
    manual_review_items: list[LabManualReviewItem] = Field(default_factory=list)
    overall_risk_level: str = "unknown"
    doctor_review_required: bool = True
    rule_status: str = "available"
    trend_status: str = "no_previous_data"
    notes: list[str] = Field(default_factory=list)
