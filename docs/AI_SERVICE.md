# AI Service

## Purpose

The AI service is the FastAPI-based assistive layer for AI-CMS workflows. It provides safe symptom support, diagnosis assist, OCR document extraction, lab report extraction, voice transcription, and clinical note formatting.

This service assists clinic staff and doctors. It does not replace clinical judgment, does not provide final diagnosis, and does not prescribe medication.

## Endpoints

### Health

- `GET /health`
- `GET /api/v1/health`

Response:

```json
{
  "success": true,
  "message": "AI service is healthy",
  "data": {
    "service": "ai-service",
    "status": "ok",
    "version": "1.0.0"
  }
}
```

### Symptom Check

- `POST /api/v1/ai/symptom-check`

Request:

```json
{
  "symptoms": "fever, cough and body pain for 2 days",
  "age": 28,
  "gender": "male",
  "duration": "2 days",
  "known_conditions": ["diabetes"],
  "language": "en"
}
```

Response:

```json
{
  "success": true,
  "message": "Symptom analysis generated successfully",
  "data": {
    "possible_conditions": [
      {
        "name": "Viral Fever",
        "confidence": 0.72,
        "reason": "Fever, cough, body pain, and fatigue commonly appear in viral infections."
      }
    ],
    "recommended_specialization": "General Physician",
    "urgency": "medium",
    "red_flags": [],
    "doctor_note_summary": "Patient reports fever, cough and body pain for 2 days.",
    "safety_disclaimer": "This AI output is for clinical assistance only and is not a final diagnosis. A qualified doctor must review and confirm."
  }
}
```

### No-Show

- `POST /api/v1/ai/no-show`
- `POST /api/v1/ai/no-show-predict`
- `POST /ai/no-show-predict`
- `POST /api/v1/ai/train/no-show`
- `POST /ai/train/no-show`

Request:

```json
{
  "patient_id": "PAT-00001",
  "appointment_date": "2026-04-25",
  "appointment_time": "10:30",
  "weekday": "friday",
  "doctor_id": "DOC-1001",
  "department": "General Physician",
  "booking_source": "reception",
  "previous_visits": 5,
  "previous_no_shows": 1,
  "previous_cancellations": 1,
  "lead_time_hours": 48,
  "reminder_sent": true,
  "payment_status": "paid"
}
```

Response:

```json
{
  "success": true,
  "message": "No-show risk generated successfully",
  "data": {
    "output": {
      "risk_score": 0.4,
      "risk_level": "medium",
      "reason_codes": ["REMINDER_NOT_SENT"],
      "recommended_action": "Send reminder and confirm appointment.",
      "requires_staff_review": true
    },
    "confidence": 0.58,
    "model_name": "xgboost_no_show",
    "model_version": "phase-20-xgb-20260426120000",
    "model_status": "available",
    "audit_id": "generated-uuid"
  }
}
```

Training notes:

- `POST /ai/train/no-show` accepts historical appointment records
- `cancelled` records are excluded from binary training
- if there are too few labelled rows, the route returns a clean insufficient-data response
- if `xgboost` is unavailable, training returns an unavailable response without crashing the service

### OCR Document Extraction

- `POST /ai/ocr-extract`
- `POST /api/v1/ai/ocr-extract`
- `POST /api/v1/ai/ocr-patient-document` (legacy alias)
- Content type: `multipart/form-data`
- File field: `file`

Behavior:

- supports `png`, `jpg`, `jpeg`, and `pdf`
- returns `raw_text`, `pages`, and `extracted_fields`
- masks sensitive identity values by default
- includes field-level confidence and `needs_review`
- always requires human review before saving

### Lab Report Extraction

- `POST /ai/lab-report-extract`
- `POST /api/v1/ai/lab-report-extract`
- Content type: `multipart/form-data`
- File field: `file`

Behavior:

- extracts common lab parameters into `test_results`
- applies rule-based abnormal detection using local reference ranges
- returns `abnormal_values` and `critical_values`
- always requires doctor or lab technician review

### Transcribe

- `POST /api/v1/ai/transcribe`
- Content type: `multipart/form-data`
- File field: `audio`

Response:

```json
{
  "success": true,
  "message": "Transcription completed with MVP placeholder",
  "data": {
    "transcript": "",
    "language": "en",
    "confidence": 0.0,
    "engine": "placeholder",
    "requires_manual_review": true
  }
}
```

### Format Clinical Note

- `POST /api/v1/ai/format-clinical-note`

Request:

```json
{
  "raw_note": "patient has fever and cough for two days no chest pain appetite low",
  "format": "SOAP"
}
```

### Consultation Suggestions

- `POST /api/v1/clinical/consultation-suggestions`

Request:

