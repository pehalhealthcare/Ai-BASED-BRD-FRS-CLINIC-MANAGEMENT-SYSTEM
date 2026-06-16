# AI-CMS

AI-CMS is an industry-ready AI-Based Clinic Management System. The current repository now covers Phase 0 through Phase 23: runtime infrastructure, health endpoints, Docker support, non-Docker local development, auth, RBAC, audit logging, patient management, doctor management, appointment scheduling, an MVP AI service, consultation workflows, doctor-approved digital prescriptions, billing/invoice management, clinic-scoped lab orders/results, pharmacy dispensing with inventory tracking, mock-first notifications plus follow-up task tracking, backend-owned dashboard analytics, pharmacy demand forecasting, and admin-only billing anomaly review.

## Phase 22 Module Summary

Phase 22 adds:

- Assistive pharmacy demand forecasting in the FastAPI AI service with `POST /ai/pharmacy-demand` and `POST /ai/train/pharmacy-demand`
- Safe time-series preference using StatsForecast `AutoARIMA` or `AutoETS` when enough medicine sales history is present
- Honest fallback behavior with `model_status` set to `fallback`, `insufficient_data`, or `unavailable` instead of faking trained accuracy
- Backend pharmacy stock-intelligence integration with prediction persistence, safe AI-service failure handling, and medicine-level forecast retrieval
- Frontend pharmacy detail visibility for next 7-day and 30-day demand, stockout risk, reorder alerts, expiry risk, reason codes, and model status

Phase 22 does not block dispensing when forecasting is unavailable, and the forecast output must not be treated as a final procurement decision without admin or pharmacist review.

## Phase 23 Module Summary

Phase 23 adds:

- Assistive billing fraud and revenue leakage screening with `POST /ai/billing-anomaly` and `POST /ai/train/billing-anomaly`
- Explainable billing audit rules first, with optional IsolationForest scoring when enough historical billing data exists
- Honest fallback behavior when trained model artifacts or ML dependencies are unavailable
- Backend billing anomaly persistence plus admin-only review APIs and dashboard visibility
- Review actions for Admin and Super Admin users only, including review, dismiss, and confirm flows

Phase 23 does not expose anomaly review data to patient, doctor, receptionist, or pharmacist UI, and the anomaly output is an admin review signal only rather than a final fraud judgment.

## Phase 3 Module Summary

Phase 3 adds:

- Clinic-scoped patient registration and profile management
- Patient search, pagination, and history placeholders
- Clinic-scoped doctor management
- Doctor availability base management
- Readable patient IDs and doctor codes backed by per-clinic counters

Phase 3 does not add appointment scheduling, EMR consultations, billing, prescription workflows, lab, pharmacy, or AI clinical logic yet.

## Phase 4 Module Summary

Phase 4 adds:

- Doctor-wise appointment booking with slot conflict prevention
- Walk-in, scheduled, follow-up, and teleconsultation appointment types
- Available-slots and calendar APIs for day, week, and month views
- Appointment status flow, cancellation, and rescheduling trail
- AI-backed no-show prediction with safe rule-based fallback scoring
- Frontend appointment list, create, calendar, and detail pages

Phase 4 does not add EMR consultation workflows, prescription generation, billing, or SMS/WhatsApp reminders yet. The current repository baseline now upgrades no-show scoring beyond the original Phase 4 placeholder.

## Phase 5 Module Summary

Phase 5 adds:

- FastAPI AI service health, symptom-check, trainable no-show prediction, OCR placeholder, transcription placeholder, and clinical note formatting endpoints
- Backend AI proxy routes for validated symptom-check, no-show, and clinical note formatting requests
- Safety guardrails, medical disclaimers, and output sanitization for AI responses
- Lightweight file-upload validation for OCR and audio intake
- AI service tests for health, symptom-check, no-show, guardrails, note formatting, and upload placeholders

