from dataclasses import dataclass
from functools import lru_cache

from app.adapters.anomaly_adapter import BillingAnomalyAdapter
from app.adapters.drug_safety import DrugSafetyAdapter
from app.adapters.forecasting import ForecastingAdapter
from app.adapters.llm_adapter import LLMAdapter
from app.adapters.note_formatter_adapter import NoteFormatterAdapter
from app.adapters.paddle_ocr import PaddleOCRAdapter
from app.adapters.pdf_adapter import PDFAdapter
from app.adapters.tesseract_adapter import TesseractAdapter
from app.adapters.whisper_adapter import WhisperAdapter
from app.adapters.xgboost_no_show import XGBoostNoShowAdapter
from app.core.settings import get_settings


@dataclass(frozen=True)
class AdapterRegistry:
    llm_adapter: LLMAdapter
    whisper_stt: WhisperAdapter
    note_formatter: NoteFormatterAdapter
    paddle_ocr: PaddleOCRAdapter
    tesseract_ocr: TesseractAdapter
    pdf_adapter: PDFAdapter
    drug_safety: DrugSafetyAdapter
    xgboost_no_show: XGBoostNoShowAdapter
    forecasting: ForecastingAdapter
    billing_anomaly: BillingAnomalyAdapter


@lru_cache
def get_adapter_registry() -> AdapterRegistry:
    settings = get_settings()

    llm_adapter = LLMAdapter(
        provider=settings.llm_provider,
        api_key=settings.llm_api_key,
        model_name=settings.llm_model,
        timeout_seconds=settings.llm_timeout_seconds,
        enable_llm=settings.enable_llm,
    )

    return AdapterRegistry(
        llm_adapter=llm_adapter,
        whisper_stt=WhisperAdapter(
            provider=settings.stt_provider,
            enable_stt=settings.enable_stt,
            enable_fallbacks=settings.enable_ai_fallbacks,
            model_size=settings.whisper_model_size,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
            api_key=settings.llm_api_key,
        ),
        note_formatter=NoteFormatterAdapter(llm_adapter=llm_adapter),
        paddle_ocr=PaddleOCRAdapter(
            provider=settings.ocr_provider,
            ocr_enabled=settings.ocr_enabled,
            enable_fallbacks=settings.enable_ai_fallbacks,
            default_language=settings.ocr_language,
            enable_hindi=settings.ocr_enable_hindi,
        ),
        tesseract_ocr=TesseractAdapter(
            provider=settings.ocr_fallback_provider,
            enable_fallbacks=settings.enable_ai_fallbacks,
        ),
        pdf_adapter=PDFAdapter(
            max_pages=settings.ocr_max_pdf_pages,
        ),
        drug_safety=DrugSafetyAdapter(
            provider=settings.drug_data_provider,
            enable_fallbacks=settings.enable_ai_fallbacks,
        ),
        xgboost_no_show=XGBoostNoShowAdapter(
            enable_placeholder=settings.enable_no_show_placeholder,
            enable_fallbacks=settings.enable_ai_fallbacks,
        ),
        forecasting=ForecastingAdapter(
            provider=settings.model_provider,
            enable_fallbacks=settings.enable_ai_fallbacks,
            enable_forecast=settings.enable_pharmacy_forecast,
            min_records=settings.pharmacy_forecast_min_records,
            model_dir=settings.model_dir,
        ),
        billing_anomaly=BillingAnomalyAdapter(
            provider=settings.model_provider,
            enable_fallbacks=settings.enable_ai_fallbacks,
            model_dir=settings.model_dir,
            min_training_records=settings.billing_anomaly_min_training_records,
        ),
    )


def summarize_adapter_status() -> dict[str, dict[str, str | bool]]:
    registry = get_adapter_registry()

    return {
        "llm_adapter": {
            "model_name": registry.llm_adapter.model_name,
            "model_version": registry.llm_adapter.model_version,
            "available": registry.llm_adapter.is_available,
        },
        "whisper_stt": {
            "model_name": registry.whisper_stt.model_name,
            "model_version": registry.whisper_stt.model_version,
            "available": registry.whisper_stt.is_available,
        },
        "note_formatter": {
            "model_name": registry.note_formatter.model_name,
            "model_version": registry.note_formatter.model_version,
            "available": registry.note_formatter.is_available,
        },
        "paddle_ocr": {
            "model_name": registry.paddle_ocr.model_name,
            "model_version": registry.paddle_ocr.model_version,
            "available": registry.paddle_ocr.is_available,
        },
        "tesseract_ocr": {
            "model_name": registry.tesseract_ocr.model_name,
            "model_version": registry.tesseract_ocr.model_version,
            "available": registry.tesseract_ocr.is_available,
        },
        "pdf_adapter": {
            "model_name": registry.pdf_adapter.model_name,
            "model_version": registry.pdf_adapter.model_version,
            "available": True,
        },
        "drug_safety": {
            "model_name": registry.drug_safety.model_name,
            "model_version": registry.drug_safety.model_version,
            "available": registry.drug_safety.is_available,
        },
        "xgboost_no_show": {
            "model_name": registry.xgboost_no_show.model_name,
            "model_version": registry.xgboost_no_show.model_version,
            "available": registry.xgboost_no_show.is_available,
        },
        "forecasting": {
            "model_name": registry.forecasting.model_name,
            "model_version": registry.forecasting.model_version,
            "available": registry.forecasting.is_available,
        },
        "billing_anomaly": {
            "model_name": registry.billing_anomaly.model_name,
            "model_version": registry.billing_anomaly.model_version,
            "available": registry.billing_anomaly.is_available,
        },
    }
