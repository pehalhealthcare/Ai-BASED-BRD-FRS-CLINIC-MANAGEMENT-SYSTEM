from typing import Any, Literal

from pydantic import BaseModel, Field


class StandardAIResponse(BaseModel):
    output: Any = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    explanation: str = ""
    risk_level: Literal["low", "medium", "high", "critical", "unknown"] = "unknown"
    requires_doctor_review: bool = True
    requires_admin_review: bool = False
    requires_human_review: bool = False
    model_name: str = "unconfigured"
    model_version: str = "0.1.0"
    model_status: Literal[
        "available",
        "fallback",
        "unavailable",
        "ready",
        "placeholder",
        "rules_engine",
        "insufficient_data",
        "insufficient_reference_data",
    ] = "placeholder"
    audit_id: str
