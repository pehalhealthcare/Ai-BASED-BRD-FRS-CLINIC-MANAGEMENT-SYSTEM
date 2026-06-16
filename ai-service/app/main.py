from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routes.ai_foundation_routes import direct_router as direct_ai_router
from app.routes.ai_foundation_routes import public_router as public_ai_router
from app.routes.ai_foundation_routes import router as ai_router
from app.routes.billing_anomaly_routes import direct_router as direct_billing_anomaly_router
from app.routes.billing_anomaly_routes import router as billing_anomaly_router
from app.routes.clinical_routes import router as clinical_router
from app.routes.drug_routes import direct_router as direct_drug_router
from app.routes.drug_routes import router as drug_router
from app.routes.health_routes import api_router, router
from app.routes.lab_routes import direct_router as direct_lab_router
from app.routes.lab_routes import router as lab_router
from app.routes.lab_report_routes import direct_router as direct_lab_report_router
from app.routes.lab_report_routes import router as lab_report_router
from app.routes.no_show_routes import direct_router as direct_no_show_router
from app.routes.no_show_routes import router as no_show_router
from app.routes.ocr_routes import direct_router as direct_ocr_router
from app.routes.ocr_routes import router as ocr_router
from app.routes.pharmacy_forecast_routes import direct_router as direct_pharmacy_forecast_router
from app.routes.pharmacy_forecast_routes import router as pharmacy_forecast_router
from app.routes.prescription_routes import router as prescription_router
from app.routes.stt_routes import direct_router as direct_stt_router
from app.routes.stt_routes import public_router as public_stt_router
from app.routes.stt_routes import router as stt_router
from app.utils.logger import get_logger
from app.utils.response import error_response

settings = get_settings()
logger = get_logger("ai-cms-ai-service")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("AI service started on %s:%s", settings.ai_service_host, settings.ai_service_port)
    yield


app = FastAPI(
    title="AI-CMS AI Service",
    version="1.0.0",
    description="AI service with safe clinical assistance endpoints.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request, exc: RequestValidationError):
    errors = []

    for item in exc.errors():
        location = [str(part) for part in item.get("loc", []) if part != "body"]
        errors.append(
            {
                "field": ".".join(location) or None,
                "message": item.get("msg", "Invalid input"),
            }
        )

    return JSONResponse(status_code=422, content=error_response("Validation failed", errors))


@app.exception_handler(HTTPException)
async def http_exception_handler(_request, exc: HTTPException):
    details = exc.detail if isinstance(exc.detail, list) else [{"message": str(exc.detail)}]
    return JSONResponse(status_code=exc.status_code, content=error_response("Request failed", details))


@app.exception_handler(ValueError)
async def value_error_handler(_request, exc: ValueError):
    return JSONResponse(status_code=400, content=error_response("Validation failed", [{"message": str(exc)}]))


@app.exception_handler(Exception)
async def general_exception_handler(_request, exc: Exception):
    logger.error("Unhandled AI service error: %s", exc)
    return JSONResponse(
        status_code=500,
        content=error_response("Internal server error", [{"message": "An unexpected error occurred"}]),
    )

app.include_router(router)
app.include_router(api_router)
app.include_router(direct_ai_router)
app.include_router(public_ai_router)
app.include_router(ai_router)
app.include_router(direct_billing_anomaly_router)
app.include_router(billing_anomaly_router)
app.include_router(no_show_router)
app.include_router(direct_no_show_router)
app.include_router(drug_router)
app.include_router(direct_drug_router)
app.include_router(direct_ocr_router)
app.include_router(ocr_router)
app.include_router(direct_pharmacy_forecast_router)
app.include_router(pharmacy_forecast_router)
app.include_router(direct_lab_router)
app.include_router(lab_router)
app.include_router(direct_lab_report_router)
app.include_router(lab_report_router)
app.include_router(stt_router)
app.include_router(direct_stt_router)
app.include_router(public_stt_router)
app.include_router(clinical_router)
app.include_router(prescription_router)
