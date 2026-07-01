import json

from fastapi import UploadFile

from app.core.ai_response_factory import build_standard_ai_response
from app.core.settings import get_settings
from app.core.department_mapping import map_to_department
from app.core.medical_safety import (
    get_clinical_disclaimer,
    get_diagnosis_assist_system_prompt,
    get_symptom_check_system_prompt,
)
from app.core.red_flags import derive_risk_level, detect_red_flags
from app.evaluation.adapter_registry import get_adapter_registry
from app.models.ai_response import StandardAIResponse
from app.safety.guardrails import sanitize_medical_output
from app.safety.medical_disclaimer import get_medical_disclaimer, get_ocr_disclaimer
from app.schemas.ai_foundation_schema import DiagnosisAssistRequest, DrugSafetyCheckRequest
from app.schemas.clinical_schema import DiagnosisSuggestionRequest
from app.schemas.no_show_schema import NoShowRequest
from app.schemas.symptom_schema import SymptomCheckRequest
from app.services.ai_audit_service import record_ai_audit_event
from app.services.diagnosis_suggestion_service import generate_diagnosis_suggestions
from app.services.drug_safety_service import build_drug_safety_response
from app.services.ocr_service import extract_document_upload
from app.services.symptom_checker import analyze_symptoms
from app.utils.file_utils import validate_upload_file
from app.utils.logger import get_logger

logger = get_logger("ai-foundation-service")


def _confidence_to_likelihood(value: float) -> str:
    if value >= 0.8:
        return "high"
    if value >= 0.55:
        return "medium"
    return "low"


def _general_follow_up_questions(symptoms_text: str) -> list[str]:
    questions = ["Do you have shortness of breath?", "What is your temperature?", "Are your symptoms getting worse?"]
    lowered = symptoms_text.lower()

    if "cough" in lowered:
        questions.append("Is the cough dry or with sputum?")
    if "pain" in lowered:
        questions.append("Where exactly is the pain and how severe is it?")

    return questions[:4]


def _history_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return json.dumps(value, default=str)


def _fallback_symptom_output(payload: SymptomCheckRequest) -> tuple[dict, float]:
    legacy = analyze_symptoms(payload)
    red_flags = detect_red_flags(
        symptoms_text=payload.symptoms,
        age=payload.age,
        gender=payload.gender,
        known_conditions=payload.known_conditions,
    )
    possible_conditions = legacy.get("possible_conditions", [])
    department = map_to_department(
        symptom_text=payload.symptoms,
        candidate_conditions=[item.get("name", "") for item in possible_conditions],
        age=payload.age,
    )
    output = sanitize_medical_output(
        {
            "top_3_possible_conditions": [
                {
                    "condition": item.get("name", "Possible condition based on symptoms"),
                    "likelihood": _confidence_to_likelihood(item.get("confidence", 0.0)),
                    "reason": item.get("reason", "Doctor review is required."),
                }
                for item in possible_conditions[:3]
            ],
            "recommended_department": department,
            "red_flags": red_flags,
            "home_care_general_advice": [
                "Stay hydrated.",
                "Rest.",
                "Monitor your symptoms and temperature.",
            ],
            "when_to_seek_emergency_care": [
                "Seek urgent care if breathing difficulty, chest pain, confusion, fainting, or persistent high fever occurs."
            ],
            "follow_up_questions": _general_follow_up_questions(payload.symptoms),
            "disclaimer": get_clinical_disclaimer(),
        }
    )
    confidence = max((item.get("confidence", 0.0) for item in possible_conditions), default=0.0)
    return output, confidence