```json
{
  "consultationId": "665555555555555555555555",
  "patient": {
    "age": 30,
    "gender": "male",
    "knownAllergies": [],
    "existingConditions": ["diabetes"]
  },
  "symptoms": ["fever", "cough"],
  "vitals": {
    "temperature": 101,
    "spo2": 98
  },
  "clinicalNotes": "Patient reports fever and cough for two days.",
  "previousHistorySummary": "Recent history: consultation for viral fever last month."
}
```

Response:

```json
{
  "success": true,
  "message": "AI suggestions generated",
  "data": {
    "suggestions": [
      {
        "suggestionType": "diagnosis",
        "title": "Possible viral upper respiratory infection",
        "content": "Fever and cough can be seen in common viral respiratory illnesses. Clinical examination and doctor review are required.",
        "confidence": 0.72,
        "reasoning": "The symptom combination of fever and cough commonly appears in upper respiratory viral patterns.",
        "redFlags": [],
        "disclaimer": "AI suggestions are not a final diagnosis. Doctor review is mandatory."
      }
    ],
    "modelName": "rule-based-mvp-clinical-assistant",
    "modelVersion": "0.1.0"
  }
}
```

### Format Note

- `POST /api/v1/clinical/format-note`

Request:

```json
{
  "rawNote": "Patient has fever and cough for 2 days."
}
```

Response:

```json
{
  "success": true,
  "message": "Clinical note formatted successfully",
  "data": {
    "subjective": "Patient has fever and cough for 2 days.",
    "objective": "Not provided.",
    "assessment": "Possible acute febrile illness. Doctor review required.",
    "plan": "Doctor to evaluate, confirm diagnosis, and decide treatment plan.",
    "disclaimer": "This AI-generated note is a draft and must be reviewed and edited by a qualified doctor."
  }
}
```

Response:

```json
{
  "success": true,
  "message": "Clinical note formatted successfully",
  "data": {
    "format": "SOAP",
    "formatted_note": {
      "subjective": "Patient has fever and cough for two days no chest pain appetite low.",
      "objective": "Not provided.",
      "assessment": "Possible acute febrile illness. Doctor review required.",
      "plan": "Doctor to evaluate, confirm diagnosis, and decide treatment plan."
    },
    "safety_disclaimer": "This AI-generated note is a draft and must be reviewed and edited by a qualified doctor."
  }
}
```

## Safety Rules

- AI output is assistive only and not a final diagnosis.
- Symptom output never claims a confirmed diagnosis.
- Symptom output never prescribes medicine or dosage.
- Consultation suggestions never replace the doctor primary diagnosis automatically.
- Red-flag symptoms escalate urgency and direct to urgent care.
- OCR output always requires manual verification before saving.
- Transcription output always requires doctor review.
- Clinical note output is a draft that must be reviewed by a qualified doctor.
- Lab report extraction is assistive only and must be reviewed before values are committed.

## Current MVP Limitations

- Symptom checker is rule-based, not a trained medical model.
- No-show prediction now supports a trainable XGBoost path, while safe rule-based fallback remains active when the model is missing or insufficient data exists.
- Consultation suggestions are rule-based, not a trained diagnostic model.
- OCR supports review-first structured extraction, but optional OCR dependencies may still be unavailable on some machines.
- Transcription supports real STT when configured, but local runtime depends on optional model availability.
- Clinical note formatting is rule-based and does not infer missing vitals, medication, or confirmed diagnosis.

## Optional OCR Setup

1. Install `pip install -r ai-service/requirements-ocr.txt`.
2. Configure `OCR_PROVIDER=paddleocr`.
3. Optionally configure `OCR_FALLBACK_PROVIDER=tesseract`.
4. Keep `MASK_SENSITIVE_FIELDS=true` unless the clinic has an approved reason to change masking behavior.
5. Keep human review in place for registration and lab workflows.

## How To Enable Whisper Later

1. Add a Whisper-compatible engine such as `faster-whisper` or `openai-whisper`.
2. Update `requirements.txt` and document any model download or GPU prerequisites.
3. Set `WHISPER_ENABLED=true` in `ai-service/.env`.
4. Extend `app/services/speech_to_text_service.py` to call the real transcription engine and preserve the current response contract.
5. Keep manual review in place for clinical workflows.

## How Backend Connects To The AI Service

The Node.js backend uses `AI_SERVICE_URL` and proxies validated requests through:

- `POST /api/v1/ai/symptom-check`
- `POST /api/v1/ai/no-show`
- `POST /api/v1/ai/format-clinical-note`

If the AI service is unavailable, the backend returns:

```json
{
  "success": false,
  "message": "AI service is temporarily unavailable",
  "errors": ["Unable to connect to AI service"]
}
```
