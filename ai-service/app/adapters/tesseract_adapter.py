from __future__ import annotations

from pathlib import Path

from app.adapters.base import BaseModelAdapter
from app.core.confidence import average_confidence, bounded_confidence
from app.models.adapter_result import AdapterResult


class TesseractAdapter(BaseModelAdapter):
    adapter_name = "tesseract_adapter"
    model_version = "phase-18-ocr-0.1.0"

    def __init__(self, *, provider: str, enable_fallbacks: bool):
        self.provider = (provider or "tesseract").strip().lower()
        self.enable_fallbacks = enable_fallbacks
        self.model_name = self.provider if self.provider else "unconfigured-tesseract"

    @property
    def is_available(self) -> bool:
        return self.provider in {"tesseract", "mock", "placeholder"}

    def _mock_extract(self, path: Path, language: str | None) -> AdapterResult:
        try:
            raw_text = path.read_bytes().decode("utf-8", errors="ignore").strip()
        except Exception:
            raw_text = ""

        return AdapterResult(
            output={
                "raw_text": raw_text,
                "pages": [{"page_number": 1, "text": raw_text, "confidence": 0.0}],
                "blocks": [{"text": raw_text, "confidence": 0.0}] if raw_text else [],
                "language": language or "en",
            },
            confidence=0.0,
            explanation="Mock OCR fallback returned decoded text bytes for local development and tests.",
            risk_level="low",
            model_status="fallback",
        )

    def extract_image(self, *, file_path: str, language: str | None = None) -> AdapterResult:
        path = Path(file_path)

        if self.provider in {"mock", "placeholder"}:
            return self._mock_extract(path, language)

        if self.provider != "tesseract":
            return AdapterResult(
                output={"raw_text": "", "pages": [], "blocks": [], "language": language or "en"},
                confidence=0.0,
                explanation=f"Configured fallback OCR provider '{self.provider}' is not supported in this build.",
                risk_level="low",
                model_status="unavailable",
            )

        try:
            import pytesseract
            from PIL import Image
        except Exception as exc:  # pragma: no cover - optional dependency
            return AdapterResult(
                output={"raw_text": "", "pages": [], "blocks": [], "language": language or "en"},
                confidence=0.0,
                explanation=f"Tesseract dependency is unavailable: {exc}",
                risk_level="low",
                model_status="unavailable",
            )

        try:
            image = Image.open(path)
            details = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            texts = []
            confidences = []

            for text, raw_confidence in zip(details.get("text", []), details.get("conf", [])):
                cleaned = (text or "").strip()
                if not cleaned:
                    continue
                try:
                    confidence = bounded_confidence(float(raw_confidence) / 100.0)
                except Exception:
                    confidence = 0.0
                texts.append(cleaned)
                confidences.append(confidence)

            raw_text = "\n".join(texts).strip()
            page_confidence = average_confidence(confidences)
            return AdapterResult(
                output={
                    "raw_text": raw_text,
                    "pages": [{"page_number": 1, "text": raw_text, "confidence": page_confidence}],
                    "blocks": [{"text": text, "confidence": confidence} for text, confidence in zip(texts, confidences)],
                    "language": language or "en",
                },
                confidence=page_confidence,
                explanation="OCR extraction completed with Tesseract fallback.",
                risk_level="low",
                model_status="fallback",
            )
        except Exception as exc:  # pragma: no cover - local runtime specific
            return AdapterResult(
                output={"raw_text": "", "pages": [], "blocks": [], "language": language or "en"},
                confidence=0.0,
                explanation=f"Tesseract runtime failed: {exc}",
                risk_level="low",
                model_status="unavailable",
            )