def _fallback_diagnosis_output(payload: DiagnosisAssistRequest) -> tuple[dict, float]:
    history_text = _history_text(payload.history)
    synthetic = DiagnosisSuggestionRequest(
        chiefComplaint=payload.symptoms,
        symptoms=[{"name": payload.symptoms, "severity": "moderate", "duration": None, "notes": None}],
        vitals=payload.vitals,
        clinicalNotes=history_text or payload.doctor_notes or payload.lab_summary or payload.symptoms,
        patientContext={
            "age": None,
            "gender": None,
            "previousDiagnoses": payload.known_conditions,
        },
    )
    legacy = generate_diagnosis_suggestions(synthetic)
    red_flags = detect_red_flags(
        symptoms_text=payload.symptoms,
        history_text=history_text,
        vitals=payload.vitals,
        known_conditions=payload.known_conditions,
        doctor_notes=payload.doctor_notes,
        lab_summary=payload.lab_summary,
    )
    suggestions = legacy.get("suggestions", [])
    department = map_to_department(
        symptom_text=payload.symptoms,
        candidate_conditions=[item.get("condition", "") for item in suggestions],
        age=None,
    )
    output = sanitize_medical_output(
        {
            "clinical_summary": f"Assistive summary: {payload.symptoms.strip()}",
            "top_3_diagnosis_suggestions": [
                {
                    "diagnosis": item.get("condition", "Possible non-specific acute illness"),
                    "likelihood": _confidence_to_likelihood(item.get("confidence", 0.0)),
                    "supporting_evidence": [item.get("reasoning", "Clinical review is required.")],
                    "missing_information": ["Focused examination findings", "Symptom progression", "Relevant test results"],
                    "contraindications_or_warnings": item.get("redFlags", []) or ["Doctor review is required before recording a diagnosis."],
                }
                for item in suggestions[:3]
            ],
            "recommended_next_questions": [
                "How have the symptoms changed over time?",
                "Are there any emergency symptoms such as chest pain, confusion, or severe breathing difficulty?",
                "What exam findings or test results are available?",
            ],
            "recommended_department": department,
            "red_flags": red_flags,
            "doctor_action_required": [
                "Review AI suggestions.",
                "Confirm diagnosis clinically.",
                "Approve or reject before saving.",
            ],
            "disclaimer": "Clinical decision support only. Not a final diagnosis.",
        }
    )
    confidence = max((item.get("confidence", 0.0) for item in suggestions), default=0.0)
    return output, confidence


def _legacy_symptom_shape(legacy_output: dict) -> dict:
    possible_conditions = legacy_output.get("possible_conditions", [])
    return {
        "possible_conditions": possible_conditions,
        "recommended_specialization": legacy_output.get("recommended_specialization", "General Physician"),
        "urgency": legacy_output.get("urgency", "low"),
        "red_flags": legacy_output.get("red_flags", []),
        "doctor_note_summary": legacy_output.get("doctor_note_summary", ""),
        "safety_disclaimer": legacy_output.get("safety_disclaimer", get_medical_disclaimer()),
        "possibleConditions": [
            {
                "name": item.get("name", ""),
                "reason": item.get("reason", ""),
                "confidence": item.get("confidence", 0.0),
            }
            for item in possible_conditions
        ],
        "recommendedSpecialization": legacy_output.get("recommended_specialization", "General Physician"),
        "redFlags": legacy_output.get("red_flags", []),
        "doctorNoteSummary": legacy_output.get("doctor_note_summary", ""),
        "disclaimer": legacy_output.get("safety_disclaimer", get_medical_disclaimer()),
    }


def legacy_symptom_response_from_standard(payload: SymptomCheckRequest, standard_response: StandardAIResponse) -> dict:
    legacy = _legacy_symptom_shape(analyze_symptoms(payload))
    legacy.update(standard_response.model_dump())
    
    # We must explicitly map the new standard shape back to the legacy shape for the UI
    if standard_response.output:
        if "top_3_possible_conditions" in standard_response.output:
            legacy["possibleConditions"] = [
                {
                    "name": cond.get("condition", ""),
                    "reason": cond.get("reason", ""),
                    "confidence": 0.0
                }
                for cond in standard_response.output["top_3_possible_conditions"]
            ]
        if "recommended_department" in standard_response.output:
            dept = standard_response.output["recommended_department"]
            if isinstance(dept, dict):
                legacy["recommendedSpecialization"] = dept.get("name", "")
            else:
                legacy["recommendedSpecialization"] = str(dept)
        if "red_flags" in standard_response.output:
            legacy["redFlags"] = standard_response.output["red_flags"]
        if "disclaimer" in standard_response.output:
            legacy["disclaimer"] = standard_response.output["disclaimer"]

    # Safety override sanity checks to ensure broken bones always point to Orthopedics in the final response
    norm_symptoms = (payload.symptoms or "").lower()
    if any(k in norm_symptoms for k in ["broken leg", "broken", "fracture", "bone break"]):
        legacy["recommendedSpecialization"] = "Orthopedics"
        legacy["recommended_specialization"] = "Orthopedics"
            
    return legacy


