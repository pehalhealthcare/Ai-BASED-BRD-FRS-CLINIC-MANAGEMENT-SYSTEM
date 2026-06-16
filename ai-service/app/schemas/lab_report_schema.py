from pydantic import BaseModel, Field


class LabReportValueField(BaseModel):
    value: str | None = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    needs_review: bool = True


class LabTestResult(BaseModel):
    test_name: str
    value: float | None = None
    unit: str | None = None
    normal_range: str | None = None
    status: str = "unknown"
    severity: str = "low"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    needs_review: bool = True


class LabReportOutput(BaseModel):
    raw_text: str = ""
    lab_name: LabReportValueField = Field(default_factory=LabReportValueField)
    report_date: LabReportValueField = Field(default_factory=LabReportValueField)
    patient_name: LabReportValueField = Field(default_factory=LabReportValueField)
    test_results: list[LabTestResult] = Field(default_factory=list)
    abnormal_values: list[LabTestResult] = Field(default_factory=list)
    critical_values: list[LabTestResult] = Field(default_factory=list)
    summary: str = ""
