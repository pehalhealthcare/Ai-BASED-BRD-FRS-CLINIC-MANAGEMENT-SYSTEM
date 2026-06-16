from typing import Literal

from pydantic import BaseModel, Field


DocumentType = Literal["patient_id", "aadhaar_like_id", "prescription", "lab_report", "generic"]


class OCRPage(BaseModel):
    page_number: int
    text: str = ""
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class OCRExtractedField(BaseModel):
    value: str | None = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    needs_review: bool = True
    source: str = "ocr"
    masked: bool = False


class OCRDocumentOutput(BaseModel):
    document_type: DocumentType = "generic"
    raw_text: str = ""
    pages: list[OCRPage] = Field(default_factory=list)
    extracted_fields: dict[str, OCRExtractedField] = Field(default_factory=dict)