def run_symptom_check(payload: SymptomCheckRequest) -> StandardAIResponse:
    settings = get_adapter_registry()
    llm_adapter = settings.llm_adapter
    payload_dict = payload.model_dump()
    app_settings = get_settings()

    if llm_adapter.is_available:
        try:
            raw_output = llm_adapter.generate_medical_response(
                get_symptom_check_system_prompt(),
                json.dumps({"task": "symptom_check", "payload": payload_dict}, default=str),
            )
            output = sanitize_medical_output(
                {
                    "clinical_summary": raw_output.get("clinical_summary", f"Symptoms reported: {payload.symptoms}"),
                    "top_3_possible_conditions": raw_output.get("top_3_possible_conditions", []),
                    "recommended_department": raw_output.get("recommended_department", map_to_department(symptom_text=payload.symptoms, age=payload.age)),
                    "red_flags": raw_output.get("red_flags", []),
                    "home_care_general_advice": raw_output.get("home_care_general_advice", []),
                    "when_to_seek_emergency_care": raw_output.get("when_to_seek_emergency_care", []),
                    "follow_up_questions": raw_output.get("follow_up_questions", _general_follow_up_questions(payload.symptoms)),
                    "disclaimer": raw_output.get("disclaimer", get_clinical_disclaimer()),
                }
            )
            confidence = float(raw_output.get("confidence", 0.0))
            explanation = raw_output.get("explanation", "Configured LLM provider generated a structured symptom response.")
            risk_level = raw_output.get("risk_level", "medium")
            model_status = "available"
        except Exception as exc:
            if not app_settings.enable_ai_fallbacks:
                raise
            logger.warning("LLM symptom check failed; using rule-based fallback: %s", exc)
            output, confidence = _fallback_symptom_output(payload)
            explanation = "Configured LLM provider failed; safe rule-based symptom fallback was used."
            risk_level = derive_risk_level(output.get("red_flags", [])) if output.get("red_flags") else "medium"
            model_status = "fallback"
    else:
        output, confidence = _fallback_symptom_output(payload)
        explanation = "Configured LLM provider or key is unavailable; safe rule-based symptom fallback was used."
        risk_level = derive_risk_level(output.get("red_flags", [])) if output.get("red_flags") else "medium"
        model_status = "fallback"

    standard = build_standard_ai_response(
        output=output,
        confidence=confidence,
        explanation=explanation,
        risk_level=risk_level,
        model_name=llm_adapter.model_name,
        model_version=llm_adapter.model_version,
        model_status=model_status,
    )
    record_ai_audit_event(
        audit_id=standard.audit_id,
        endpoint="/ai/symptom-check",
        patient_id=payload.patient_id,
        payload=payload_dict,
        model_provider=llm_adapter.provider or "fallback",
        model_name=standard.model_name,
        model_status=standard.model_status,
        risk_level=standard.risk_level,
        requires_doctor_review=standard.requires_doctor_review,
        success=True,
    )
    return standard


