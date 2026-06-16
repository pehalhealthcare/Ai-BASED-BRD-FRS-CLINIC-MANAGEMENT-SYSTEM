from __future__ import annotations

from datetime import date

from app.core.ai_response_factory import build_standard_ai_response
from app.rules.lab_reference_ranges import LabReferenceRangeRepository, normalize_unit
from app.schemas.lab_analysis_schema import (
    LabAbnormalValue,
    LabAnalysisOutput,
    LabAnalysisRequest,
    LabCriticalValue,
    LabManualReviewItem,
    LabNormalRange,
    LabTrendSummary,
)
from app.services.ai_audit_service import record_ai_audit_event

AI_LAB_DISCLAIMER = "AI lab analysis is assistive only and must be reviewed by a doctor."


def _round_number(value: float) -> float:
    return round(value, 2)


def _non_critical_severity(value: float, boundary: float | None) -> str:
    if boundary in {None, 0}:
        return "medium"

    deviation_ratio = abs(value - boundary) / abs(boundary)
    if deviation_ratio >= 0.25:
        return "high"
    return "medium"


def _evaluate_trend(current_value: float, previous_value: float) -> tuple[float, float, str]:
    change = _round_number(current_value - previous_value)

    if previous_value == 0:
        change_percent = 0.0
    else:
        change_percent = _round_number((change / previous_value) * 100)

    if -5 <= change_percent <= 5:
        trend = "stable"
    elif change > 0:
        trend = "increasing"
    else:
        trend = "decreasing"

    return change, change_percent, trend


def _derive_overall_risk(
    abnormal_values: list[LabAbnormalValue],
    critical_values: list[LabCriticalValue],
    manual_review_items: list[LabManualReviewItem],
) -> str:
    if critical_values:
        return "critical"
    if any(item.severity == "high" for item in abnormal_values):
        return "high"
    if abnormal_values:
        return "medium"
    if manual_review_items:
        return "unknown"
    return "low"


def _find_previous_result(
    *,
    current_test_name: str,
    current_unit: str,
    previous_results,
    repository: LabReferenceRangeRepository,
) -> tuple[object | None, str | None]:
    resolved_candidates = []
    for item in previous_results:
        canonical_name = repository.resolve_canonical_name(item.test_name) or item.test_name
        resolved_candidates.append((canonical_name, item))

    for canonical_name, item in sorted(resolved_candidates, key=lambda entry: entry[1].report_date, reverse=True):
        if canonical_name != current_test_name:
            continue

        if normalize_unit(item.unit) != normalize_unit(current_unit):
            return None, "previous_unit_mismatch"

        return item, None

    return None, None


