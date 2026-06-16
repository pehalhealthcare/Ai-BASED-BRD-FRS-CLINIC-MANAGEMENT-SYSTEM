from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["message"] == "AI service is healthy"
    assert payload["data"]["service"] == "ai-service"
    assert payload["data"]["status"] == "ok"
    assert payload["data"]["version"] == "1.0.0"


def test_api_health() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["message"] == "AI service is healthy"
    assert payload["data"]["service"] == "ai-service"
    assert payload["data"]["status"] == "ok"
    assert payload["data"]["version"] == "1.0.0"
