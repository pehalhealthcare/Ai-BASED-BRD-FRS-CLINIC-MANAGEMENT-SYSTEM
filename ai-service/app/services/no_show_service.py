from __future__ import annotations

import json
import pickle
import random
from datetime import datetime
from pathlib import Path

from app.core.model_registry import ensure_no_show_model_dir, get_no_show_model_paths, read_no_show_metadata
from app.core.settings import get_settings
from app.evaluation.no_show_eval import calculate_binary_metrics
from app.schemas.no_show_schema import NoShowPredictionRequest, NoShowTrainingRecord, NoShowTrainingRequest

SEVERITY_THRESHOLDS = {
    "low": 0.35,
    "medium": 0.70,
}

FEATURE_NUMERIC_NAMES = [
    "previous_visits",
    "previous_no_shows",
    "previous_cancellations",
    "lead_time_hours",
    "reminder_sent",
    "hour_of_day",
    "is_weekend",
    "is_first_visit",
]

CATEGORICAL_FEATURES = [
    "doctor_id",
    "department",
    "booking_source",
    "payment_status",
    "weekday",
]

REASON_LABELS = {
    "HIGH_PREVIOUS_NO_SHOWS": "Patient has multiple previous no-shows.",
    "MULTIPLE_CANCELLATIONS": "Patient has multiple previous cancellations.",
    "REMINDER_NOT_SENT": "Reminder has not been sent yet.",
    "LONG_LEAD_TIME": "Appointment has a long lead time.",
    "PAYMENT_PENDING": "Payment is pending or unpaid.",
    "FIRST_VISIT_LONG_LEAD": "First visit with a long lead time can increase attendance uncertainty.",
    "GOOD_ATTENDANCE_HISTORY": "Patient has a strong prior attendance history.",
    "SAME_DAY_CONFIRMED": "Same-day appointment with reminder/confirmation tends to lower no-show risk.",
}


def risk_level_from_score(score: float) -> str:
    if score < SEVERITY_THRESHOLDS["low"]:
        return "low"
    if score < SEVERITY_THRESHOLDS["medium"]:
        return "medium"
    return "high"


def recommended_action_from_risk(risk_level: str) -> str:
    if risk_level == "high":
        return "Call patient, confirm attendance, and consider controlled overbooking only if clinic policy allows."
    if risk_level == "medium":
        return "Send reminder and confirm appointment."
    return "Standard reminder is sufficient."


def derive_reason_codes(payload: NoShowPredictionRequest) -> list[str]:
    reason_codes: list[str] = []
    lead_time_hours = payload.resolved_lead_time_hours()
    reminder_sent = payload.resolved_reminder_sent()

    if payload.previous_no_shows >= 2:
        reason_codes.append("HIGH_PREVIOUS_NO_SHOWS")
    if payload.previous_cancellations >= 2:
        reason_codes.append("MULTIPLE_CANCELLATIONS")
    if not reminder_sent:
        reason_codes.append("REMINDER_NOT_SENT")
    if lead_time_hours > 168:
        reason_codes.append("LONG_LEAD_TIME")
    if payload.payment_status.lower() in {"pending", "unpaid"}:
        reason_codes.append("PAYMENT_PENDING")
    if payload.resolved_is_first_visit() and lead_time_hours > 168:
        reason_codes.append("FIRST_VISIT_LONG_LEAD")
    if lead_time_hours <= 24 and reminder_sent:
        reason_codes.append("SAME_DAY_CONFIRMED")
    if payload.previous_visits > 3 and payload.previous_no_shows == 0:
        reason_codes.append("GOOD_ATTENDANCE_HISTORY")

    return reason_codes


def reason_messages(reason_codes: list[str]) -> list[str]:
    return [REASON_LABELS[code] for code in reason_codes if code in REASON_LABELS]


def fallback_risk_score(payload: NoShowPredictionRequest) -> tuple[float, list[str]]:
    score = 0.22
    reason_codes = derive_reason_codes(payload)

    if "HIGH_PREVIOUS_NO_SHOWS" in reason_codes:
        score += 0.38
    elif payload.previous_no_shows == 1:
        score += 0.2

    if "MULTIPLE_CANCELLATIONS" in reason_codes:
        score += 0.16
    elif payload.previous_cancellations == 1:
        score += 0.08

    if "REMINDER_NOT_SENT" in reason_codes:
        score += 0.1
    if "LONG_LEAD_TIME" in reason_codes:
        score += 0.12
    if "PAYMENT_PENDING" in reason_codes:
        score += 0.08
    if "FIRST_VISIT_LONG_LEAD" in reason_codes:
        score += 0.08
    if "GOOD_ATTENDANCE_HISTORY" in reason_codes:
        score -= 0.18
    if "SAME_DAY_CONFIRMED" in reason_codes:
        score -= 0.12

    return max(0.0, min(1.0, round(score, 4))), reason_codes


