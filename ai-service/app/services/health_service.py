from app.evaluation.adapter_registry import summarize_adapter_status


def build_health_payload() -> dict:
    return {
        "service": "ai-service",
        "status": "ok",
        "version": "1.0.0",
        "adapters": summarize_adapter_status(),
    }