Phase 5 does not add trained medical models, OCR engines, Whisper transcription, medication advice, or autonomous clinical decision-making.

## Phase 6 Module Summary

Phase 6 adds:

- Consultation creation, list, appointment-linked lookup, completion, and patient consultation history
- Structured EMR consultation capture with symptom objects, vitals, diagnosis notes, treatment plan, follow-up, and SOAP note formatting
- AI-assisted diagnosis suggestions with doctor accept, reject, and partially accept review flow
  - AI prediction persistence for auditability and future model evaluation
  - Frontend consultation workspace with vitals, diagnosis, notes, and AI suggestion review
  - Safe appointment-to-consultation status progression hooks

Phase 6 does not add prescription generation or billing workflows yet.

## Phase 7 Module Summary

Phase 7 adds:

- Clinic-scoped prescription drafts linked to patients, consultations, doctors, and appointments
- Medicine-item capture with doctor-controlled dosage, frequency, route, duration, timing, and instructions
- Prescription finalization lock with mandatory `doctorConfirmation: true`
- PDF generation and authenticated PDF download endpoints
- Patient history prescription integration
- Safe AI advice-formatting helper that requires doctor review and never prescribes automatically
- Frontend prescription create, detail, list, and PDF download flows

Phase 7 does not add pharmacy inventory, billing, drug-interaction alerts, stock deduction, or automatic medical prescribing.

## Phase 8 Module Summary

Phase 8 adds:

- Clinic-scoped invoice creation with backend-owned subtotal, discount, GST, total, paid, and due calculations
- Payment recording with payment-status tracking across `unpaid`, `partial`, `paid`, and `cancelled`
- Invoice PDF generation and authenticated PDF download
- Billing summary APIs for dashboard widgets
- Patient-linked invoice history integration in patient history and patient profile flows
- Frontend billing list, create, detail, payment, and PDF download screens
- Persistent invoice storage wiring for local and Docker development

Phase 8 does not add payment gateway integration, refunds, pharmacy stock deduction, lab/pharmacy modules, or AI fraud detection.

## Phase 9 Module Summary

Phase 9 adds:

- A protected React + Vite + JavaScript frontend shell with login, JWT session handling, sidebar navigation, topbar, and shared loading/error/empty states
- Dashboard, patient, appointment, consultation, chatbot, prescription, and billing screens wired to live backend APIs where available
- Safe frontend API adapters for inconsistent response shapes and missing dashboard metrics
- Direct AI-service fallback support for symptom check, clinical note formatting, and transcription when backend AI proxy routes are unavailable
- Docker and local-development compatibility updates so `frontend`, `backend`, `ai-service`, and `mongo` can run together cleanly

Phase 9 does not replace backend business logic with frontend-only mock data. Where a dedicated backend endpoint is still missing, the frontend shows safe empty states or aggregates existing APIs.

## Phase 11 Module Summary

Phase 11 adds:

- Clinic-scoped lab test catalog management with reusable code, category, specimen, unit, reference range, and price metadata
- Consultation-linked lab order creation with readable clinic-scoped order numbers in `LAB-YYYYMMDD-XXXX` format
- Lab order status workflow across `ordered`, `sample_collected`, `processing`, `completed`, and `cancelled`
- Lab report creation, structured result entry editing, abnormal flag detection, and finalized review flow
- Patient lab history integration in both the backend history summary and the frontend patient workspace
- Audit events for lab catalog creation, order creation, order status changes, report creation, report updates, and finalization

Phase 11 does not add external LIS integrations, OCR/CV report extraction, advanced ML interpretation, pharmacy workflows, or notification delivery.

## Phase 12 Module Summary

Phase 12 adds:

