from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from app.adapters.base import BaseModelAdapter
from app.core.confidence import average_confidence
from app.models.adapter_result import AdapterResult


class PDFAdapter(BaseModelAdapter):
    adapter_name = "pdf_adapter"
    model_name = "pdf-adapter"
    model_version = "phase-18-ocr-0.1.0"

    def __init__(self, *, max_pages: int):
        self.max_pages = max_pages

    def extract_pdf(self, *, file_path: str, primary_ocr, fallback_ocr=None, language: str | None = None) -> AdapterResult:
        path = Path(file_path)

        try:
            from pdf2image import convert_from_path
        except Exception:
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
                explanation="PDF rasterization dependencies are unavailable, so a safe text-decoding fallback was used.",
                risk_level="low",
                model_status="fallback",
            )

        temp_images: list[Path] = []

        try:
            images = convert_from_path(str(path), first_page=1, last_page=self.max_pages)
            page_outputs = []
            blocks = []
            model_status = "available"
            explanations = []

            for index, image in enumerate(images, start=1):
                temp_path = path.parent / f"{uuid4()}.png"
                temp_images.append(temp_path)
                image.save(temp_path, format="PNG")

                result = primary_ocr(file_path=str(temp_path), language=language)
                if result.model_status == "unavailable" and fallback_ocr is not None:
                    result = fallback_ocr(file_path=str(temp_path), language=language)

                page = (result.output.get("pages") or [{"page_number": index, "text": "", "confidence": 0.0}])[0]
                page_outputs.append(
                    {
                        "page_number": index,
                        "text": page.get("text", ""),
                        "confidence": page.get("confidence", 0.0),
                    }
                )
                blocks.extend(result.output.get("blocks", []))
                explanations.append(result.explanation)
                if result.model_status != "available":
                    model_status = result.model_status

            raw_text = "\n\n".join(page["text"] for page in page_outputs if page.get("text")).strip()
            confidence = average_confidence([page.get("confidence", 0.0) for page in page_outputs])

            return AdapterResult(
                output={
                    "raw_text": raw_text,
                    "pages": page_outputs,
                    "blocks": blocks,
                    "language": language or "en",
                },
                confidence=confidence,
                explanation=" ".join(explanations).strip() or "PDF OCR extraction completed.",
                risk_level="low",
                model_status=model_status,
            )
        except Exception as exc:  # pragma: no cover - runtime specific
            return AdapterResult(
                output={"raw_text": "", "pages": [], "blocks": [], "language": language or "en"},
                confidence=0.0,
                explanation=f"PDF conversion failed: {exc}",
                risk_level="low",
                model_status="unavailable",
            )
        finally:
            for item in temp_images:
                try:
                    if item.exists():
                        item.unlink()
                except OSError:
                    pass