def run_diagnosis_assist(payload: DiagnosisAssistRequest) -> StandardAIResponse:
    settings = get_adapter_registry()
    llm_adapter = settings.llm_adapter
    payload_dict = payload.model_dump()
    app_settings = get_settings()

    if llm_adapter.is_available:
        try:
            raw_output = llm_adapter.generate_medical_response(
                get_diagnosis_assist_system_prompt(),
                json.dumps(
                    {
                        "task": "diagnosis_assist",
                        "payload": {
                            **payload_dict,
                            "history_text": _history_text(payload.history),
                        },
                    },
                    default=str,
                ),
            )
            output = sanitize_medical_output(
                {
                    "clinical_summary": raw_output.get("clinical_summary", f"Assistive summary: {payload.symptoms}"),
                    "top_3_diagnosis_suggestions": raw_output.get("top_3_diagnosis_suggestions", []),
                    "recommended_next_questions": raw_output.get("recommended_next_questions", []),
                    "recommended_department": raw_output.get("recommended_department", map_to_department(symptom_text=payload.symptoms)),
                    "red_flags": raw_output.get("red_flags", []),
                    "doctor_action_required": raw_output.get(
                        "doctor_action_required",
                        ["Review AI suggestions.", "Confirm diagnosis clinically.", "Approve or reject before saving."],
                    ),
                    "disclaimer": raw_output.get("disclaimer", "Clinical decision support only. Not a final diagnosis."),
                }
            )
            confidence = float(raw_output.get("confidence", 0.0))
            explanation = raw_output.get("explanation", "Configured LLM provider generated a structured diagnosis-assist response.")
            risk_level = raw_output.get("risk_level", "medium")
            model_status = "available"
        except Exception as exc:
            if not app_settings.enable_ai_fallbacks:
                raise
            logger.warning("LLM diagnosis assist failed; using rule-based fallback: %s", exc)
            output, confidence = _fallback_diagnosis_output(payload)
            explanation = "Configured LLM provider failed; safe rule-based diagnosis-assist fallback was used."
            risk_level = derive_risk_level(output.get("red_flags", [])) if output.get("red_flags") else "medium"
            model_status = "fallback"
    else:
        output, confidence = _fallback_diagnosis_output(payload)
        explanation = "Configured LLM provider or key is unavailable; safe rule-based diagnosis-assist fallback was used."
        risk_level = derive_risk_level(output.get("red_flags", [])) if output.get("red_flags") else "medium"
        model_status = "fallback"

    standard = build_standard_ai_response(
        output=output,
        confidence=confidence,
        explanation=explanation,
        risk_level=risk_level,
        model_name=llm_adapter.model_name,
        model_version=llm_adapter.model_version,
        model_status=model_status,
    )
    record_ai_audit_event(
        audit_id=standard.audit_id,
        endpoint="/ai/diagnosis-assist",
        patient_id=payload.patient_id,
        payload=payload_dict,
        model_provider=llm_adapter.provider or "fallback",
        model_name=standard.model_name,
        model_status=standard.model_status,
        risk_level=standard.risk_level,
        requires_doctor_review=standard.requires_doctor_review,
        success=True,
    )
    return standard


async def run_transcription(file: UploadFile, language: str = "en") -> StandardAIResponse:
    await validate_upload_file(
        file=file,
        allowed_extensions={".mp3", ".wav", ".m4a", ".webm"},
        field_name="audio",
    )

    adapter = get_adapter_registry().whisper_stt
    # pyrefly: ignore [unexpected-keyword]
    adapter_result = adapter.transcribe(file_name=file.filename, language=language or "en")
    output = dict(adapter_result.output)
    output["safety_disclaimer"] = "Transcript is assistive only and must be reviewed by clinic staff or a qualified doctor."

    return build_standard_ai_response(
        output=output,
        confidence=adapter_result.confidence,
        explanation=adapter_result.explanation,
        risk_level=adapter_result.risk_level,
        model_name=adapter.model_name,
        model_version=adapter.model_version,
        model_status=adapter_result.model_status,
    )


async def run_ocr_extract(file: UploadFile, document_type: str | None = None) -> StandardAIResponse:
    return await extract_document_upload(file, document_type=document_type)


def run_drug_safety_check(payload: DrugSafetyCheckRequest) -> StandardAIResponse:
    return build_drug_safety_response(payload)


def run_no_show_prediction(payload: NoShowRequest) -> StandardAIResponse:
    adapter = get_adapter_registry().xgboost_no_show
    adapter_result = adapter.predict(payload)
    standard = build_standard_ai_response(
        output=adapter_result.output,
        confidence=adapter_result.confidence,
        explanation=adapter_result.explanation,
        risk_level=adapter_result.risk_level,
        requires_doctor_review=False,
        model_name=adapter.model_name,
        model_version=adapter.model_version,
        model_status=adapter_result.model_status,
    )
    record_ai_audit_event(
        audit_id=standard.audit_id,
        endpoint="/ai/no-show-predict",
        patient_id=payload.patient_id,
        payload=payload.model_dump(),
        model_provider=adapter.adapter_name,
        model_name=standard.model_name,
        model_status=standard.model_status,
        risk_level=standard.risk_level,
        requires_doctor_review=standard.requires_doctor_review,
        success=True,
    )
    return standard