- Clinic-scoped medicine catalog management with searchable metadata, stock batches, reorder levels, and prescription-required flags
- Batch-aware stock tracking with total stock recalculation, low-stock detection, near-expiry detection, and expired stock blocking
- Dispensing workflow linked to finalized prescriptions with FEFO-style batch allocation
- Pharmacy sale record creation with a safe invoice hook for later billing alignment
- Prescription dispensing status updates and patient medicine-history integration
- Frontend medicine catalog, medicine detail, dispensing list/detail, patient medicine history, and prescription-linked dispense flows
- Audit events for medicine creation/updates, batch addition, dispensing, sale creation, and cancellation-safe hooks

Phase 12 does not add supplier procurement, insurance claims, e-commerce ordering, advanced drug interaction engines, or external pharmacy/LIS integrations.

## Phase 13 Module Summary

Phase 13 adds:

- Clinic-scoped notification templates with safe variable rendering
- Notification logs with `pending`, `sent`, `failed`, and `cancelled` delivery states
- Mock-first provider abstraction with optional console/email placeholder behavior for local development
- Follow-up task creation and status tracking with scheduled reminder logs
- Patient notification history and follow-up visibility in backend history and frontend pages
- Safe notification hooks from appointment booking, consultation completion, prescription finalization, invoice creation, and finalized lab reports
- Frontend pages for notification templates, logs, manual sending, follow-up tasks, and patient notification history
- Audit events for template creation, sending, scheduling, cancellation, follow-up creation, and follow-up status updates

Phase 13 does not add paid SMS/WhatsApp integrations, cron-based delivery infrastructure, marketing automation, telemedicine messaging, or autonomous clinical follow-up advice.

## Phase 14 Module Summary

Phase 14 adds:

- Protected backend dashboard analytics endpoints under `/api/v1/dashboard`
- Clinic-scoped date-range-aware overview metrics for patients, appointments, consultations, prescriptions, invoices, labs, pharmacy, and follow-ups
- Dedicated appointment, revenue, patient, lab, pharmacy, and notification analytics endpoints
- Doctor workload, no-show summary, and recent activity feed endpoints
- Frontend dashboard section pages wired directly to the new backend analytics APIs
- Shared frontend date-range filter and dashboard cards/tables instead of the old placeholder dashboard adapter

Phase 14 does not add external BI tooling, heavy charts, websockets, or ML forecasting.

## Phase 15 Module Summary

Phase 15 adds:

- Docker/runtime hardening for `docker-compose.yml` and service Dockerfiles
- Backend and AI-service container healthchecks
- Cleaner env-example alignment with actual config loaders
- Seed/demo data refresh so demo flow now includes labs, pharmacy, and notifications in addition to the core clinic workflow
- Postman collection cleanup for health, auth, patients, doctors, appointments, consultations, prescriptions, billing, labs, pharmacy, notifications, dashboard, and AI service endpoints
- Source-of-truth docs refresh for the real post-dashboard baseline
- Deployment/testing/operations docs for staging-readiness tracking

Phase 15 does not add new business modules. It is a stabilization pass.

## Tech Stack

Frontend:

- React
- Vite
- JavaScript
- Tailwind CSS
- React Router
- Axios

Backend:

- Node.js
- Express.js
- JavaScript
- MongoDB + Mongoose
- JWT + RBAC
- Zod validation

AI Service:

- Python
- FastAPI
- `requirements.txt`-driven setup

## Services And Ports

- Backend: `http://localhost:5000`
- Backend health: `http://localhost:5000/health`
- Backend docs: `http://localhost:5000/api-docs`
- AI service: `http://localhost:8000`
- AI health: `http://localhost:8000/health`
- Frontend: `http://localhost:5173`

## Run Mode A: Docker

```bash
cp .env.example .env
docker compose up --build
```

Backend:
`http://localhost:5000/health`

AI Service:
`http://localhost:8000/health`

Frontend:
`http://localhost:5173`

## Run Mode B: Without Docker + Local MongoDB

Terminal 1:
Start local MongoDB manually.

Terminal 2:

```bash
cd backend
cp .env.example .env
# set MONGO_MODE=local
npm install
npm run check:env
npm run seed:admin
npm run dev
```

