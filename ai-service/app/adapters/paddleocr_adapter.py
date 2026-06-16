from __future__ import annotations

from pathlib import Path

from app.adapters.base import BaseModelAdapter
from app.core.confidence import average_confidence, bounded_confidence
from app.models.adapter_result import AdapterResult


class PaddleOCRAdapter(BaseModelAdapter):
    adapter_name = "paddleocr_adapter"
    model_version = "phase-18-ocr-0.1.0"

    def __init__(
        self,
        *,
        provider: str,
        ocr_enabled: bool,
        enable_fallbacks: bool,
        default_language: str,
        enable_hindi: bool,
    ):
        self.provider = (provider or "paddleocr").strip().lower()
        self.ocr_enabled = ocr_enabled
        self.enable_fallbacks = enable_fallbacks
        self.default_language = default_language or "en"
        self.enable_hindi = enable_hindi
        self.model_name = self.provider if self.provider else "unconfigured-ocr"
        self._ocr_engine = None
        self._load_error: str | None = None

    @property
    def is_available(self) -> bool:
        return self.ocr_enabled and self.provider in {"paddleocr", "mock", "placeholder"}

    def _resolve_language(self, language: str | None) -> str:
        normalized = (language or self.default_language or "en").strip().lower()
        if normalized == "auto":
            return "en"
        if normalized == "hi" and self.enable_hindi:
            return "hi"
        return "en"

    def _load_engine(self, language: str):
        if self._ocr_engine is not None:
            return self._ocr_engine

        if self._load_error:
            raise RuntimeError(self._load_error)

        try:
            from paddleocr import PaddleOCR
        except Exception as exc:  # pragma: no cover - optional dependency
            self._load_error = f"PaddleOCR dependency is unavailable: {exc}"
            raise RuntimeError(self._load_error) from exc

        try:
            self._ocr_engine = PaddleOCR(use_angle_cls=True, lang=language, show_log=False)
            return self._ocr_engine
        except Exception as exc:  # pragma: no cover - runtime dependency specific
            self._load_error = f"PaddleOCR model could not be initialized: {exc}"
            raise RuntimeError(self._load_error) from exc

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
                "language": language or self.default_language,
            },
            confidence=0.0,
            explanation="Mock OCR fallback returned decoded text bytes for local development and tests.",
            risk_level="low",
            model_status="fallback",
        )

    def extract_image(self, *, file_path: str, language: str | None = None) -> AdapterResult:
        path = Path(file_path)

        if not self.ocr_enabled:
            return AdapterResult(
                output={"raw_text": "", "pages": [], "blocks": [], "language": language or self.default_language},
                confidence=0.0,
                explanation="OCR is disabled in configuration.",
                risk_level="low",
                model_status="unavailable",
            )

        if self.provider in {"mock", "placeholder"}:
            return self._mock_extract(path, language)

        if self.provider != "paddleocr":
            return AdapterResult(
                output={"raw_text": "", "pages": [], "blocks": [], "language": language or self.default_language},
                confidence=0.0,
                explanation=f"Configured OCR provider '{self.provider}' is not supported in this build.",
                risk_level="low",
                model_status="fallback" if self.enable_fallbacks else "unavailable",
            )

        resolved_language = self._resolve_language(language)

        try:
            engine = self._load_engine(resolved_language)
        except RuntimeError as exc:
            return AdapterResult(
                output={"raw_text": "", "pages": [], "blocks": [], "language": language or self.default_language},
                confidence=0.0,
                explanation=str(exc),
                risk_level="low",
                model_status="unavailable",
            )

        try:
            results = engine.ocr(str(path), cls=True) or []
            blocks = []
            page_text_parts = []
            confidences = []

            for page in results:
                for item in page or []:
                    line = item[1] if len(item) > 1 else None
                    if not line:
                        continue
                    text = (line[0] or "").strip()
                    if not text:
                        continue
                    confidence = bounded_confidence(line[1] if len(line) > 1 else 0.0)
                    blocks.append({"text": text, "confidence": confidence})
                    page_text_parts.append(text)
                    confidences.append(confidence)

            raw_text = "\n".join(page_text_parts).strip()
            page_confidence = average_confidence(confidences)
            return AdapterResult(
                output={
                    "raw_text": raw_text,
                    "pages": [{"page_number": 1, "text": raw_text, "confidence": page_confidence}],
                    "blocks": blocks,
                    "language": resolved_language,
                },
                confidence=page_confidence,
                explanation="OCR extraction completed with PaddleOCR.",
                risk_level="low",
                model_status="available",
            )
        except Exception as exc:  # pragma: no cover - depends on runtime
            return AdapterResult(
                output={"raw_text": "", "pages": [], "blocks": [], "language": resolved_language},
                confidence=0.0,
                explanation=f"PaddleOCR runtime failed: {exc}",
                risk_level="low",
                model_status="fallback" if self.enable_fallbacks else "unavailable",
            )
