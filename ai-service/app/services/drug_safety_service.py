from __future__ import annotations

import json
from pathlib import Path

from app.core.ai_response_factory import build_standard_ai_response
from app.schemas.drug_safety_schema import DrugSafetyCheckRequest
from app.services.ai_audit_service import record_ai_audit_event

SEVERITY_ORDER = ["none", "low", "medium", "high", "critical"]
DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DRUG_INTERACTIONS = json.loads((DATA_DIR / "drug_interactions.json").read_text(encoding="utf-8"))
DRUG_ALLERGY_MAP = json.loads((DATA_DIR / "drug_allergy_map.json").read_text(encoding="utf-8"))
DRUG_CONTRAINDICATIONS = json.loads((DATA_DIR / "drug_contraindications.json").read_text(encoding="utf-8"))
DUPLICATE_THERAPY_GROUPS = json.loads((DATA_DIR / "duplicate_therapy_groups.json").read_text(encoding="utf-8"))


def _normalize_term(value: str | None) -> str:
    return (value or "").strip().lower()


def _expand_medication_terms(medication: dict) -> set[str]:
    terms = {
        _normalize_term(medication.get("name")),
        _normalize_term(medication.get("generic_name")),
    }
    terms.update(_normalize_term(item) for item in (medication.get("ingredients") or []))
    return {term for term in terms if term}


def _display_name(medication: dict) -> str:
    return medication.get("name") or medication.get("generic_name") or "Unknown medicine"


def _max_severity(values: list[str]) -> str:
    normalized = [value for value in values if value in SEVERITY_ORDER]
    if not normalized:
        return "none"
    return max(normalized, key=lambda item: SEVERITY_ORDER.index(item))


def _contains_condition(patient: dict, condition: str) -> bool:
    normalized = _normalize_term(condition)
    conditions = {_normalize_term(item) for item in patient.get("conditions", [])}

    if normalized in conditions:
        return True
    if normalized == "kidney_disease":
        return bool(patient.get("kidney_disease"))
    if normalized == "liver_disease":
        return bool(patient.get("liver_disease"))
    if normalized == "pregnancy":
        return bool(patient.get("pregnancy_status"))

    return False


def _interaction_alerts(medications: list[dict], existing_medications: list[dict]) -> list[dict]:
    alerts = []
    seen_pairs = set()
    all_sources = [(item, "prescribed") for item in medications] + [(item, "existing") for item in existing_medications]

    for index, source_a in enumerate(all_sources):
        for source_b in all_sources[index + 1 :]:
            med_a, type_a = source_a
            med_b, type_b = source_b
            if type_a == type_b == "existing":
                continue

            terms_a = _expand_medication_terms(med_a)
            terms_b = _expand_medication_terms(med_b)

            for rule in DRUG_INTERACTIONS:
                drug_a = _normalize_term(rule.get("drug_a"))
                drug_b = _normalize_term(rule.get("drug_b"))
                if not drug_a or not drug_b:
                    continue
                if not ((drug_a in terms_a and drug_b in terms_b) or (drug_b in terms_a and drug_a in terms_b)):
                    continue

                pair_key = tuple(sorted([drug_a, drug_b, _display_name(med_a), _display_name(med_b)]))
                if pair_key in seen_pairs:
                    continue
                seen_pairs.add(pair_key)

                alerts.append(
                    {
                        "drug_a": _display_name(med_a),
                        "drug_b": _display_name(med_b),
                        "severity": rule.get("severity", "medium"),
                        "message": rule.get("message", "Potential medication interaction detected."),
                        "source": "local_rules",
                        "recommendation": rule.get("recommendation", "Doctor review required before prescribing together."),
                    }
                )
    return alerts


def _allergy_alerts(patient: dict, medications: list[dict]) -> list[dict]:
    alerts = []
    allergy_terms = {_normalize_term(item) for item in patient.get("allergies", []) if _normalize_term(item)}

    for medication in medications:
        med_terms = _expand_medication_terms(medication)
        for rule in DRUG_ALLERGY_MAP:
            allergy = _normalize_term(rule.get("allergy"))
            drugs = {_normalize_term(item) for item in rule.get("drugs", [])}
            if allergy not in allergy_terms:
                continue
            if not med_terms.intersection(drugs):
                continue

            alerts.append(
                {
                    "medicine": _display_name(medication),
                    "allergy": rule.get("allergy", allergy),
                    "severity": rule.get("severity", "critical"),
                    "message": rule.get("message", "Possible allergy risk."),
                    "source": "local_rules",
                }
            )
    return alerts


