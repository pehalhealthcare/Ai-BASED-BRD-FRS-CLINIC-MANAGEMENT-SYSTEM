from typing import Any


def success_response(message: str, data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "message": message,
        "data": data,
    }


def error_response(message: str, errors: list[Any] | None = None) -> dict[str, Any]:
    return {
        "success": False,
        "message": message,
        "errors": errors or [],
    }