def fallback_prediction(payload: NoShowPredictionRequest, model_status: str = "fallback") -> dict:
    risk_score, reason_codes = fallback_risk_score(payload)
    risk_level = risk_level_from_score(risk_score)
    confidence = max(0.45, min(0.89, round(0.5 + abs(risk_score - 0.5), 2)))

    return {
        "output": {
            "risk_score": round(risk_score, 4),
            "risk_level": risk_level,
            "reason_codes": reason_codes,
            "recommended_action": recommended_action_from_risk(risk_level),
            "requires_staff_review": True,
            "reasons": reason_messages(reason_codes),
            "factors": reason_messages(reason_codes),
            "recommendations": [recommended_action_from_risk(risk_level)],
            "score": round(risk_score, 4),
        },
        "confidence": confidence,
        "explanation": "Rule-based no-show scoring executed because a trained model is not available.",
        "risk_level": risk_level,
        "model_name": "rule_based_no_show",
        "model_version": "phase-20-fallback-1.0.0",
        "model_status": model_status,
    }


def _categorical_value(record: NoShowPredictionRequest, field_name: str) -> str:
    value = getattr(record, field_name, None)
    if field_name == "weekday":
        return record.resolved_weekday()
    return str(value or "unknown").strip().lower() or "unknown"


def build_preprocessor(records: list[NoShowTrainingRecord]) -> dict:
    category_values: dict[str, list[str]] = {}

    for field_name in CATEGORICAL_FEATURES:
        values = {_categorical_value(record, field_name) for record in records}
        category_values[field_name] = sorted(values) or ["unknown"]

    return {
        "version": "phase-20-no-show-1.0.0",
        "numeric_features": FEATURE_NUMERIC_NAMES,
        "categorical_features": CATEGORICAL_FEATURES,
        "category_values": category_values,
    }


def _numeric_feature_vector(record: NoShowPredictionRequest) -> list[float]:
    weekday = record.resolved_weekday()
    return [
        float(record.previous_visits),
        float(record.previous_no_shows),
        float(record.previous_cancellations),
        float(record.resolved_lead_time_hours()),
        1.0 if record.resolved_reminder_sent() else 0.0,
        float(record.resolved_hour()),
        1.0 if weekday in {"saturday", "sunday"} else 0.0,
        1.0 if record.resolved_is_first_visit() else 0.0,
    ]


def vectorize_records(records: list[NoShowPredictionRequest], preprocessor: dict) -> list[list[float]]:
    vectors: list[list[float]] = []
    category_values = preprocessor["category_values"]

    for record in records:
        vector = _numeric_feature_vector(record)

        for field_name in preprocessor["categorical_features"]:
            value = _categorical_value(record, field_name)
            for category in category_values[field_name]:
                vector.append(1.0 if value == category else 0.0)

        vectors.append(vector)

    return vectors


def _label_for_status(value: str) -> int | None:
    normalized = (value or "").strip().lower()
    if normalized == "attended":
        return 0
    if normalized == "no_show":
        return 1
    return None


def prepare_training_records(request: NoShowTrainingRequest) -> tuple[list[NoShowTrainingRecord], int]:
    usable_records: list[NoShowTrainingRecord] = []
    excluded_cancelled = 0

    for record in request.records:
        if record.status == "cancelled":
            excluded_cancelled += 1
            continue
        usable_records.append(record)

    return usable_records, excluded_cancelled


def _split_records(records: list[NoShowTrainingRecord], test_size: float, random_seed: int) -> tuple[list[NoShowTrainingRecord], list[NoShowTrainingRecord]]:
    shuffled = list(records)
    random.Random(random_seed).shuffle(shuffled)

    if len(shuffled) < 5:
        return shuffled, shuffled

    test_count = max(1, int(len(shuffled) * test_size))
    if test_count >= len(shuffled):
        test_count = len(shuffled) - 1

    return shuffled[:-test_count], shuffled[-test_count:]


def _load_xgboost_classifier():
    try:
        from xgboost import XGBClassifier

        return XGBClassifier
    except Exception:
        return None


def save_training_artifacts(*, model, preprocessor: dict, metadata: dict, metrics: dict) -> dict[str, str]:
    paths = get_no_show_model_paths()
    ensure_no_show_model_dir()

    with paths["model"].open("wb") as handle:
        pickle.dump(model, handle)

    paths["preprocessor"].write_text(json.dumps(preprocessor, indent=2), encoding="utf-8")
    paths["metadata"].write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    paths["metrics"].write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    return {key: str(path) for key, path in paths.items() if key != "model_dir"}


