# Architecture

## Current MVP Direction

AI-CMS uses a modular monolith backend plus a separate AI service:

- `frontend`: React + Vite + JavaScript application for clinic users
- `backend`: Express + JavaScript modular monolith that owns business APIs, auth, RBAC, and data access
- `ai-service`: FastAPI service for AI-assisted capabilities and safety wrappers
- `mongodb`: MVP database for flexible delivery speed

## Runtime Model

- Docker is optional. `docker compose` remains supported for local orchestration, but each service can also run directly without Docker.
- The backend can connect to MongoDB in three modes: `local`, `atlas`, or `direct`.
- Non-Docker local development can use a local MongoDB server or MongoDB Atlas.
- The AI service runs independently from the backend and does not depend on model downloads for its health routes.

## Consultation Flow

Phase 6 introduces a doctor consultation flow that keeps the backend in control of all clinic and patient data:

1. The frontend opens a consultation workspace from an appointment.
2. The frontend sends consultation create and update requests to the Express backend.
3. The backend validates JWT, RBAC, clinic scope, patient ownership, and appointment ownership.
4. When the doctor requests AI suggestions, the backend sends a reduced clinical payload to the FastAPI AI service.
5. The AI service returns rule-based assistive suggestions with disclaimer, confidence, reasoning, and red flags.
6. The backend stores those suggestions in the consultation record and also stores the full inference result in `ai_predictions`.
7. The doctor accepts, rejects, or edits suggestions through the backend only.

This keeps the AI service off the public frontend boundary and preserves auditability in the backend data layer.

## Lab Workflow

Phase 11 extends the consultation workflow with a backend-owned lab module:

1. The doctor opens a consultation and starts a lab order from the consultation context.
2. The frontend reads the clinic lab catalog from the Express backend only.
3. The backend validates JWT, RBAC, clinic scope, consultation ownership, patient ownership, and doctor ownership before creating the lab order.
4. The backend generates a readable clinic-scoped lab order number using the shared sequence helper pattern.
5. Lab staff, doctors, or admins progress the order status through the backend-owned transition rules.
6. Structured report entries are saved through the backend, which computes abnormal flags and creates a lightweight assistive summary without requiring a heavy AI model.
7. Finalized reports and order summaries surface back into patient history through backend APIs.

This keeps lab ordering, abnormal flag logic, and audit events inside the main backend boundary, while leaving future LIS integrations or advanced AI analysis as optional later extensions.

## Pharmacy Workflow

Phase 12 extends the prescription workflow with clinic-scoped inventory and dispensing:

1. Admin or pharmacist users maintain the medicine catalog and stock batches through the frontend, which talks only to the Express backend.
2. The backend validates JWT, RBAC, clinic scope, prescription ownership, patient ownership, and medicine ownership before any dispense action.
3. Medicine stock is stored in the main backend database with batch metadata, expiry dates, and backend-computed stock summaries.
4. When staff dispense against a finalized prescription, the backend allocates stock using FEFO-style selection from valid non-expired batches.
5. The backend deducts batch quantities, recalculates medicine stock, creates a dispensing record, creates a pharmacy sale record, and updates the prescription dispensing status.
6. Patient history and prescription detail views read pharmacy state back through backend APIs only.

This keeps stock math, expiry checks, prescription linkage, and audit events inside the backend boundary instead of trusting client-side inventory calculations.

## Notifications Workflow

Phase 13 adds a mock-first notification and follow-up layer around the existing clinical workflow:

1. Staff create templates, ad hoc notifications, or follow-up tasks through the frontend, which talks only to the Express backend.
2. The backend validates JWT, RBAC, clinic scope, and patient or related-record ownership before creating a notification log or follow-up task.
3. Template variables are rendered in the backend with safe fallback behavior for missing values.
4. Immediate sends are dispatched through a provider abstraction that defaults to the local-safe mock provider.
5. Future sends are stored as `pending` notification logs until staff manually dispatch due entries.
6. Appointment booking, consultation follow-up dates, prescription finalization, invoice creation, and finalized lab reports can create notification intents through backend-owned helper hooks.
7. Patient history and dedicated notification pages read notification logs and follow-up tasks back through backend APIs only.

This keeps scheduling, delivery state, and auditability inside the main backend while avoiding paid provider dependencies or heavy background infrastructure during the MVP.

## Dashboard Analytics Workflow

Phase 14 adds a backend-owned analytics layer instead of relying on frontend-only aggregation:

1. The frontend dashboard pages call protected `/api/v1/dashboard/*` endpoints on the Express backend only.
2. The backend resolves clinic scope from the authenticated user and optional super-admin override path already used elsewhere.
3. A shared analytics date-range helper parses `from` and `to`, defaults to the last 30 days, and caps overly large ranges.
4. The dashboard service composes metrics from appointments, patients, consultations, prescriptions, invoices, labs, pharmacy, and notifications using Mongo queries and light aggregation pipelines.
5. Doctor access is scoped safely to linked doctor records where the underlying schema supports doctor-owned metrics.
6. The frontend stays chart-light for the MVP and renders cards, grouped tables, trend lists, and activity feed entries from backend data.

This keeps KPI ownership in the backend, makes clinic scoping consistent, and avoids duplicating analytics logic in the browser.

## Why This Shape

This architecture balances speed and extensibility:

- The backend remains easy to reason about during MVP delivery
- AI concerns stay isolated in a service boundary from day one
- MongoDB supports flexible schema evolution during early product discovery
- Future extraction into microservices remains possible without rethinking the frontend

## Database Connectivity

- `MONGO_MODE=local` targets `MONGO_URI_LOCAL`
- `MONGO_MODE=atlas` targets `MONGO_URI_ATLAS`
- `MONGO_MODE=direct` targets `MONGO_URI`

In development, the backend can still boot if MongoDB is unavailable so that health routes, Swagger, and basic runtime checks remain reachable. Production startup remains strict and exits on database connection failure.

## Future Evolution

Potential future service extraction areas:

- Billing and payments
- Analytics and ML pipelines
- Telemedicine and real-time services

Phase 14 does not add external BI infrastructure, real-time streams, data warehouses, or heavy forecasting. Those remain later concerns once the clinic-scoped operational workflow is stable.

## Hardening Notes

Phase 15 focuses on production-readiness hygiene without changing the business-module boundaries:

- Docker remains optional for development, and non-Docker local startup is still supported for backend, frontend, and AI service.
- Service Dockerfiles now default to practical runtime commands, while `docker-compose.yml` keeps a dev-friendly override strategy.
- Backend and AI service container healthchecks are defined for Docker-based startup orchestration.
- Env examples now track the variables actually read by the backend and AI-service config loaders.
- Demo seed data now better reflects the verified end-to-end workflow baseline instead of stopping at the earlier billing-only seed state.

The MVP should stay modular enough that controllers, services, repositories, validators, and shared contracts can be split later with minimal churn.
