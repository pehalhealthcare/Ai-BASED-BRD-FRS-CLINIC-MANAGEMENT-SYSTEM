from app.adapters.base import BaseModelAdapter
from app.models.adapter_result import AdapterResult
from app.schemas.no_show_schema import NoShowPredictionRequest
from app.services.no_show_service import (
    fallback_prediction,
    load_trained_model,
    reason_messages,
    derive_reason_codes,
    recommended_action_from_risk,
    risk_level_from_score,
    vectorize_records,
)


class XGBoostNoShowAdapter(BaseModelAdapter):
    adapter_name = "xgboost_no_show"
    model_name = "xgboost_no_show"
    model_version = "untrained"

    def __init__(self, *, enable_placeholder: bool, enable_fallbacks: bool):
        self.enable_placeholder = enable_placeholder
        self.enable_fallbacks = enable_fallbacks

    @property
    def is_available(self) -> bool:
        model, preprocessor, metadata = load_trained_model()
        if model and preprocessor:
            self.model_version = metadata.get("model_version", self.model_version)
            return True
        return self.enable_fallbacks or bool(metadata)

    def predict(self, payload: NoShowPredictionRequest) -> AdapterResult:
        model, preprocessor, metadata = load_trained_model()

        if model and preprocessor:
            vector = vectorize_records([payload], preprocessor)
            probability = float(model.predict_proba(vector)[0][1])
            risk_level = risk_level_from_score(probability)
            reason_codes = derive_reason_codes(payload)
            confidence = max(0.5, min(0.99, round(0.5 + abs(probability - 0.5), 2)))
            self.model_version = metadata.get("model_version", self.model_version)

            return AdapterResult(
                output={
                    "risk_score": round(probability, 4),
                    "risk_level": risk_level,
                    "reason_codes": reason_codes,
                    "recommended_action": recommended_action_from_risk(risk_level),
                    "requires_staff_review": True,
                    "reasons": reason_messages(reason_codes),
                    "factors": reason_messages(reason_codes),
                    "recommendations": [recommended_action_from_risk(risk_level)],
                    "score": round(probability, 4),
                },
                confidence=confidence,
                explanation="XGBoost no-show model prediction generated successfully.",
                risk_level=risk_level,
                model_status="available",
            )

        if not self.enable_fallbacks:
            model_status = metadata.get("model_status", "unavailable") if metadata else "unavailable"
            return AdapterResult(
                output={
                    "risk_score": 0.0,
                    "risk_level": "low",
                    "reason_codes": [],
                    "recommended_action": "Clinic staff should review appointment history manually.",
                    "requires_staff_review": True,
                    "reasons": ["No trained no-show model is currently available."],
                    "factors": ["No trained no-show model is currently available."],
                    "recommendations": ["Clinic staff should review appointment history manually."],
                    "score": 0.0,
                },
                confidence=0.0,
                explanation="No-show model is unavailable and fallbacks are disabled.",
                risk_level="unknown",
                model_status=model_status,
            )

        fallback = fallback_prediction(payload, metadata.get("model_status", "fallback") if metadata else "fallback")
        self.model_name = fallback["model_name"]
        self.model_version = metadata.get("model_version", fallback["model_version"]) if metadata else fallback["model_version"]

        return AdapterResult(
            output=fallback["output"],
            confidence=fallback["confidence"],
            explanation=fallback["explanation"],
            risk_level=fallback["risk_level"],
            model_status=fallback["model_status"],
        )