def persist_insufficient_data_metadata(rows_received: int, rows_used: int, rows_excluded_cancelled: int) -> None:
    paths = get_no_show_model_paths()
    ensure_no_show_model_dir()
    metadata = {
        "model_name": "xgboost_no_show",
        "model_version": "untrained",
        "model_status": "insufficient_data",
        "rows_received": rows_received,
        "rows_used_for_training": rows_used,
        "rows_excluded_cancelled": rows_excluded_cancelled,
        "trained_at": datetime.utcnow().isoformat() + "Z",
    }
    paths["metadata"].write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def train_no_show_model(request: NoShowTrainingRequest) -> dict:
    settings = get_settings()
    if not settings.no_show_enable_training:
        return {
            "rows_received": len(request.records),
            "rows_used_for_training": 0,
            "rows_excluded_cancelled": 0,
            "rows_excluded_invalid": 0,
            "model_name": "xgboost_no_show",
            "model_version": "disabled",
            "model_status": "unavailable",
            "metrics": {},
            "saved_files": {},
            "summary": "No-show model training is disabled by configuration.",
        }

    usable_records, excluded_cancelled = prepare_training_records(request)
    rows_received = len(request.records)
    rows_used = len(usable_records)

    labels = [_label_for_status(record.status) for record in usable_records]
    valid_pairs = [(record, label) for record, label in zip(usable_records, labels) if label is not None]
    usable_records = [record for record, _label in valid_pairs]
    labels = [label for _record, label in valid_pairs]
    rows_excluded_invalid = rows_used - len(usable_records)
    rows_used = len(usable_records)

    if rows_used < settings.no_show_min_training_rows or len(set(labels)) < 2:
        persist_insufficient_data_metadata(rows_received, rows_used, excluded_cancelled)
        return {
            "rows_received": rows_received,
            "rows_used_for_training": rows_used,
            "rows_excluded_cancelled": excluded_cancelled,
            "rows_excluded_invalid": rows_excluded_invalid,
            "model_name": "xgboost_no_show",
            "model_version": "untrained",
            "model_status": "insufficient_data",
            "metrics": {},
            "saved_files": {},
            "summary": "Insufficient labelled appointment data to train the no-show model.",
        }

    classifier_class = _load_xgboost_classifier()
    if classifier_class is None:
        return {
            "rows_received": rows_received,
            "rows_used_for_training": rows_used,
            "rows_excluded_cancelled": excluded_cancelled,
            "rows_excluded_invalid": rows_excluded_invalid,
            "model_name": "xgboost_no_show",
            "model_version": "unavailable",
            "model_status": "unavailable",
            "metrics": {},
            "saved_files": {},
            "summary": "xgboost is not installed, so no-show training is unavailable in this environment.",
        }

    preprocessor = build_preprocessor(usable_records)
    train_records, test_records = _split_records(usable_records, request.test_size, request.random_seed)
    train_labels = [_label_for_status(record.status) for record in train_records]
    test_labels = [_label_for_status(record.status) for record in test_records]

    x_train = vectorize_records(train_records, preprocessor)
    x_test = vectorize_records(test_records, preprocessor)

    model = classifier_class(
        n_estimators=60,
        max_depth=4,
        learning_rate=0.1,
        subsample=1.0,
        colsample_bytree=1.0,
        eval_metric="logloss",
        random_state=request.random_seed,
        use_label_encoder=False,
    )
    model.fit(x_train, train_labels)
    y_scores = [float(probability[1]) for probability in model.predict_proba(x_test)]
    metrics = calculate_binary_metrics(test_labels, y_scores)

    model_version = f"phase-20-xgb-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    metadata = {
        "model_name": "xgboost_no_show",
        "model_version": model_version,
        "model_status": "available",
        "rows_received": rows_received,
        "rows_used_for_training": rows_used,
        "rows_excluded_cancelled": excluded_cancelled,
        "rows_excluded_invalid": rows_excluded_invalid,
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "preprocessor_version": preprocessor["version"],
    }
    saved_files = save_training_artifacts(model=model, preprocessor=preprocessor, metadata=metadata, metrics=metrics)

    return {
        "rows_received": rows_received,
        "rows_used_for_training": rows_used,
        "rows_excluded_cancelled": excluded_cancelled,
        "rows_excluded_invalid": rows_excluded_invalid,
        "model_name": "xgboost_no_show",
        "model_version": model_version,
        "model_status": "available",
        "metrics": metrics,
        "saved_files": saved_files,
        "summary": "No-show model trained successfully.",
    }


def load_trained_model() -> tuple[object | None, dict | None, dict]:
    paths = get_no_show_model_paths()
    metadata = read_no_show_metadata()

    if not paths["model"].exists() or not paths["preprocessor"].exists():
        return None, None, metadata

    try:
        with paths["model"].open("rb") as handle:
            model = pickle.load(handle)
        preprocessor = json.loads(paths["preprocessor"].read_text(encoding="utf-8"))
        return model, preprocessor, metadata
    except Exception:
        return None, None, metadata
