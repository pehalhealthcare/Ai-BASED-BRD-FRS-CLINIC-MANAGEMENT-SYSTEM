AI_DRAFT_LABEL = "AI-generated draft. Doctor review required."
AI_DRAFT_WARNING = "Do not treat as final clinical documentation until approved."
AI_TRANSCRIPTION_EXPLANATION = "Speech-to-text transcription generated for doctor review."
AI_CLINICAL_NOTE_EXPLANATION = "Clinical note formatted from transcript. Doctor review required."


def get_ai_draft_disclaimer() -> str:
    return f"{AI_DRAFT_LABEL} {AI_DRAFT_WARNING}"
