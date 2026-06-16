from fastapi import APIRouter

from app.services.health_service import build_health_payload
from app.utils.response import success_response

router = APIRouter()
api_router = APIRouter(prefix="/api/v1")


@router.get("/health", summary="AI service health")
def root_health() -> dict:
    return success_response("AI service is healthy", build_health_payload())


@api_router.get("/health", summary="AI service API health")
def api_health() -> dict:
    return success_response("AI service is healthy", build_health_payload())
