from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from statistics import mean

from app.adapters.base import BaseModelAdapter
from app.models.adapter_result import AdapterResult


@dataclass(frozen=True)
class ForecastModelResult:
    next_7_days_demand: float
    next_30_days_demand: float
    average_daily_sales: float
    confidence: float
    explanation: str
    model_name: str
    model_status: str
    records_used: int


class ForecastingAdapter(BaseModelAdapter):
    adapter_name = "forecasting"
    model_version = "v1"

    def __init__(
        self,
        *,
        provider: str,
        enable_fallbacks: bool,
        enable_forecast: bool = True,
        min_records: int = 30,
        model_dir: str = "app/models",
    ):
        self.provider = (provider or "placeholder").strip().lower()
        self.enable_fallbacks = enable_fallbacks
        self.enable_forecast = enable_forecast
        self.min_records = max(int(min_records or 30), 1)
        self.model_dir = Path(model_dir) / "pharmacy_demand"
        self.model_name = "fallback_reorder_rules"

    @property
    def is_available(self) -> bool:
        return self.enable_forecast

    def normalize_series(self, sales_history: list[dict]) -> list[tuple[date, float]]:
        daily_totals: dict[date, float] = {}

        for item in sales_history or []:
            record_date = item["date"] if isinstance(item["date"], date) else date.fromisoformat(str(item["date"]))
            quantity_sold = float(item["quantity_sold"])
            daily_totals[record_date] = daily_totals.get(record_date, 0.0) + quantity_sold

        if not daily_totals:
            return []

        filled_series: list[tuple[date, float]] = []
        current_day = min(daily_totals)
        last_day = max(daily_totals)

        while current_day <= last_day:
            filled_series.append((current_day, round(daily_totals.get(current_day, 0.0), 2)))
            current_day += timedelta(days=1)

        return filled_series

    def forecast(
        self,
        *,
        medicine_id: str,
        medicine_name: str,
        sales_history: list[dict],
    ) -> ForecastModelResult:
        series = self.normalize_series(sales_history)
        average_daily_sales = round(mean([value for _, value in series]), 2) if series else 0.0
        fallback_week = round(average_daily_sales * 7, 2)
        fallback_month = round(average_daily_sales * 30, 2)

        if not self.enable_forecast:
            return ForecastModelResult(
                next_7_days_demand=fallback_week,
                next_30_days_demand=fallback_month,
                average_daily_sales=average_daily_sales,
                confidence=0.0,
                explanation="Pharmacy forecasting is disabled by configuration, so fallback reorder rules were used.",
                model_name="fallback_reorder_rules",
                model_status="unavailable",
                records_used=len(series),
            )

        if len(series) < 14:
            return ForecastModelResult(
                next_7_days_demand=fallback_week,
                next_30_days_demand=fallback_month,
                average_daily_sales=average_daily_sales,
                confidence=0.35 if series else 0.0,
                explanation="Sales history is too small for stable forecasting. Fallback reorder rules were used.",
                model_name="fallback_reorder_rules",
                model_status="insufficient_data",
                records_used=len(series),
            )

        if len(series) < self.min_records:
            return ForecastModelResult(
                next_7_days_demand=fallback_week,
                next_30_days_demand=fallback_month,
                average_daily_sales=average_daily_sales,
                confidence=0.52,
                explanation="Sales history is below the minimum model-training threshold, so a moving-average fallback forecast was used.",
                model_name="fallback_reorder_rules",
                model_status="fallback",
                records_used=len(series),
            )

        model_result = self._try_statsforecast_models(
            medicine_id=medicine_id,
            medicine_name=medicine_name,
            series=series,
        )
        if model_result:
            return model_result

        return ForecastModelResult(
            next_7_days_demand=fallback_week,
            next_30_days_demand=fallback_month,
            average_daily_sales=average_daily_sales,
            confidence=0.55,
            explanation="StatsForecast models were unavailable or failed, so a moving-average fallback forecast was used.",
            model_name="fallback_reorder_rules",
            model_status="fallback",
            records_used=len(series),
        )

    def train(
        self,
        *,
        medicine_id: str,
        medicine_name: str,
        sales_history: list[dict],
        save_model: bool,
    ) -> dict:
        series = self.normalize_series(sales_history)
        if len(series) < 14:
            return {
                "medicine_id": medicine_id,
                "status": "skipped",
                "reason": "Insufficient history for training.",
                "records_used": len(series),
                "model_name": "fallback",
            }

        model_result = self.forecast(
            medicine_id=medicine_id,
            medicine_name=medicine_name,
            sales_history=sales_history,
        )
        status = "trained" if model_result.model_status in {"available", "fallback"} else "skipped"
        reason = "Training artifact prepared successfully." if status == "trained" else "Training was skipped."

        if save_model and status == "trained":
            self._save_artifact(
                medicine_id=medicine_id,
                medicine_name=medicine_name,
                model_result=model_result,
                series=series,
            )

        return {
            "medicine_id": medicine_id,
            "status": status,
            "reason": reason,
            "records_used": model_result.records_used,
            "model_name": model_result.model_name if model_result.model_name != "fallback_reorder_rules" else "fallback",
        }

    def _save_artifact(
        self,
        *,
        medicine_id: str,
        medicine_name: str,
        model_result: ForecastModelResult,
        series: list[tuple[date, float]],
    ) -> None:
        self.model_dir.mkdir(parents=True, exist_ok=True)
        artifact_path = self.model_dir / f"{medicine_id}.json"
        artifact_path.write_text(
            json.dumps(
                {
                    "medicine_id": medicine_id,
                    "medicine_name": medicine_name,
                    "model_name": model_result.model_name,
                    "model_status": model_result.model_status,
                    "records_used": model_result.records_used,
                    "average_daily_sales": model_result.average_daily_sales,
                    "next_7_days_demand": model_result.next_7_days_demand,
                    "next_30_days_demand": model_result.next_30_days_demand,
                    "history_start": series[0][0].isoformat() if series else None,
                    "history_end": series[-1][0].isoformat() if series else None,
                    "saved_at": datetime.now(timezone.utc).isoformat(),
                },
                indent=2,
            ),
            encoding="utf-8",
        )

    def _try_statsforecast_models(
        self,
        *,
        medicine_id: str,
        medicine_name: str,
        series: list[tuple[date, float]],
    ) -> ForecastModelResult | None:
        if not self.enable_fallbacks and self.provider != "rule_based":
            return None

        try:
            import pandas as pd
            from statsforecast import StatsForecast
            from statsforecast.models import AutoARIMA, AutoETS
        except Exception:
            return None

        frame = pd.DataFrame(
            {
                "unique_id": [medicine_id] * len(series),
                "ds": [pd.Timestamp(day.isoformat()) for day, _ in series],
                "y": [value for _, value in series],
            }
        )

        model_attempts = [
            ("AutoARIMA", AutoARIMA(season_length=7)),
            ("AutoETS", AutoETS(season_length=7)),
        ]

        for model_name, model in model_attempts:
            try:
                stats_forecast = StatsForecast(models=[model], freq="D")
                forecast_frame = stats_forecast.forecast(df=frame, h=30)
                forecast_column = next((column for column in forecast_frame.columns if column not in {"unique_id", "ds"}), None)

                if not forecast_column:
                    continue

                predictions = [max(0.0, float(value)) for value in forecast_frame[forecast_column].tolist()]
                next_7_days_demand = round(sum(predictions[:7]), 2)
                next_30_days_demand = round(sum(predictions[:30]), 2)
                average_daily_sales = round(mean([value for _, value in series]), 2) if series else 0.0

                return ForecastModelResult(
                    next_7_days_demand=next_7_days_demand,
                    next_30_days_demand=next_30_days_demand,
                    average_daily_sales=average_daily_sales,
                    confidence=0.72,
                    explanation=f"{model_name} generated a time-series demand forecast from the supplied medicine sales history.",
                    model_name=model_name,
                    model_status="available",
                    records_used=len(series),
                )
            except Exception:
                continue

        return None
