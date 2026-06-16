from fastapi.testclient import TestClient

from app.config import get_settings
from app.evaluation.adapter_registry import get_adapter_registry
from app.main import app

client = TestClient(app)


def _reset_settings_cache() -> None:
    get_settings.cache_clear()
    get_adapter_registry.cache_clear()


def _payload(**overrides):
    payload = {
        "invoice_id": "INV-001",
        "patient_id": "PAT-001",
        "user_id": "USR-001",
        "invoice_status": "issued",
        "payment_status": "paid",
        "total_amount": 1180,
        "subtotal": 1000,
        "discount_amount": 0,
        "discount_percent": 0,
        "tax_amount": 180,
        "paid_amount": 1180,
        "refund_amount": 0,
        "payment_mode": "cash",
        "items": [
            {
                "item_type": "consultation",
                "name": "General Consultation",
                "quantity": 1,
                "unit_price": 1000,
                "expected_unit_price": 1000,
                "total_price": 1000,
            }
        ],
        "linked_consultation_id": "CONS-001",
        "linked_lab_order_id": None,
        "linked_pharmacy_sale_id": None,
        "medicine_stock_deducted": True,
        "lab_order_exists": True,
        "manual_price_override": False,
        "historical_context": {
            "patient_invoice_count_today": 1,
            "user_cancelled_invoice_count_today": 0,
            "patient_refund_count_30d": 0,
            "duplicate_invoice_count": 0,
            "average_invoice_amount_30d": 900,
            "average_discount_percent_30d": 5,
            "same_service_count_today": 0,
        },
    }
    payload.update(overrides)
    return payload


def _triggered_codes(response_json):
    return [rule["code"] for rule in response_json["data"]["output"]["triggered_rules"]]


def test_duplicate_invoice_rule() -> None:
    response = client.post(
        "/ai/billing-anomaly",
        json=_payload(historical_context={**_payload()["historical_context"], "duplicate_invoice_count": 1}),
    )

    assert response.status_code == 200
    assert "DUPLICATE_INVOICE" in _triggered_codes(response.json())


def test_unusual_discount_rule() -> None:
    response = client.post(
        "/ai/billing-anomaly",
        json=_payload(discount_amount=400, discount_percent=40, total_amount=708, subtotal=1000, tax_amount=108),
    )

    assert response.status_code == 200
    assert "UNUSUAL_DISCOUNT" in _triggered_codes(response.json())


def test_refund_abuse_rule() -> None:
    history = {**_payload()["historical_context"], "patient_refund_count_30d": 4}
    response = client.post("/ai/billing-anomaly", json=_payload(refund_amount=150, historical_context=history))

    assert response.status_code == 200
    assert "REFUND_ABUSE" in _triggered_codes(response.json())


def test_manual_price_override_rule() -> None:
    response = client.post(
        "/ai/billing-anomaly",
        json=_payload(
            items=[
                {
                    "item_type": "service",
                    "name": "Procedure Fee",
                    "quantity": 1,
                    "unit_price": 1400,
                    "expected_unit_price": 1000,
                    "total_price": 1400,
                }
            ],
            subtotal=1400,
            tax_amount=0,
            total_amount=1400,
        ),
    )

    assert response.status_code == 200
    assert "MANUAL_PRICE_OVERRIDE" in _triggered_codes(response.json())


def test_repeated_patient_billing_rule() -> None:
    history = {**_payload()["historical_context"], "patient_invoice_count_today": 3}
    response = client.post("/ai/billing-anomaly", json=_payload(historical_context=history))

    assert response.status_code == 200
    assert "REPEATED_PATIENT_BILLING" in _triggered_codes(response.json())


def test_medicine_without_stock_deduction_rule() -> None:
    response = client.post(
        "/ai/billing-anomaly",
        json=_payload(
            items=[
                {
                    "item_type": "pharmacy",
                    "name": "Paracetamol",
                    "quantity": 2,
                    "unit_price": 100,
                    "expected_unit_price": 100,
                    "total_price": 200,
                }
            ],
            subtotal=200,
            tax_amount=0,
            total_amount=200,
            medicine_stock_deducted=False,
            linked_consultation_id=None,
        ),
    )

    assert response.status_code == 200
    assert "MEDICINE_WITHOUT_STOCK_DEDUCTION" in _triggered_codes(response.json())


def test_lab_bill_without_lab_order_rule() -> None:
    response = client.post(
        "/ai/billing-anomaly",
        json=_payload(
            items=[
                {
                    "item_type": "lab",
                    "name": "CBC",
                    "quantity": 1,
                    "unit_price": 500,
                    "expected_unit_price": 500,
                    "total_price": 500,
                }
            ],
            subtotal=500,
            tax_amount=0,
            total_amount=500,
            linked_consultation_id=None,
            linked_lab_order_id=None,
            lab_order_exists=False,
        ),
    )

    assert response.status_code == 200
    assert "LAB_BILL_WITHOUT_LAB_ORDER" in _triggered_codes(response.json())


def test_invoice_cancelled_after_payment_rule() -> None:
    response = client.post(
        "/ai/billing-anomaly",
        json=_payload(invoice_status="cancelled", payment_status="paid"),
    )

    assert response.status_code == 200
    assert "CANCELLED_AFTER_PAYMENT" in _triggered_codes(response.json())


def test_amount_mismatch_rule() -> None:
    response = client.post(
        "/ai/billing-anomaly",
        json=_payload(total_amount=999, subtotal=1000, discount_amount=0, tax_amount=180),
    )

    assert response.status_code == 200
    assert "AMOUNT_MISMATCH" in _triggered_codes(response.json())


def test_model_missing_fallback() -> None:
    _reset_settings_cache()
    response = client.post("/ai/billing-anomaly", json=_payload())

    assert response.status_code == 200
    assert response.json()["data"]["model_status"] == "fallback"


def test_response_schema_consistency() -> None:
    response = client.post("/ai/billing-anomaly", json=_payload())

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


def test_requires_admin_review_is_always_true() -> None:
    response = client.post("/ai/billing-anomaly", json=_payload())

    assert response.status_code == 200
    assert response.json()["data"]["requires_admin_review"] is True


def test_train_endpoint_returns_insufficient_data_for_too_few_records() -> None:
    response = client.post(
        "/ai/train/billing-anomaly",
        json={"records": [_payload()], "save_model": False},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["model_status"] == "insufficient_data"
    assert "At least" in data["message"]
