from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path
from uuid import uuid4

from app.core.ai_response_factory import build_standard_ai_response
from app.evaluation.adapter_registry import get_adapter_registry
from app.schemas.billing_anomaly_schema import (
    BillingAnomalyRequest,
    BillingAnomalyTrainingRequest,
    BillingAnomalyTrainingResponse,
    TriggeredRule,
)
from app.services.ai_audit_service import record_ai_audit_event

SEVERITY_WEIGHTS = {
    "low": 0.15,
    "medium": 0.35,
    "high": 0.6,
    "critical": 0.9,
}


def _round(value: float | None) -> float | None:
    if value is None:
        return None
    return round(float(value), 2)


def _normalized_payment_status(value: str | None) -> str:
    return (value or "").strip().lower()


def _normalized_invoice_status(value: str | None) -> str:
    return (value or "").strip().lower()


def _is_paid_status(value: str | None) -> bool:
    return _normalized_payment_status(value) in {"success", "paid", "completed"}


def _has_pharmacy_items(payload: BillingAnomalyRequest) -> bool:
    return any(item.item_type == "pharmacy" for item in payload.items)


def _has_lab_items(payload: BillingAnomalyRequest) -> bool:
    return any(item.item_type == "lab" for item in payload.items)


def _approx_equal(left: float, right: float, tolerance: float = 1.0) -> bool:
    return abs(float(left) - float(right)) <= tolerance


def _expected_total(payload: BillingAnomalyRequest) -> float:
    subtotal = float(payload.subtotal or 0)
    discount = float(payload.discount_amount or 0)
    tax = float(payload.tax_amount or 0)
    return round(subtotal - discount + tax, 2)


def _discount_percent(payload: BillingAnomalyRequest) -> float:
    if payload.discount_percent is not None:
        return float(payload.discount_percent)

    subtotal = float(payload.subtotal or 0)
    discount_amount = float(payload.discount_amount or 0)
    if subtotal <= 0:
        return 0.0
    return round((discount_amount / subtotal) * 100, 2)


def _add_rule(
    rules: list[TriggeredRule],
    *,
    code: str,
    severity: str,
    message: str,
    evidence: dict,
) -> None:
    rules.append(
        TriggeredRule(
            code=code,
            severity=severity,
            message=message,
            evidence=evidence,
        )
    )


