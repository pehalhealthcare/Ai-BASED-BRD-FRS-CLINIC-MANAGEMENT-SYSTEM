from app.config import get_settings


def bounded_confidence(value: float | int | None) -> float:
    if value is None:
        return 0.0
    return max(0.0, min(1.0, round(float(value), 2)))


def average_confidence(values: list[float | int]) -> float:
    normalized = [bounded_confidence(item) for item in values if item is not None]
    if not normalized:
        return 0.0
    return bounded_confidence(sum(normalized) / len(normalized))


def needs_review(confidence: float) -> bool:
    settings = get_settings()
    threshold = getattr(settings, "ocr_confidence_review_threshold", 0.85)
    return bounded_confidence(confidence) < threshold