Terminal 3:

```bash
cd ai-service
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 4:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Run Mode C: Without Docker + MongoDB Atlas

```bash
cd backend
cp .env.example .env
```

Set:

```bash
MONGO_MODE=atlas
MONGO_URI_ATLAS=mongodb+srv://username:password@cluster-url/ai-cms?retryWrites=true&w=majority
```

Then:

```bash
npm run check:env
npm run seed:admin
npm run dev
```

Run the AI service and frontend with the same non-Docker commands shown in Run Mode B.

## How To Create MongoDB Atlas URI

1. Create a cluster in MongoDB Atlas.
2. Create a database user with a username and password.
3. Add your current public IP address to the Atlas network access list.
4. Copy the SRV connection string from Atlas.
5. Replace `<username>`, `<password>`, and `<cluster-url>` in `MONGO_URI_ATLAS`.
6. Keep the database name as `ai-cms` unless you intentionally want a different database.

## How To Seed Admin

```bash
cd backend
cp .env.example .env
npm install
npm run check:env
npm run seed:admin
```

The seed script creates the `SUPER_ADMIN` only if the configured email does not already exist.

## How To Seed Demo Data

```bash
cd backend
cp .env.example .env
npm install
npm run seed
```

The demo seed is idempotent and creates:

- 1 demo clinic
- 1 super admin user
- 1 receptionist user
- 1 doctor user
- 1 patient user
- 2 doctor records with availability
- 3 patient records
- 2 appointments
- 1 completed consultation
- 1 finalized prescription
- 1 issued invoice with partial payment history
- 1 completed lab order and finalized lab report
- 1 medicine catalog item, 1 dispensing record, and 1 pharmacy sale
- 1 notification template, 1 sent notification log, and 1 follow-up task

## Demo Credentials

- `admin@aicms.local` / `Admin123!`
- `receptionist@aicms.local` / `Reception@12345`
- `doctor@aicms.local` / `Doctor@12345`
- `patient@aicms.local` / `Patient@12345`

## How To Run Tests

Backend:

```bash
cd backend
npm test
```

AI service:

```bash
cd ai-service
cp .env.example .env
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
pytest
```

Phase 22 AI-service verification:

```bash
cd ai-service
pytest
python -m pytest
python -m py_compile app/main.py
```

Phase 23 billing anomaly verification:

```bash
cd ai-service
pytest
cd ../backend
npm test
cd ../frontend
npm run build
```

Frontend:

```bash
cd frontend
npm run build
```

## Backend Endpoints

Existing foundation endpoints:

- `GET /health`
- `GET /api/v1/health`
- `GET /api-docs`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

Phase 3 patient endpoints:

- `POST /api/v1/patients`
- `GET /api/v1/patients`
- `GET /api/v1/patients/:id`
- `PATCH /api/v1/patients/:id`
- `DELETE /api/v1/patients/:id`
- `GET /api/v1/patients/:id/history`
- `GET /api/v1/patients/:patientId/labs`
- `GET /api/v1/patients/:patientId/medicines`

Phase 3 doctor endpoints:

- `POST /api/v1/doctors`
- `GET /api/v1/doctors`
- `GET /api/v1/doctors/:id`
- `PATCH /api/v1/doctors/:id`
- `DELETE /api/v1/doctors/:id`
- `PATCH /api/v1/doctors/:id/availability`

Phase 4 appointment endpoints:

- `POST /api/v1/appointments`
- `GET /api/v1/appointments`
- `GET /api/v1/appointments/calendar`
- `GET /api/v1/appointments/available-slots`
- `GET /api/v1/appointments/:id`
- `PATCH /api/v1/appointments/:id/status`
- `PATCH /api/v1/appointments/:id/reschedule`
- `PATCH /api/v1/appointments/:id/cancel`
- `GET /api/v1/doctors/:doctorId/availability`
- `PUT /api/v1/doctors/:doctorId/availability`
- `POST /api/v1/doctors/:doctorId/blocked-slots`

Phase 5 backend AI proxy endpoints:

- `POST /api/v1/ai/symptom-check`
- `POST /api/v1/ai/no-show`
- `POST /api/v1/ai/format-clinical-note`

Phase 5 AI service endpoints:

- `GET /health`
- `GET /api/v1/health`
- `POST /api/v1/ai/symptom-check`
- `POST /api/v1/ai/no-show`
- `POST /api/v1/ai/no-show-predict`
- `POST /api/v1/ai/ocr-patient-document`
- `POST /api/v1/ai/transcribe`
- `POST /api/v1/ai/format-clinical-note`

Phase 6 consultation endpoints:

- `POST /api/v1/consultations`
- `GET /api/v1/consultations`
- `GET /api/v1/consultations/:id`
- `PATCH /api/v1/consultations/:id`
- `POST /api/v1/consultations/:id/ai-suggestions`
- `POST /api/v1/consultations/:id/ai-review`
- `POST /api/v1/consultations/:id/format-note`
- `POST /api/v1/consultations/:id/complete`
- `GET /api/v1/consultations/appointment/:appointmentId`
- `GET /api/v1/consultations/patient/:patientId/history`
- `GET /api/v1/patients/:patientId/clinical-history`

Phase 7 prescription endpoints:

- `POST /api/v1/prescriptions`
- `GET /api/v1/prescriptions/:id`
- `GET /api/v1/prescriptions/patient/:patientId`
- `GET /api/v1/prescriptions/consultation/:consultationId`
- `PATCH /api/v1/prescriptions/:id`
- `POST /api/v1/prescriptions/:id/finalize`
- `POST /api/v1/prescriptions/:id/cancel`
- `GET /api/v1/prescriptions/:id/download`

Phase 7 AI helper endpoints:

- `POST /api/v1/ai/prescription/format-advice`
- `POST /api/v1/prescription/format-advice`

Phase 8 billing endpoints:

- `POST /api/v1/billing/invoices`
- `GET /api/v1/billing/invoices`
- `GET /api/v1/billing/invoices/:id`
- `PUT /api/v1/billing/invoices/:id`
- `POST /api/v1/billing/invoices/:id/payments`
- `POST /api/v1/billing/invoices/:id/generate-pdf`
- `GET /api/v1/billing/invoices/:id/pdf`
- `PATCH /api/v1/billing/invoices/:id/cancel`
- `GET /api/v1/billing/patient/:patientId/invoices`
- `GET /api/v1/billing/summary`

Phase 11 lab endpoints:

- `POST /api/v1/labs/tests`
- `GET /api/v1/labs/tests`
- `POST /api/v1/labs/orders`
- `GET /api/v1/labs/orders`
- `GET /api/v1/labs/orders/:id`
- `PATCH /api/v1/labs/orders/:id/status`
- `POST /api/v1/labs/reports`
- `GET /api/v1/labs/reports/:id`
- `PATCH /api/v1/labs/reports/:id`
- `PATCH /api/v1/labs/reports/:id/finalize`

Phase 12 pharmacy endpoints:

- `POST /api/v1/pharmacy/medicines`
- `GET /api/v1/pharmacy/medicines`
- `GET /api/v1/pharmacy/medicines/:id`
- `GET /api/v1/pharmacy/medicines/:id/forecast`
- `PATCH /api/v1/pharmacy/medicines/:id`
- `POST /api/v1/pharmacy/medicines/:id/batches`
- `POST /api/v1/pharmacy/dispense`
- `GET /api/v1/pharmacy/dispensings`
- `GET /api/v1/pharmacy/dispensings/:id`
- `PATCH /api/v1/pharmacy/dispensings/:id/cancel`
- `POST /api/v1/billing/invoices/:id/refund`
- `GET /api/v1/admin/billing-anomalies`
- `GET /api/v1/admin/billing-anomalies/:id`
- `PATCH /api/v1/admin/billing-anomalies/:id/review`

Phase 22 AI pharmacy endpoints:

- `POST /api/v1/ai/pharmacy-demand`
- `POST /ai/pharmacy-demand`
- `POST /api/v1/ai/train/pharmacy-demand`
- `POST /ai/train/pharmacy-demand`
- `POST /api/v1/ai/billing-anomaly`
- `POST /ai/billing-anomaly`
- `POST /api/v1/ai/train/billing-anomaly`
- `POST /ai/train/billing-anomaly`

Phase 14 dashboard endpoints:

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/appointments`
- `GET /api/v1/dashboard/revenue`
- `GET /api/v1/dashboard/patients`
- `GET /api/v1/dashboard/labs`
- `GET /api/v1/dashboard/pharmacy`
- `GET /api/v1/dashboard/notifications`
- `GET /api/v1/dashboard/doctor-workload`
- `GET /api/v1/dashboard/no-show`
- `GET /api/v1/dashboard/activity-feed`