def evaluate_billing_rules(payload: BillingAnomalyRequest) -> list[TriggeredRule]:
    rules: list[TriggeredRule] = []
    history = payload.historical_context
    discount_percent = _discount_percent(payload)
    total_amount = float(payload.total_amount or 0)
    discount_amount = float(payload.discount_amount or 0)
    refund_amount = float(payload.refund_amount or 0)
    expected_total = _expected_total(payload)
    item_counter = Counter((item.item_type, item.name.strip().lower()) for item in payload.items)
    repeated_items = [
        {"item_type": item_type, "name": name, "count": count}
        for (item_type, name), count in item_counter.items()
        if count >= 2
    ]

    if history.duplicate_invoice_count > 0:
        _add_rule(
            rules,
            code="DUPLICATE_INVOICE",
            severity="high",
            message="Possible duplicate invoice activity was found for this billing pattern.",
            evidence={"duplicate_invoice_count": history.duplicate_invoice_count},
        )

    if discount_percent >= 30 or (total_amount > 0 and discount_amount >= total_amount * 0.3):
        _add_rule(
            rules,
            code="UNUSUAL_DISCOUNT",
            severity="high" if discount_percent >= 50 else "medium",
            message="Discounts on this invoice are higher than expected and should be reviewed.",
            evidence={
                "discount_percent": _round(discount_percent),
                "discount_amount": _round(discount_amount),
                "average_discount_percent_30d": _round(history.average_discount_percent_30d),
            },
        )

    if discount_amount > 0 and float(int(discount_amount)) == discount_amount and discount_amount % 100 == 0:
        _add_rule(
            rules,
            code="ROUND_DISCOUNT_PATTERN",
            severity="low",
            message="A suspicious round-number discount pattern was detected.",
            evidence={"discount_amount": _round(discount_amount)},
        )

    if refund_amount > 0 and history.patient_refund_count_30d >= 3:
        _add_rule(
            rules,
            code="REFUND_ABUSE",
            severity="high",
            message="The patient has repeated refunds in the last 30 days and the current invoice includes a refund.",
            evidence={
                "refund_amount": _round(refund_amount),
                "patient_refund_count_30d": history.patient_refund_count_30d,
            },
        )

    price_override_items = []
    for item in payload.items:
        if item.expected_unit_price is None:
            continue
        expected = float(item.expected_unit_price)
        if expected <= 0:
            continue
        delta_percent = abs(float(item.unit_price) - expected) / expected
        if delta_percent >= 0.15:
            price_override_items.append(
                {
                    "name": item.name,
                    "unit_price": _round(item.unit_price),
                    "expected_unit_price": _round(expected),
                    "variance_percent": _round(delta_percent * 100),
                }
            )

    if payload.manual_price_override or price_override_items:
        _add_rule(
            rules,
            code="MANUAL_PRICE_OVERRIDE",
            severity="high",
            message="Manual price override indicators were found on this invoice.",
            evidence={
                "manual_price_override": bool(payload.manual_price_override),
                "items": price_override_items,
            },
        )

    if history.patient_invoice_count_today >= 3:
        _add_rule(
            rules,
            code="REPEATED_PATIENT_BILLING",
            severity="medium",
            message="The same patient has been billed repeatedly on the same day.",
            evidence={"patient_invoice_count_today": history.patient_invoice_count_today},
        )

    if _has_pharmacy_items(payload) and payload.medicine_stock_deducted is False:
        _add_rule(
            rules,
            code="MEDICINE_WITHOUT_STOCK_DEDUCTION",
            severity="critical",
            message="A pharmacy charge appears without a confirmed stock deduction.",
            evidence={"medicine_stock_deducted": payload.medicine_stock_deducted},
        )

    if _has_lab_items(payload) and payload.lab_order_exists is False and not payload.linked_lab_order_id:
        _add_rule(
            rules,
            code="LAB_BILL_WITHOUT_LAB_ORDER",
            severity="high",
            message="A lab charge appears without a linked lab order.",
            evidence={
                "lab_order_exists": payload.lab_order_exists,
                "linked_lab_order_id": payload.linked_lab_order_id,
            },
        )

    if _normalized_invoice_status(payload.invoice_status) == "cancelled" and _is_paid_status(payload.payment_status):
        _add_rule(
            rules,
            code="CANCELLED_AFTER_PAYMENT",
            severity="critical",
            message="The invoice is cancelled even though payment was marked successful.",
            evidence={
                "invoice_status": payload.invoice_status,
                "payment_status": payload.payment_status,
            },
        )

    if not _approx_equal(expected_total, total_amount):
        _add_rule(
            rules,
            code="AMOUNT_MISMATCH",
            severity="high",
            message="Invoice amounts do not reconcile with subtotal, discount, and tax values.",
            evidence={
                "expected_total": _round(expected_total),
                "reported_total_amount": _round(total_amount),
            },
        )

    if total_amount <= 0:
        _add_rule(
            rules,
            code="INVALID_AMOUNT",
            severity="critical",
            message="The invoice total amount is zero or negative.",
            evidence={"total_amount": _round(total_amount)},
        )

    if _is_paid_status(payload.payment_status) and _normalized_invoice_status(payload.invoice_status) in {"unpaid", "pending"}:
        _add_rule(
            rules,
            code="PAYMENT_STATUS_MISMATCH",
            severity="high",
            message="Payment is marked successful while the invoice status still appears unpaid or pending.",
            evidence={
                "invoice_status": payload.invoice_status,
                "payment_status": payload.payment_status,
            },
        )

    high_value_threshold = max(float(history.average_invoice_amount_30d or 0) * 2, 5000.0)
    has_link = bool(payload.linked_consultation_id or payload.linked_lab_order_id or payload.linked_pharmacy_sale_id)
    if total_amount >= high_value_threshold and not has_link:
        _add_rule(
            rules,
            code="HIGH_VALUE_WITHOUT_LINK",
            severity="high" if total_amount >= high_value_threshold * 1.5 else "medium",
            message="A high-value invoice does not appear linked to consultation, lab, or pharmacy context.",
            evidence={
                "total_amount": _round(total_amount),
                "average_invoice_amount_30d": _round(history.average_invoice_amount_30d),
            },
        )

    if history.user_cancelled_invoice_count_today >= 3:
        _add_rule(
            rules,
            code="MULTIPLE_CANCELLED_INVOICES_BY_USER",
            severity="medium",
            message="The same user has cancelled multiple invoices today.",
            evidence={"user_cancelled_invoice_count_today": history.user_cancelled_invoice_count_today},
        )

    if history.same_service_count_today >= 2 or repeated_items:
        _add_rule(
            rules,
            code="DUPLICATE_SERVICE_CHARGE",
            severity="medium",
            message="The same service appears charged multiple times unexpectedly.",
            evidence={
                "same_service_count_today": history.same_service_count_today,
                "repeated_items": repeated_items,
            },
        )

    return rules


def calculate_rule_score(triggered_rules: list[TriggeredRule]) -> float:
    if not triggered_rules:
        return 0.05

    cumulative = 0.0
    for rule in triggered_rules:
        cumulative += SEVERITY_WEIGHTS.get(rule.severity, 0.1)

    return min(1.0, round(cumulative / max(len(triggered_rules), 1) + min(0.25, len(triggered_rules) * 0.05), 2))


