from pydantic import BaseModel, Field


class STTSegment(BaseModel):
    start: float = 0.0
    end: float = 0.0
    text: str = ""


class STTOutput(BaseModel):
    transcript: str = ""
    language: str = "auto"
    duration_seconds: float = 0.0
    segments: list[STTSegment] = Field(default_factory=list)