Phase 6 AI clinical endpoints:

- `POST /api/v1/ai/clinical/diagnosis-suggestions`
- `POST /api/v1/ai/clinical/format-note`
- `POST /api/v1/clinical/diagnosis-suggestions`
- `POST /api/v1/clinical/consultation-suggestions`
- `POST /api/v1/clinical/format-note`

## Frontend Routes

- `/dashboard`
- `/dashboard/appointments`
- `/dashboard/revenue`
- `/dashboard/patients`
- `/dashboard/labs`
- `/dashboard/pharmacy`
- `/dashboard/billing-fraud`
- `/dashboard/notifications`
- `/appointments`
- `/appointments/new`
- `/appointments/:id`
- `/appointments/:appointmentId/consultation`
- `/consultations/:consultationId`
- `/prescriptions`
- `/prescriptions/new`
- `/prescriptions/:id`
- `/billing`
- `/billing/create`
- `/billing/:id`
- `/patients`
- `/patients/new`
- `/patients/:id`
- `/patients/:id/edit`
- `/patients/:patientId/history`
- `/patients/:patientId/labs`
- `/patients/:patientId/medicines`
- `/patients/:patientId/consultations`
- `/doctors`
- `/doctors/new`
- `/doctors/:id`
- `/doctors/:id/edit`
- `/doctors/:id/availability`
- `/consultations/:consultationId/labs/new`
- `/labs/tests`
- `/labs/orders`
- `/labs/orders/:id`
- `/labs/reports/:id`
- `/pharmacy/medicines`
- `/pharmacy/medicines/new`
- `/pharmacy/medicines/:id`
- `/prescriptions/:prescriptionId/dispense`
- `/pharmacy/dispensings`
- `/pharmacy/dispensings/:id`