def _contraindication_alerts(patient: dict, medications: list[dict]) -> list[dict]:
    alerts = []

    for medication in medications:
        med_terms = _expand_medication_terms(medication)
        for rule in DRUG_CONTRAINDICATIONS:
            condition = rule.get("condition", "")
            if not _contains_condition(patient, condition):
                continue
            drugs = {_normalize_term(item) for item in rule.get("drugs", [])}
            if not med_terms.intersection(drugs):
                continue

            alerts.append(
                {
                    "medicine": _display_name(medication),
                    "condition": condition,
                    "severity": rule.get("severity", "medium"),
                    "message": rule.get("message", "Use caution with this condition."),
                    "source": "local_rules",
                }
            )
    return alerts


def _duplicate_therapy_alerts(medications: list[dict], existing_medications: list[dict]) -> list[dict]:
    alerts = []
    all_medications = medications + existing_medications

    for group in DUPLICATE_THERAPY_GROUPS:
        group_drugs = {_normalize_term(item) for item in group.get("drugs", [])}
        matched = []

        for medication in all_medications:
            if _expand_medication_terms(medication).intersection(group_drugs):
                matched.append(_display_name(medication))

        unique_matches = list(dict.fromkeys(matched))
        if len(unique_matches) < 2:
            continue

        alerts.append(
            {
                "medicines": unique_matches,
                "severity": group.get("severity", "medium"),
                "message": group.get("message", "Possible duplicate therapy."),
            }
        )

    return alerts


def _confidence_for_alerts(total_alerts: int, severity: str) -> float:
    if total_alerts == 0:
        return 0.7
    if severity == "critical":
        return 0.93
    if severity == "high":
        return 0.88
    if severity == "medium":
        return 0.82
    return 0.76


def run_drug_safety_rules(payload: DrugSafetyCheckRequest):
    medications = [item.model_dump() for item in payload.medications]
    existing_medications = [item.model_dump() for item in payload.existing_medications]
    patient = payload.patient.model_dump()

    interactions = _interaction_alerts(medications, existing_medications)
    allergies = _allergy_alerts(patient, medications)
    contraindications = _contraindication_alerts(patient, medications)
    duplicates = _duplicate_therapy_alerts(medications, existing_medications)

    all_severities = [
        *(item.get("severity", "none") for item in interactions),
        *(item.get("severity", "none") for item in allergies),
        *(item.get("severity", "none") for item in contraindications),
        *(item.get("severity", "none") for item in duplicates),
    ]
    severity = _max_severity(all_severities)
    total_alerts = len(interactions) + len(allergies) + len(contraindications) + len(duplicates)
    doctor_override_required = severity in {"medium", "high", "critical"}
    safe_to_continue = severity not in {"high", "critical"}

    summary = (
        "Critical allergy alert found. Doctor must review before finalizing prescription."
        if severity == "critical"
        else "High-severity medication safety alert found. Doctor review is required before finalizing prescription."
        if severity == "high"
        else "Potential safety alert. Doctor review required."
        if severity == "medium"
        else "No major drug safety alert was detected by the local rules engine."
    )

    return {
        "interaction_alerts": interactions,
        "allergy_alerts": allergies,
        "contraindication_alerts": contraindications,
        "duplicate_therapy_alerts": duplicates,
        "severity": severity,
        "doctor_override_required": doctor_override_required,
        "safe_to_continue": safe_to_continue,
        "summary": summary,
        "model_status": "rules_engine",
        "requires_doctor_review": True,
    }, _confidence_for_alerts(total_alerts, severity)


def build_drug_safety_response(payload: DrugSafetyCheckRequest):
    from app.config import get_settings

    settings = get_settings()
    output, confidence = run_drug_safety_rules(payload)
    response = build_standard_ai_response(
        output={
            **output,
            "disclaimer": "This drug safety output is assistive only. It does not guarantee medication safety and must be reviewed by a qualified doctor.",
        },
        confidence=confidence,
        explanation="Drug safety rules were evaluated using local interaction, allergy, contraindication, and duplicate-therapy datasets.",
        risk_level=output["severity"] if output["severity"] in {"low", "medium", "high", "critical"} else "unknown",
        requires_doctor_review=True,
        model_name="local-rules-drug-safety",
        model_version="phase-19-drug-safety-0.1.0",
        model_status="rules_engine",
    )

    record_ai_audit_event(
        audit_id=response.audit_id,
        endpoint="/ai/drug-safety-check",
        patient_id=payload.patient.id,
        payload=payload.model_dump(),
        model_provider=settings.drug_data_provider,
        model_name=response.model_name,
        model_status=response.model_status,
        risk_level=response.risk_level,
        requires_doctor_review=response.requires_doctor_review,
        success=True,
    )

    return response
