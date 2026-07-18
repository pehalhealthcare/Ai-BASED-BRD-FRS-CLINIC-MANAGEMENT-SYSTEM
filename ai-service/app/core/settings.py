from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    ai_service_name: str = "ai-cms-ai-service"
    ai_service_host: str = "0.0.0.0"
    ai_service_port: int = Field(default=8000, validation_alias=AliasChoices("AI_SERVICE_PORT", "PORT"))
    backend_api_url: str = Field(default="http://localhost:5000/api/v1", validation_alias=AliasChoices("BACKEND_API_URL"))
    frontend_url: str = Field(default="http://localhost:5173", validation_alias=AliasChoices("FRONTEND_URL"))
    backend_url: str = Field(default="http://localhost:5000", validation_alias=AliasChoices("BACKEND_URL"))
    cors_origins: str = "http://localhost:5173,http://localhost:5000"

    model_provider: str = Field(default="placeholder", validation_alias=AliasChoices("MODEL_PROVIDER"))
    model_mode: str = Field(default="rule_based_mvp", validation_alias=AliasChoices("MODEL_MODE"))
    model_dir: str = Field(default="app/models", validation_alias=AliasChoices("MODEL_DIR"))
    enable_heavy_models: bool = False
    enable_model_downloads: bool = Field(default=False, validation_alias=AliasChoices("ENABLE_MODEL_DOWNLOADS"))
    enable_ai_fallbacks: bool = Field(default=True, validation_alias=AliasChoices("ENABLE_AI_FALLBACKS"))
    enable_pharmacy_forecast: bool = Field(default=True, validation_alias=AliasChoices("ENABLE_PHARMACY_FORECAST"))
    pharmacy_forecast_min_records: int = Field(default=30, validation_alias=AliasChoices("PHARMACY_FORECAST_MIN_RECORDS"))
    billing_anomaly_min_training_records: int = Field(
        default=300, validation_alias=AliasChoices("BILLING_ANOMALY_MIN_TRAINING_RECORDS")
    )

    llm_provider: str = Field(default="mock", validation_alias=AliasChoices("LLM_PROVIDER"))
    llm_api_key: str = Field(default="", validation_alias=AliasChoices("LLM_API_KEY"))
    llm_model: str = Field(default="mock-medical-json", validation_alias=AliasChoices("LLM_MODEL"))
    llm_timeout_seconds: int = Field(default=20, validation_alias=AliasChoices("LLM_TIMEOUT_SECONDS"))
    enable_llm: bool = Field(default=True, validation_alias=AliasChoices("ENABLE_LLM"))
    stt_provider: str = Field(default="faster_whisper", validation_alias=AliasChoices("STT_PROVIDER"))
    ocr_provider: str = Field(default="paddleocr", validation_alias=AliasChoices("OCR_PROVIDER"))
    ocr_fallback_provider: str = Field(default="tesseract", validation_alias=AliasChoices("OCR_FALLBACK_PROVIDER"))
    drug_data_provider: str = Field(default="local", validation_alias=AliasChoices("DRUG_DATA_PROVIDER"))
    drugbank_api_key: str = Field(default="", validation_alias=AliasChoices("DRUGBANK_API_KEY"))
    drugbank_base_url: str = Field(default="", validation_alias=AliasChoices("DRUGBANK_BASE_URL"))
    enable_drugbank: bool = Field(default=False, validation_alias=AliasChoices("ENABLE_DRUGBANK"))
    ai_audit_log_path: str = Field(default="storage/ai_audit.jsonl", validation_alias=AliasChoices("AI_AUDIT_LOG_PATH"))

    whisper_model_size: str = Field(default="base", validation_alias=AliasChoices("WHISPER_MODEL_SIZE"))
    whisper_device: str = Field(default="cpu", validation_alias=AliasChoices("WHISPER_DEVICE"))
    whisper_compute_type: str = Field(default="int8", validation_alias=AliasChoices("WHISPER_COMPUTE_TYPE"))
    audio_temp_dir: str = Field(default="./tmp/audio", validation_alias=AliasChoices("AUDIO_TEMP_DIR"))
    enable_stt: bool = Field(default=True, validation_alias=AliasChoices("ENABLE_STT"))
    whisper_enabled: bool = Field(default=False, validation_alias=AliasChoices("WHISPER_ENABLED"))
    ocr_enabled: bool = Field(default=True, validation_alias=AliasChoices("OCR_ENABLED"))
    ocr_max_file_mb: int = Field(default=10, validation_alias=AliasChoices("OCR_MAX_FILE_MB"))
    ocr_max_pdf_pages: int = Field(default=5, validation_alias=AliasChoices("OCR_MAX_PDF_PAGES"))
    ocr_language: str = Field(default="en", validation_alias=AliasChoices("OCR_LANGUAGE"))
    ocr_enable_hindi: bool = Field(default=False, validation_alias=AliasChoices("OCR_ENABLE_HINDI"))
    mask_sensitive_fields: bool = Field(default=True, validation_alias=AliasChoices("MASK_SENSITIVE_FIELDS"))
    ocr_confidence_review_threshold: float = Field(default=0.85, validation_alias=AliasChoices("OCR_CONFIDENCE_REVIEW_THRESHOLD"))
    enable_no_show_placeholder: bool = True
    no_show_model_dir: str = Field(default="app/models/no_show", validation_alias=AliasChoices("NO_SHOW_MODEL_DIR"))
    no_show_min_training_rows: int = Field(default=100, validation_alias=AliasChoices("NO_SHOW_MIN_TRAINING_ROWS"))
    no_show_enable_training: bool = Field(default=True, validation_alias=AliasChoices("NO_SHOW_ENABLE_TRAINING"))
    max_upload_mb: int = 10
    max_audio_mb: int = Field(default=25, validation_alias=AliasChoices("MAX_AUDIO_MB"))
    document_temp_dir: str = Field(default="./tmp/documents", validation_alias=AliasChoices("DOCUMENT_TEMP_DIR"))
    ai_medical_disclaimer: str = "AI assistance is not a final diagnosis or prescription. Doctor approval is mandatory."

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        explicit_origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        combined = [*explicit_origins, self.frontend_url, self.backend_url]
        return list(dict.fromkeys(origin for origin in combined if origin))


@lru_cache
def get_settings() -> Settings:
    return Settings()