## Common Errors And Fixes

- `Local MongoDB connection failed...`
  Start MongoDB locally or switch to `MONGO_MODE=atlas` and configure `MONGO_URI_ATLAS`.

- `MONGO_URI_ATLAS contains placeholder values...`
  Replace `<username>`, `<password>`, and `<cluster-url>` with real Atlas values.

- `MongoDB Atlas connection failed...`
  Recheck the Atlas username, password, IP whitelist, and cluster URL.

- `Environment validation failed.`
  Run `npm run check:env` inside `backend` and fill in the missing variables.

- Frontend API requests fail immediately in dev
  Confirm `frontend/.env` contains `VITE_API_BASE_URL=http://localhost:5000/api/v1`.

## Health Contracts

Backend health:

```json
{
  "success": true,
  "message": "Backend service is healthy",
  "data": {
    "service": "backend",
    "status": "ok",
    "database": {
      "status": "connected",
      "mode": "local"
    },
    "timestamp": "2026-04-21T00:00:00.000Z"
  }
}
```

AI health:

```json
{
  "success": true,
  "message": "AI service is healthy",
  "data": {
    "service": "ai-service",
    "status": "ok",
    "version": "1.0.0"
  }
}
```

## Foundation Notes

- Docker is supported but optional.
- Local MongoDB and MongoDB Atlas are both supported.
- The backend remains JavaScript-only.
- Appointment scheduling, consultation EMR, prescriptions, billing, and lab orders/results now exist for the MVP.
- Pharmacy inventory and prescription-linked dispensing now exist for the MVP.
- The AI service remains fallback-safe for local setup, but no-show prediction now supports a trainable XGBoost path when historical data and dependencies are available.
- Pharmacy forecasting prefers StatsForecast when enough daily sales history exists, but safely falls back to moving-average reorder rules when dependencies are unavailable or history is insufficient.
- Pharmacy demand confidence values reflect data sufficiency and forecast method availability only. They do not claim validated production accuracy.
- Billing anomaly screening is admin-facing only, uses explainable rules first, and falls back safely when IsolationForest artifacts or dependencies are unavailable.
- Billing anomaly confidence values do not claim validated fraud-detection accuracy and must not be treated as a final judgment.
- Consultation AI suggestions are assistive only and require doctor approval before becoming part of the consultation record.
- Prescription AI assistance only formats doctor-provided advice text and must still be reviewed and approved by a doctor.
- Billing totals are always recalculated on the backend, and invoice PDFs are stored under `backend/storage/invoices`.
- Lab result abnormal detection in Phase 11 is rule-based inside the backend and does not require a separate heavy AI model or direct frontend-to-AI-service calls.
- Pharmacy stock allocation and expiry checks in Phase 12 are backend-owned and do not trust client-side inventory math.
- Billing fraud and revenue leakage review now exists as an admin-only assistive workflow with safe fallback behavior.
- Detailed phase verification is recorded in `docs/IMPLEMENTATION_REPORT.md`.
- Dashboard analytics details are summarized in `docs/DASHBOARD_ANALYTICS.md`.
- Deployment readiness and test strategy notes live in `docs/DEPLOYMENT_READINESS.md`, `docs/TESTING_STRATEGY.md`, and `docs/OPERATIONS_RUNBOOK.md`.

