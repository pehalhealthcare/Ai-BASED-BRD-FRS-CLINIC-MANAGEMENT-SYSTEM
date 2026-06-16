from pydantic import BaseModel, Field

from app.models.ai_response import StandardAIResponse


class ErrorItem(BaseModel):
    field: str | None = None
    message: str


class ServiceHealth(BaseModel):
    service: str = "ai-service"
    status: str = "ok"
    version: str = "1.0.0"


class SuccessEnvelope(BaseModel):
    success: bool = True
    message: str
    data: dict


class StandardAIEnvelope(BaseModel):
    success: bool = True
    message: str
    data: StandardAIResponse


class ErrorEnvelope(BaseModel):
    success: bool = False
    message: str
    errors: list[ErrorItem | str] = Field(default_factory=list)
