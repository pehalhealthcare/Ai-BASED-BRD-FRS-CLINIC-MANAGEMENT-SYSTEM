from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.adapters.forecasting import ForecastModelResult
from app.config import get_settings
from app.evaluation.adapter_registry import get_adapter_registry
from app.main import app

client = TestClient(app)


def _reset_settings_cache() -> None:
    get_settings.cache_clear()
    get_adapter_registry.cache_clear()


def _sales_history(days: int, quantity: float = 5.0):
    start = date(2026, 4, 1)
    return [
        {
            "date": (start + timedelta(days=index)).isoformat(),
            "quantity_sold": quantity + (index % 3),
        }
        for index in range(days)
    ]


def _payload(**overrides):
    return {
        "medicine_id": "MED-001",
        "medicine_name": "Paracetamol 500",
        "current_stock": 120,
        "reorder_level": 50,
        "supplier_lead_time_days": 7,
        "expiry_date": "2026-08-30",
        "sales_history": _sales_history(30),
        "context": {
            "season": "summer",
            "month": 4,
            "doctor_specialization": "General Physician",
            "clinic_id": "CLINIC-1",
        },
        **overrides,
    }


def test_valid_forecast_request_with_enough_sales_history(monkeypatch) -> None:
    _reset_settings_cache()
    from app.adapters.forecasting import ForecastingAdapter

    def _fake_stats_model(self, **_kwargs):
        return ForecastModelResult(
            next_7_days_demand=35.0,
            next_30_days_demand=150.0,
            average_daily_sales=5.0,
            confidence=0.72,
            explanation="AutoARIMA generated a time-series demand forecast from the supplied medicine sales history.",
            model_name="AutoARIMA",
            model_status="available",
            records_used=30,
        )

    monkeypatch.setattr(ForecastingAdapter, "_try_statsforecast_models", _fake_stats_model)

    response = client.post("/ai/pharmacy-demand", json=_payload())

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["model_status"] == "available"
    assert data["output"]["next_7_days_demand"] == 35.0


def test_insufficient_data_returns_insufficient_data() -> None:
    response = client.post("/ai/pharmacy-demand", json=_payload(sales_history=_sales_history(10)))

    assert response.status_code == 200
    assert response.json()["data"]["model_status"] == "insufficient_data"


def test_current_stock_below_reorder_level_triggers_reorder_alert() -> None:
    response = client.post("/ai/pharmacy-demand", json=_payload(current_stock=20, reorder_level=50))

    assert response.status_code == 200
    assert response.json()["data"]["output"]["reorder_alert"] is True


def test_expiry_within_30_days_and_excess_stock_returns_high_expiry_risk() -> None:
    near_expiry = (date.today() + timedelta(days=20)).isoformat()
    response = client.post(
        "/ai/pharmacy-demand",
        json=_payload(
            current_stock=500,
            expiry_date=near_expiry,
            sales_history=_sales_history(14, quantity=1),
        ),
    )

    assert response.status_code == 200
    assert response.json()["data"]["output"]["expiry_risk"] == "high"


def test_zero_sales_history_does_not_crash() -> None:
    response = client.post("/ai/pharmacy-demand", json=_payload(sales_history=[]))

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["output"]["next_7_days_demand"] == 0
    assert data["model_status"] == "insufficient_data"


def test_negative_current_stock_is_rejected() -> None:
    response = client.post("/ai/pharmacy-demand", json=_payload(current_stock=-1))

    assert response.status_code == 422


def test_invalid_date_is_rejected() -> None:
    response = client.post(
        "/ai/pharmacy-demand",
        json=_payload(sales_history=[{"date": "not-a-date", "quantity_sold": 4}]),
    )

    assert response.status_code == 422


def test_autoarima_unavailable_falls_back_safely(monkeypatch) -> None:
    _reset_settings_cache()
    from app.adapters.forecasting import ForecastingAdapter

    monkeypatch.setattr(ForecastingAdapter, "_try_statsforecast_models", lambda self, **_kwargs: None)

    response = client.post("/ai/pharmacy-demand", json=_payload())

    assert response.status_code == 200
    assert response.json()["data"]["model_status"] == "fallback"


def test_training_endpoint_skips_medicines_with_insufficient_data() -> None:
    response = client.post(
        "/ai/train/pharmacy-demand",
        json={
            "records": [
                {
                    "medicine_id": "MED-001",
                    "medicine_name": "Paracetamol 500",
                    "date": "2026-04-01",
                    "quantity_sold": 5,
                    "current_stock": 120,
                    "reorder_level": 50,
                    "supplier_lead_time_days": 7,
                    "expiry_date": "2026-08-30",
                }
            ],
            "save_model": False,
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["trained_models"][0]["status"] == "skipped"
    assert data["model_status"] == "insufficient_data"


def test_api_response_follows_standardized_ai_response_schema() -> None:
    response = client.post("/ai/pharmacy-demand", json=_payload(sales_history=_sales_history(14)))

    assert response.status_code == 200
    data = response.json()["data"]
    assert {
        "output",
        "confidence",
        "explanation",
        "risk_level",
        "requires_doctor_review",
        "requires_admin_review",
        "model_name",
        "model_version",
        "model_status",
        "audit_id",
    }.issubset(data.keys())