## Pharmacy Forecasting Notes

- Required fields for demand forecasting: `medicine_id`, `medicine_name`, `current_stock`, `reorder_level`, `supplier_lead_time_days`, and `sales_history`
- Historical-data behavior:
  - fewer than `14` daily records returns `model_status: insufficient_data`
  - `14` to `29` records uses moving-average fallback rules
  - `30+` records attempts StatsForecast `AutoARIMA`, then `AutoETS`
- Fallback reorder behavior estimates next 7-day and 30-day demand from average daily sales, then derives reorder quantity and stockout risk without blocking pharmacy workflows
- Forecast failures should be shown as: `Forecast unavailable. Showing rule-based reorder status.`
- Environment flags:
- `ENABLE_PHARMACY_FORECAST=true`
- `PHARMACY_FORECAST_MIN_RECORDS=30`
- `BILLING_ANOMALY_MIN_TRAINING_RECORDS=300`
- `MODEL_DIR=app/models`
- `ENABLE_AI_FALLBACKS=true`

## Billing Anomaly Notes

- `POST /ai/billing-anomaly` returns the standardized AI envelope, and its `output` contains `anomaly_score` and `triggered_rules`
- Required billing context includes invoice totals, payment state, line items, and any available historical context such as duplicate invoice count, refund count, or average invoice values
- Fewer than `300` billing records should return `model_status: insufficient_data` from the training endpoint instead of pretending an IsolationForest model is ready
- If the billing anomaly model file is missing or dependencies are unavailable, the service must continue using rule-based fallback scoring
- Review workflow is Admin and Super Admin only, and the result is an assistive review signal rather than a final fraud determination
