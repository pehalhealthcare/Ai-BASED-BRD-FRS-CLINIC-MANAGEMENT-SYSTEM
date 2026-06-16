from app.config import get_settings

MEDICAL_DISCLAIMER = (
    "This AI output is for clinical assistance only and is not a final diagnosis. "
    "A qualified doctor must review and confirm."
)

CLINICAL_NOTE_DISCLAIMER = (
    "This AI-generated note is a draft and must be reviewed and edited by a qualified doctor."
)

OCR_DISCLAIMER = "OCR result must be verified by clinic staff before saving."
CONSULTATION_SUGGESTION_DISCLAIMER = "AI suggestions are not a final diagnosis. Doctor review is mandatory."
PRESCRIPTION_FORMAT_DISCLAIMER = "AI formatted this text only. Doctor approval is mandatory."


def get_medical_disclaimer() -> str:
    return MEDICAL_DISCLAIMER


def get_clinical_note_disclaimer() -> str:
    return CLINICAL_NOTE_DISCLAIMER


def get_ocr_disclaimer() -> str:
    return OCR_DISCLAIMER


def get_consultation_suggestion_disclaimer() -> str:
    return CONSULTATION_SUGGESTION_DISCLAIMER


def get_prescription_format_disclaimer() -> str:
    settings = get_settings()
    return settings.ai_medical_disclaimer or PRESCRIPTION_FORMAT_DISCLAIMER
