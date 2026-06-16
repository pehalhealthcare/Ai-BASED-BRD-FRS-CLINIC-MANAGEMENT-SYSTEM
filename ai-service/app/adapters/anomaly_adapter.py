from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.adapters.base import BaseModelAdapter
from app.schemas.billing_anomaly_schema import BillingAnomalyRequest

FEATURE_NAMES = [
    "total_amount",
    "discount_percent",
    "discount_amount",
    "tax_amount",
    "paid_amount",
    "refund_amount",
    "item_count",
    "patient_invoice_count_today",
    "user_cancelled_invoice_count_today",
    "patient_refund_count_30d",
    "duplicate_invoice_count",
    "average_invoice_amount_30d",
    "average_discount_percent_30d",
    "manual_price_override",
    "medicine_stock_deducted",
    "lab_order_exists",
]


@dataclass(frozen=True)
class BillingModelScore:
    anomaly_score: float | None
    model_status: str
    explanation: str
    model_name: str


class BillingAnomalyAdapter(BaseModelAdapter):
    adapter_name = "billing_anomaly"
    model_name = "billing_isolation_forest"
    model_version = "v1"

    def __init__(
        self,
        *,
        provider: str,
        enable_fallbacks: bool,
        model_dir: str = "app/models",
        min_training_records: int = 300,
    ):
        self.provider = (provider or "rule_based").strip().lower()
        self.enable_fallbacks = enable_fallbacks
        self.model_dir = Path(model_dir)
        self.min_training_records = max(int(min_training_records or 300), 1)
        self.model_path = self.model_dir / "billing_isolation_forest.joblib"

    @property
    def is_available(self) -> bool:
        return True

    def _optional_imports(self):
        try:
            import joblib
            from sklearn.ensemble import IsolationForest
        except Exception:
            return None, None

        return joblib, IsolationForest

    def _load_bundle(self):
        joblib, _ = self._optional_imports()
        if joblib is None:
            return None

        if not self.model_path.exists():
            return None

        try:
            return joblib.load(self.model_path)
        except Exception:
            return None

    def extract_features(self, payload: BillingAnomalyRequest | dict) -> list[float]:
        if isinstance(payload, BillingAnomalyRequest):
            request = payload
        else:
            request = BillingAnomalyRequest.model_validate(payload)

        item_count = len(request.items)
        history = request.historical_context

        return [
            float(request.total_amount or 0),
            float(request.discount_percent or 0),
            float(request.discount_amount or 0),
            float(request.tax_amount or 0),
            float(request.paid_amount or 0),
            float(request.refund_amount or 0),
            float(item_count),
            float(history.patient_invoice_count_today or 0),
            float(history.user_cancelled_invoice_count_today or 0),
            float(history.patient_refund_count_30d or 0),
            float(history.duplicate_invoice_count or 0),
            float(history.average_invoice_amount_30d or 0),
            float(history.average_discount_percent_30d or 0),
            1.0 if request.manual_price_override else 0.0,
            1.0 if request.medicine_stock_deducted is not False else 0.0,
            1.0 if request.lab_order_exists is not False else 0.0,
        ]

    def score(self, payload: BillingAnomalyRequest) -> BillingModelScore:
        bundle = self._load_bundle()
        if bundle is None:
            return BillingModelScore(
                anomaly_score=None,
                model_status="fallback" if self.enable_fallbacks else "unavailable",
                explanation="Billing anomaly model file or dependencies were unavailable, so rule-based fallback scoring was used.",
                model_name=self.model_name,
            )

        model = bundle.get("model")
        feature_names = bundle.get("feature_names", FEATURE_NAMES)
        features = self.extract_features(payload)

        if len(features) != len(feature_names):
            return BillingModelScore(
                anomaly_score=None,
                model_status="insufficient_data",
                explanation="Billing anomaly model features did not match the configured feature set.",
                model_name=self.model_name,
            )

        try:
            raw_value = float(-model.decision_function([features])[0])
            anomaly_score = round(1.0 / (1.0 + math.exp(-raw_value * 4.0)), 2)
        except Exception:
            return BillingModelScore(
                anomaly_score=None,
                model_status="fallback" if self.enable_fallbacks else "unavailable",
                explanation="Billing anomaly model scoring failed, so rule-based fallback scoring was used.",
                model_name=self.model_name,
            )

        return BillingModelScore(
            anomaly_score=anomaly_score,
            model_status="available",
            explanation="IsolationForest scored the billing record using numeric invoice and historical context features.",
            model_name=self.model_name,
        )

    def train(self, records: list[BillingAnomalyRequest], save_model: bool = True) -> dict:
        if len(records) < self.min_training_records:
            return {
                "records_used": len(records),
                "feature_count": len(FEATURE_NAMES),
                "model_name": self.model_name,
                "model_version": self.model_version,
                "saved_path": None,
                "model_status": "insufficient_data",
                "message": f"At least {self.min_training_records} billing records are required to train the anomaly model safely.",
            }

        joblib, IsolationForest = self._optional_imports()
        if joblib is None or IsolationForest is None:
            return {
                "records_used": len(records),
                "feature_count": len(FEATURE_NAMES),
                "model_name": self.model_name,
                "model_version": self.model_version,
                "saved_path": None,
                "model_status": "unavailable",
                "message": "IsolationForest dependencies are unavailable, so the anomaly model could not be trained.",
            }

        features = [self.extract_features(record) for record in records]
        model = IsolationForest(random_state=42, contamination="auto")
        model.fit(features)

        saved_path = None
        if save_model:
            self.model_dir.mkdir(parents=True, exist_ok=True)
            joblib.dump(
                {
                    "model": model,
                    "feature_names": FEATURE_NAMES,
                    "trained_at": datetime.now(timezone.utc).isoformat(),
                },
                self.model_path,
            )
            saved_path = str(self.model_path)

        return {
            "records_used": len(records),
            "feature_count": len(FEATURE_NAMES),
            "model_name": self.model_name,
            "model_version": self.model_version,
            "saved_path": saved_path,
            "model_status": "available",
            "message": "Billing anomaly model training completed successfully.",
        }