def calculate_risk_level(triggered_rules: list[TriggeredRule], anomaly_score: float) -> str:
    if any(rule.severity == "critical" for rule in triggered_rules) or anomaly_score >= 0.85:
        return "critical"
    if anomaly_score >= 0.65 or sum(rule.severity in {"high", "medium"} for rule in triggered_rules) >= 2:
        return "high"
    if anomaly_score >= 0.35 or any(rule.severity == "medium" for rule in triggered_rules):
        return "medium"
    return "low"


def analyze_billing_anomaly(payload: BillingAnomalyRequest):
    adapter = get_adapter_registry().billing_anomaly
    triggered_rules = evaluate_billing_rules(payload)
    rule_score = calculate_rule_score(triggered_rules)
    model_score = adapter.score(payload)

    combined_score = rule_score
    if model_score.anomaly_score is not None and model_score.model_status == "available":
        combined_score = round((rule_score * 0.65) + (model_score.anomaly_score * 0.35), 2)

    risk_level = calculate_risk_level(triggered_rules, combined_score)
    explanations = [
        "Billing anomaly review used explainable rule-based audit checks first.",
        model_score.explanation,
        "This output is an admin review signal only and not a final fraud determination.",
    ]

    response = build_standard_ai_response(
        output={
            "anomaly_score": combined_score,
            "triggered_rules": [rule.model_dump() for rule in triggered_rules],
        },
        confidence=0.82 if model_score.model_status == "available" else 0.58,
        explanation=" ".join(part for part in explanations if part),
        risk_level=risk_level,
        requires_doctor_review=False,
        requires_admin_review=True,
        requires_human_review=True,
        model_name=model_score.model_name,
        model_version=adapter.model_version,
        model_status=model_score.model_status,
    )

    record_ai_audit_event(
        audit_id=response.audit_id,
        endpoint="/ai/billing-anomaly",
        patient_id=payload.patient_id,
        payload=payload.model_dump(mode="json"),
        model_provider=adapter.provider or "fallback",
        model_name=response.model_name,
        model_status=response.model_status,
        risk_level=response.risk_level,
        requires_doctor_review=response.requires_doctor_review,
        success=True,
    )

    return response


def train_billing_anomaly_model(payload: BillingAnomalyTrainingRequest) -> BillingAnomalyTrainingResponse:
    adapter = get_adapter_registry().billing_anomaly
    result = adapter.train(payload.records, save_model=payload.save_model)
    response = BillingAnomalyTrainingResponse(**result)

    record_ai_audit_event(
        audit_id=str(uuid4()),
        endpoint="/ai/train/billing-anomaly",
        patient_id=None,
        payload={"record_count": len(payload.records), "save_model": payload.save_model},
        model_provider=adapter.provider or "fallback",
        model_name=response.model_name,
        model_status=response.model_status,
        risk_level="low",
        requires_doctor_review=False,
        success=True,
    )

    return response


def evaluate_billing_predictions(file_path: str) -> dict:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {file_path}")

    if path.suffix.lower() == ".json":
        records = json.loads(path.read_text(encoding="utf-8"))
    else:
        with path.open("r", encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            records = list(reader)

    cases = []
    for record in records:
        normalized = record.copy()
        if "items" in normalized and isinstance(normalized["items"], str):
            normalized["items"] = json.loads(normalized["items"])
        cases.append(BillingAnomalyRequest.model_validate(normalized))

    outputs = [analyze_billing_anomaly(case) for case in cases]
    flagged = [item for item in outputs if item.risk_level in {"medium", "high", "critical"}]
    labels_present = any(
        isinstance(record, dict) and ("label" in record or "is_anomaly" in record)
        for record in records
    )
    trigger_distribution = Counter()
    for output in outputs:
        for rule in output.output.get("triggered_rules", []):
            trigger_distribution[rule["code"]] += 1

    summary = {
        "total_cases": len(outputs),
        "flagged_count": len(flagged),
        "normal_count": max(len(outputs) - len(flagged), 0),
        "average_anomaly_score": _round(
            sum(item.output.get("anomaly_score", 0) for item in outputs) / max(len(outputs), 1)
        ),
        "rule_trigger_distribution": dict(trigger_distribution),
    }

    if not labels_present:
        return summary

    true_positive = 0
    false_positive = 0
    false_negative = 0
    for raw_record, output in zip(records, outputs):
        label = str(raw_record.get("label") or raw_record.get("is_anomaly") or "").strip().lower()
        is_positive = label in {"1", "true", "anomaly", "fraud", "yes"}
        predicted_positive = output.risk_level in {"medium", "high", "critical"}
        if predicted_positive and is_positive:
            true_positive += 1
        elif predicted_positive and not is_positive:
            false_positive += 1
        elif not predicted_positive and is_positive:
            false_negative += 1

    precision = true_positive / max(true_positive + false_positive, 1)
    recall = true_positive / max(true_positive + false_negative, 1)

    summary.update(
        {
            "precision": _round(precision),
            "recall": _round(recall),
            "false_positive_count": false_positive,
        }
    )
    return summary
