from pydantic import BaseModel


class TranscriptionPlaceholderResponse(BaseModel):
    transcript: str = ""
    language: str = "en"
    confidence: float = 0.0
    engine: str = "placeholder"
    requires_manual_review: bool = True