def analyze_lab_results(payload: LabAnalysisRequest) -> object:
    repository = LabReferenceRangeRepository()
    report_date = payload.report_date or date.today()

    if not repository.has_reference_data():
        output = LabAnalysisOutput(
            overall_risk_level="unknown",
            rule_status="unavailable",
            trend_status="no_previous_data",
            notes=[
                "Lab reference data unavailable.",
                AI_LAB_DISCLAIMER,
            ],
        )
        return build_standard_ai_response(
            output=output.model_dump(),
            confidence=0.0,
            explanation="Lab analysis could not be completed because local reference data is unavailable.",
            risk_level="unknown",
            requires_doctor_review=True,
            requires_human_review=True,
            model_name="lab_rule_engine",
            model_version="1.0.0",
            model_status="unavailable",
        )

    abnormal_values: list[LabAbnormalValue] = []
    critical_values: list[LabCriticalValue] = []
    manual_review_items: list[LabManualReviewItem] = []
    trend_summary: list[LabTrendSummary] = []
    notes = [AI_LAB_DISCLAIMER]
    has_missing_reference = False
    trend_notes: set[str] = set()

    for result in payload.test_results:
        reference = repository.resolve_reference(
            test_name=result.test_name,
            age=payload.age,
            gender=payload.gender,
        )

        if not reference:
            has_missing_reference = True
            manual_review_items.append(
                LabManualReviewItem(
                    test_name=result.test_name,
                    value=result.value,
                    unit=result.unit,
                    reason="missing_reference_range",
                    message=f"{result.test_name} could not be evaluated because no matching local reference range was found.",
                )
            )
            continue

        if normalize_unit(result.unit) != normalize_unit(reference.unit):
            manual_review_items.append(
                LabManualReviewItem(
                    test_name=reference.canonical_name,
                    value=result.value,
                    unit=result.unit,
                    reason="unit_mismatch",
                    message=f"{reference.canonical_name} unit does not match the configured reference unit {reference.unit}. Manual review is required.",
                )
            )
            notes.append(f"TODO: Unit conversion is not implemented yet for {reference.canonical_name}.")
            continue

        normal_range = LabNormalRange(
            min=reference.normal_min,
            max=reference.normal_max,
            unit=reference.unit,
        )

        if reference.critical_low is not None and result.value <= reference.critical_low:
            abnormal_values.append(
                LabAbnormalValue(
                    test_name=reference.canonical_name,
                    value=result.value,
                    unit=result.unit,
                    status="low",
                    normal_range=normal_range,
                    severity="critical",
                    message=f"{reference.canonical_name} is below the configured critical threshold and requires doctor review.",
                )
            )
            critical_values.append(
                LabCriticalValue(
                    test_name=reference.canonical_name,
                    value=result.value,
                    unit=result.unit,
                    critical_rule="below_critical_threshold",
                    severity="critical",
                    message=f"{reference.canonical_name} is below the configured critical threshold and requires doctor review.",
                )
            )
        elif reference.critical_high is not None and result.value >= reference.critical_high:
            abnormal_values.append(
                LabAbnormalValue(
                    test_name=reference.canonical_name,
                    value=result.value,
                    unit=result.unit,
                    status="high",
                    normal_range=normal_range,
                    severity="critical",
                    message=f"{reference.canonical_name} is above the configured critical threshold and requires doctor review.",
                )
            )
            critical_values.append(
                LabCriticalValue(
                    test_name=reference.canonical_name,
                    value=result.value,
                    unit=result.unit,
                    critical_rule="above_critical_threshold",
                    severity="critical",
                    message=f"{reference.canonical_name} is above the configured critical threshold and requires doctor review.",
                )
            )
        elif reference.normal_min is not None and result.value < reference.normal_min:
            abnormal_values.append(
                LabAbnormalValue(
                    test_name=reference.canonical_name,
                    value=result.value,
                    unit=result.unit,
                    status="low",
                    normal_range=normal_range,
                    severity=_non_critical_severity(result.value, reference.normal_min),
                    message=f"{reference.canonical_name} is below the expected reference range.",
                )
            )
        elif reference.normal_max is not None and result.value > reference.normal_max:
            abnormal_values.append(
                LabAbnormalValue(
                    test_name=reference.canonical_name,
                    value=result.value,
                    unit=result.unit,
                    status="high",
                    normal_range=normal_range,
                    severity=_non_critical_severity(result.value, reference.normal_max),
                    message=f"{reference.canonical_name} is above the expected reference range.",
                )
            )

        previous_result, previous_warning = _find_previous_result(
            current_test_name=reference.canonical_name,
            current_unit=result.unit,
            previous_results=payload.previous_results,
            repository=repository,
        )
        if previous_warning == "previous_unit_mismatch":
            trend_notes.add(f"{reference.canonical_name} trend could not be compared because the previous unit did not match.")
            continue
        if not previous_result:
            continue

        change, change_percent, trend = _evaluate_trend(result.value, previous_result.value)
        trend_summary.append(
            LabTrendSummary(
                test_name=reference.canonical_name,
                current_value=result.value,
                previous_value=previous_result.value,
                change=change,
                change_percent=change_percent,
                trend=trend,
                message=f"{reference.canonical_name} {trend} compared with the previous report.",
            )
        )

    notes.extend(sorted(trend_notes))
    overall_risk_level = _derive_overall_risk(abnormal_values, critical_values, manual_review_items)
    rule_status = "insufficient_reference_data" if has_missing_reference else "available"
    trend_status = "compared" if trend_summary else "no_previous_data"

    comparable_tests = len(payload.test_results) - len(manual_review_items)
    confidence = 0.85 if comparable_tests > 0 else 0.35
    if has_missing_reference:
        confidence = min(confidence, 0.6)

    output = LabAnalysisOutput(
        abnormal_values=abnormal_values,
        critical_values=critical_values,
        trend_summary=trend_summary,
        manual_review_items=manual_review_items,
        overall_risk_level=overall_risk_level,
        doctor_review_required=True,
        rule_status=rule_status,
        trend_status=trend_status,
        notes=notes,
    )

    response = build_standard_ai_response(
        output=output.model_dump(),
        confidence=confidence,
        explanation="Lab values were evaluated using configured normal and critical reference ranges.",
        risk_level=overall_risk_level,
        requires_doctor_review=True,
        requires_human_review=True,
        model_name="lab_rule_engine",
        model_version="1.0.0",
        model_status=rule_status,
    )

    record_ai_audit_event(
        audit_id=response.audit_id,
        endpoint="/ai/lab-analysis",
        patient_id=payload.patient_id,
        payload={
            **payload.model_dump(mode="json"),
            "report_date": report_date.isoformat(),
        },
        model_provider="rules_engine",
        model_name=response.model_name,
        model_status=response.model_status,
        risk_level=response.risk_level,
        requires_doctor_review=response.requires_doctor_review,
        success=True,
    )

    return response
