from app.adapters.base import BaseModelAdapter
from app.models.adapter_result import AdapterResult


class DrugSafetyAdapter(BaseModelAdapter):
    adapter_name = "drug_safety"
    model_version = "foundation-0.1.0"

    def __init__(self, *, provider: str, enable_fallbacks: bool):
        self.provider = (provider or "rule_based").strip().lower()
        self.enable_fallbacks = enable_fallbacks
        self.model_name = f"{self.provider}-drug-safety"

    def check(self, *, medicines: list[dict], allergies: list[str]) -> AdapterResult:
        alerts: list[str] = []
        allergy_terms = {item.strip().lower() for item in allergies if item and item.strip()}
        medicine_names = [str(item.get("name") or item.get("medicine") or "").strip() for item in medicines]
        normalized_names = [name.lower() for name in medicine_names if name]

        duplicates = {name for name in normalized_names if normalized_names.count(name) > 1}
        if duplicates:
            alerts.extend([f"Duplicate medicine entry detected: {name.title()}" for name in sorted(duplicates)])

        for medicine in normalized_names:
            if medicine in allergy_terms:
                alerts.append(f"Patient allergy list includes {medicine.title()}; doctor review is required before dispensing.")

        if any("warfarin" in name for name in normalized_names) and any("ibuprofen" in name for name in normalized_names):
            alerts.append("Warfarin and ibuprofen combination may increase bleeding risk and needs doctor review.")

        risk_level = "high" if alerts else "low"
        summary = "Potential medication safety issues detected." if alerts else "No obvious rule-based medication conflict detected."
        explanation = (
            "Rule-based drug safety screening executed against the submitted medicine names and allergy terms."
            if self.provider == "rule_based"
            else f"Configured drug data provider '{self.provider}' is unavailable; safe rule-based screening was used."
        )
        status = "ready" if self.provider == "rule_based" else "fallback"

        if not self.enable_fallbacks and self.provider != "rule_based":
            alerts = ["Configured drug safety provider is unavailable."]
            summary = "Drug safety provider unavailable. Doctor and pharmacist review is required."
            explanation = f"Configured drug data provider '{self.provider}' is unavailable and AI fallbacks are disabled."
            risk_level = "unknown"
            status = "unavailable"

        return AdapterResult(
            output={
                "summary": summary,
                "alerts": alerts,
                "medicineNames": medicine_names,
                "allergiesChecked": sorted(allergy_terms),
            },
            confidence=0.62 if alerts else 0.55,
            explanation=explanation,
            risk_level=risk_level,
            model_status=status,
        )
