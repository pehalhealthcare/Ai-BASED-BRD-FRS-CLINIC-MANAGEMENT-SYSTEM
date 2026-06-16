# AI Service

## Purpose

The AI service is the FastAPI-based assistive layer for AI-CMS. It provides review-first helpers for symptom support, diagnosis assist, clinical note drafting, speech-to-text transcription, OCR document extraction, lab report extraction, and trainable no-show prediction.

Clinical outputs are assistive only. They are never final diagnosis, treatment advice, or final EMR content without human review.

## Phase 18 OCR Features

Available endpoints:

- `POST /ai/ocr-extract`
- `POST /api/v1/ai/ocr-extract`
- `POST /api/v1/ai/ocr-patient-document` (legacy alias)
- `POST /ai/lab-report-extract`
- `POST /api/v1/ai/lab-report-extract`

Behavior:

- document OCR returns draft structured fields for review
- sensitive fields are masked by default
- field-level confidence is included
- low-confidence fields are marked `needs_review`
- lab values are extracted and checked against local reference ranges
- lab extraction always requires doctor or lab technician review

## OCR Environment

- `OCR_PROVIDER=paddleocr`
- `OCR_FALLBACK_PROVIDER=tesseract`
- `OCR_ENABLED=true`
- `OCR_MAX_FILE_MB=10`
- `OCR_MAX_PDF_PAGES=5`
- `OCR_LANGUAGE=en`
- `OCR_ENABLE_HINDI=false`
- `MASK_SENSITIVE_FIELDS=true`
- `OCR_CONFIDENCE_REVIEW_THRESHOLD=0.85`
- `DOCUMENT_TEMP_DIR=./tmp/documents`

## Optional OCR Dependencies

The service still starts if OCR packages are missing because adapters use lazy imports and safe fallback behavior.

Install OCR extras when needed:

```bash
pip install -r requirements-ocr.txt
```

Common extras:

- `paddleocr`
- `paddlepaddle`
- `pytesseract`
- `Pillow`
- `pdf2image`

System notes:

- Tesseract fallback needs a local Tesseract installation
- `pdf2image` may require Poppler
- PaddleOCR and PaddlePaddle setup varies by platform

## Privacy And Safety

- Aadhaar-like 12-digit values are masked as `XXXX-XXXX-1234`
- phone numbers are masked as `98XXXXXX10`
- email addresses are partially masked
- OCR and lab extraction are review-first outputs only
- lab extraction is not clinically validated automation

## Verification

Verified in this repo:

- `python -m pytest`
- `python -m py_compile app/main.py`
- `python -m py_compile app/routes/ocr_routes.py`
- `python -m py_compile app/routes/lab_report_routes.py`
- live startup probe with `uvicorn app.main:app`

## Phase 20 No-Show Prediction ML Upgrade

Available endpoints:

- `POST /ai/no-show-predict`
- `POST /api/v1/ai/no-show-predict`
- `POST /api/v1/ai/no-show` (legacy compatibility route)
- `POST /ai/train/no-show`
- `POST /api/v1/ai/train/no-show`

Behavior:

- prediction tries a trained `XGBoostClassifier` model first
- if a trained model is missing, the service returns safe rule-based scoring with `model_status=fallback`
- if the last training attempt did not have enough data, prediction can surface `model_status=insufficient_data`
- training excludes `cancelled` appointments from the binary no-show model
- every prediction includes an `audit_id`
- no-show scoring is assistive only and must not be used to deny care

Environment:

- `NO_SHOW_MODEL_DIR=app/models/no_show`
- `NO_SHOW_MIN_TRAINING_ROWS=100`
- `NO_SHOW_ENABLE_TRAINING=true`

Artifacts saved after successful training:

- `no_show_xgboost.pkl`
- `no_show_preprocessor.json`
- `metadata.json`
- `metrics.json`
