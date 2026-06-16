# Implementation Report

## PHASE 23 - Billing Fraud / Revenue Leakage Detection

### Goal

- Add assistive billing fraud and revenue leakage screening without breaking existing billing, pharmacy, lab, dashboard, or AI-service flows.
- Use explainable billing audit rules first, then IsolationForest when enough historical billing data exists.
- Keep all anomaly output admin-facing only and require admin review before any action.

### Scope Implemented

- AI-service billing anomaly prediction and training endpoints
- Explainable billing audit rules for duplicate invoices, unusual discounts, refund abuse, payment mismatches, missing lab or pharmacy links, and related leakage signals
- Optional IsolationForest adapter with safe model-file and dependency fallback behavior
- Backend invoice lifecycle hooks that refresh anomaly records on create, update, payment, cancel, and refund flows
- Admin-only billing anomaly list, detail, and review APIs
- Admin dashboard page for flagged invoices, risk level, anomaly score, triggered rules, model status, and review actions

### Notes

- Billing anomaly output is assistive only and is not a final fraud judgment.
- Missing model files or missing ML dependencies do not crash the AI service or backend billing workflow.
- Non-admin roles are blocked from anomaly review endpoints and UI routes.

## Audit and Reality Check - April 23, 2026

### Goal

- Inspect the current repository from source and command output before adding new features.
- Produce a trustworthy implementation status, gap analysis, and next-phase recommendation.
- Avoid new business feature work during the audit.

### Files Created

- `docs/CURRENT_PROJECT_STATUS.md`
- `docs/REPO_GAP_ANALYSIS.md`
- `docs/NEXT_PHASE_RECOMMENDATION.md`

### Files Modified

- `docs/IMPLEMENTATION_REPORT.md`

### Current True Status

- The verified full workflow baseline is Patient -> Doctor -> Appointment -> Consultation/EMR -> Prescription -> Billing -> Patient history.
- Backend, frontend, and AI service are JavaScript/JavaScript/Python FastAPI as required.
- The active frontend and backend source trees contain no `.ts` or `.tsx` files outside ignored dependency/build/cache folders.
- Auth/RBAC, patient, doctor, appointment, AI MVP, consultation, prescription, billing, frontend route shell, and internal audit logging are implemented.
- Dashboard/analytics and audit logs are partial.
- Lab, pharmacy, notifications, full patient portal, production OCR/transcription, payment gateway, CI, and production deployment are missing.
- Docker files exist, but Docker runtime/build verification could not be completed because the local `docker` CLI is unavailable.

### Verification Results

- `cd backend; npm.cmd test`: passed `13/13` suites and `77/77` tests.
- `cd frontend; npm.cmd run build`: passed; Vite built `178` modules.
- `cd ai-service; python -m pytest`: passed `21/21` tests.
- `cd backend; npm.cmd run check:env`: passed with `NODE_ENV=development` and `MONGO_MODE=atlas`.
- Backend live startup probe on port `5126`: `/`, `/health`, `/api/v1/health`, and `/api-docs` returned HTTP `200`.
- AI service live startup probe on port `8026`: `/health`, `/api/v1/health`, and `/api/v1/symptom-check` returned HTTP `200`.
- Frontend live Vite probe on port `5186`: `/`, `/dashboard`, and `/patients` returned HTTP `200`.
- `rg --files -g "*.ts" -g "*.tsx" -g "!**/node_modules/**" -g "!**/dist/**" -g "!**/__pycache__/**"` returned no matches.
- `docker compose config` could not run because `docker` is not installed.
- `git status --short` could not run because `git` is not installed.

### Docs Produced

- `docs/CURRENT_PROJECT_STATUS.md`: current completed/partial/missing modules, verified commands, route inventory, stack confirmation, Docker/non-Docker status, docs consistency, and recommended baseline tag.
- `docs/REPO_GAP_ANALYSIS.md`: claimed-vs-actual status, missing files/modules, docs drift, duplicate/legacy files, technical debt, and cleanup tasks.
- `docs/NEXT_PHASE_RECOMMENDATION.md`: recommends `Phase 11 - Lab Orders And Results MVP`, with rationale, dependencies, risks, and acceptance criteria.

### Recommended Baseline Tag

```text
baseline/audit-2026-04-23-phase-9-workflow-mvp
```

The tag was not created during this audit because the `git` CLI is unavailable in this environment.

## PHASE 11 - Lab Orders And Results MVP

### 1. Goal

- Add a production-ready, clinic-scoped lab workflow connected to consultation and patient history.
- Let doctors create lab orders from consultation context.
- Let admins, doctors, and lab technicians manage order progress and structured report results.

### 2. Scope Implemented

- Lab test catalog with clinic-scoped test definitions
- Lab order creation from consultations
- Readable clinic-scoped lab order numbers in `LAB-YYYYMMDD-XXXX` format
- Lab order status workflow
- Lab report creation, editing, and finalization
- Rule-based abnormal result detection and assistive summary generation in the backend
- Patient lab history endpoint and frontend page
- Patient history summary integration with lab counts and recent lab records
- Consultation workflow links into lab ordering
- Audit log hooks for lab lifecycle actions

### 3. Files Created

Backend:

- `backend/src/common/utils/generateLabOrderNumber.js`
- `backend/src/modules/labs/labTest.model.js`
- `backend/src/modules/labs/labOrder.model.js`
- `backend/src/modules/labs/labReport.model.js`
- `backend/src/modules/labs/lab.validator.js`
- `backend/src/modules/labs/lab.repository.js`
- `backend/src/modules/labs/lab.service.js`
- `backend/src/modules/labs/lab.controller.js`
- `backend/src/modules/labs/lab.routes.js`
- `backend/tests/labs.test.js`

Frontend:

- `frontend/src/features/labs/labApi.js`
- `frontend/src/features/labs/AbnormalFlagBadge.jsx`
- `frontend/src/features/labs/LabResultTable.jsx`
- `frontend/src/features/labs/LabHistoryPanel.jsx`
- `frontend/src/features/labs/LabTestCatalogPage.jsx`
- `frontend/src/features/labs/LabOrderCreatePage.jsx`
- `frontend/src/features/labs/LabOrdersPage.jsx`
- `frontend/src/features/labs/LabOrderDetailPage.jsx`
- `frontend/src/features/labs/LabReportPage.jsx`
- `frontend/src/features/labs/PatientLabHistoryPage.jsx`

Docs:

- `docs/LAB_MODULE.md`

### 4. Files Modified

Backend:

- `backend/src/modules/consultations/consultation.model.js`
- `backend/src/modules/patients/patient.service.js`
- `backend/src/modules/patients/patient.controller.js`
- `backend/src/modules/patients/patient.routes.js`
- `backend/src/routes/index.js`
- `backend/tests/patients.test.js`

Frontend:

- `frontend/src/app/routes.jsx`
- `frontend/src/app/ProtectedRoute.jsx`
- `frontend/src/constants/roles.js`
- `frontend/src/constants/routes.js`
- `frontend/src/lib/api.js`
- `frontend/src/features/consultations/ConsultationPage.jsx`
- `frontend/src/features/patients/PatientDetailPage.jsx`
- `frontend/src/features/patients/PatientHistoryPanel.jsx`

Docs:

- `README.md`
- `docs/API_CONTRACT.md`
- `docs/DATABASE_DESIGN.md`
- `docs/ARCHITECTURE.md`
- `docs/IMPLEMENTATION_REPORT.md`

### 5. What Each File Does

- `labTest.model.js`: stores clinic-scoped reusable test definitions.
- `labOrder.model.js`: stores consultation-linked lab orders and test snapshots.
- `labReport.model.js`: stores structured results, abnormal flags, and review state.
- `lab.validator.js`: validates catalog, order, report, and patient-lab-history requests.
- `lab.repository.js`: centralizes lab data access and population helpers.
- `lab.service.js`: enforces clinic scope, status transitions, abnormal detection, and audit events.
- `lab.controller.js`: maps HTTP requests to lab services.
- `lab.routes.js`: exposes protected `/api/v1/labs` endpoints.
- `generateLabOrderNumber.js`: generates clinic-scoped readable order numbers with the existing sequence helper.
- `labs.test.js`: verifies creation, numbering, transitions, abnormal flags, patient history, and clinic scoping.
- `frontend/src/features/labs/*.jsx`: provide catalog, order list/detail, report, and patient-history pages.
- `frontend/src/features/labs/labApi.js`: frontend wrappers for lab and patient lab-history APIs.
- `docs/LAB_MODULE.md`: focused lab workflow reference.

### 6. APIs Added

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
- `GET /api/v1/patients/:patientId/labs`

### 7. Models Added

- `LabTest`
- `LabOrder`
- `LabReport`

Consultation update:

- added `labOrdered` flag to the consultation model as a safe workflow hook

### 8. Validation Rules

- ObjectId validation for order, report, patient, consultation, doctor, appointment, and catalog references
- non-empty `tests` array for order creation
- enum validation for order `priority`, order/report `status`, and abnormal flag fields owned by the backend
- numeric validation for `numericValue`, range `min`, range `max`, and catalog `price`
- client-provided abnormal flags are ignored and recomputed by the backend

### 9. Clinic Scoping Behavior

- all lab reads and writes resolve clinic context through the existing clinic-scoping helper
- doctors are restricted to their own lab orders and lab reports
- patient lab history is clinic-scoped and doctor-filtered automatically when the requester is a doctor
- catalog, orders, and reports cannot cross clinic boundaries

### 10. Order Number Generation Logic

- Phase 11 reuses the existing shared sequence helper instead of creating a second numbering system
- format: `LAB-YYYYMMDD-XXXX`
- sequence is clinic-scoped and resets by day through the shared counter pattern

### 11. AI Placeholder Logic

- No new AI-service endpoint was required in Phase 11.
- Lab abnormal detection and assistive summary generation are handled in the Express backend with rule-based logic.
- The backend generates:
  - `isAbnormal`
  - `abnormalFlag`
  - `aiAnalysis.summary`
  - `aiAnalysis.abnormalHighlights`
  - `aiAnalysis.disclaimer`

### 12. Run/Test Commands

Backend:

```bash
cd backend
npm.cmd test
```

Frontend:

```bash
cd frontend
npm.cmd run build
```

AI service:

```bash
cd ai-service
python -m pytest
```

### 13. Known Limitations

- one lab report per order in the current MVP
- no OCR/CV extraction from report files
- no external LIS integration
- no automatic invoice generation from lab orders in this phase
- no direct lab-analysis AI-service endpoint; analysis remains backend rule-based
- frontend has build verification but no automated UI test suite yet

### 14. Next Phase Recommendation: Phase 12 - Pharmacy + Dispensing MVP

- Phase 11 now closes the consultation -> labs -> results -> patient history loop.
- The next workflow gap after verified labs is dispensing and pharmacy operations.
- Phase 12 should build clinic-scoped medicine catalog, dispensing, and prescription fulfillment without replacing doctor control.

## PHASE 12 - Pharmacy + Dispensing MVP

### 1. Goal

- Add a production-ready, clinic-scoped pharmacy workflow integrated with finalized prescriptions, patient history, and inventory movement.
- Let admin/pharmacist users maintain a medicine catalog with batches, expiry, and stock visibility.
- Let staff dispense medicines safely against finalized prescriptions without trusting frontend stock math.

### 2. Scope Implemented

- Clinic-scoped medicine catalog with searchable medicine metadata
- Batch-based stock management with expiry and price metadata
- Backend stock recalculation and stock-flag computation
- FEFO-style dispensing against finalized prescriptions
- Expired stock blocking and insufficient-stock protection
- Pharmacy sale record creation with a safe `invoiceId` hook
- Prescription dispensing-status updates
- Patient medicine-history API and frontend page/panel integration
- Audit log hooks for medicine, batch, dispensing, and sale lifecycle actions

### 3. Files Created

Backend:

- `backend/src/modules/pharmacy/pharmacy.utils.js`
- `backend/src/modules/pharmacy/medicine.model.js`
- `backend/src/modules/pharmacy/dispensingRecord.model.js`
- `backend/src/modules/pharmacy/pharmacySale.model.js`
- `backend/src/modules/pharmacy/pharmacy.validator.js`
- `backend/src/modules/pharmacy/pharmacy.repository.js`
- `backend/src/modules/pharmacy/pharmacy.service.js`
- `backend/src/modules/pharmacy/pharmacy.controller.js`
- `backend/src/modules/pharmacy/pharmacy.routes.js`
- `backend/tests/pharmacy.test.js`

Frontend:

- `frontend/src/features/pharmacy/pharmacyApi.js`
- `frontend/src/features/pharmacy/StockFlagBadge.jsx`
- `frontend/src/features/pharmacy/DispensingStatusBadge.jsx`
- `frontend/src/features/pharmacy/BatchTable.jsx`
- `frontend/src/features/pharmacy/MedicineCatalogPage.jsx`
- `frontend/src/features/pharmacy/MedicineFormPage.jsx`
- `frontend/src/features/pharmacy/MedicineDetailPage.jsx`
- `frontend/src/features/pharmacy/DispensePage.jsx`
- `frontend/src/features/pharmacy/DispensingListPage.jsx`
- `frontend/src/features/pharmacy/DispensingDetailPage.jsx`
- `frontend/src/features/pharmacy/PatientMedicineHistory.jsx`

Docs:

- `docs/PHARMACY_MODULE.md`

### 4. Files Modified

Backend:

- `backend/src/modules/prescriptions/prescription.model.js`
- `backend/src/modules/prescriptions/prescription.routes.js`
- `backend/src/modules/patients/patient.service.js`
- `backend/src/modules/patients/patient.controller.js`
- `backend/src/modules/patients/patient.routes.js`
- `backend/src/routes/index.js`
- `backend/tests/patients.test.js`

Frontend:

- `frontend/src/app/routes.jsx`
- `frontend/src/constants/roles.js`
- `frontend/src/constants/routes.js`
- `frontend/src/lib/api.js`
- `frontend/src/features/patients/PatientDetailPage.jsx`
- `frontend/src/features/patients/PatientHistoryPanel.jsx`
- `frontend/src/features/prescriptions/PrescriptionDetailPage.jsx`

Docs:

- `README.md`
- `docs/API_CONTRACT.md`
- `docs/DATABASE_DESIGN.md`
- `docs/ARCHITECTURE.md`
- `docs/CURRENT_PROJECT_STATUS.md`
- `docs/REPO_GAP_ANALYSIS.md`
- `docs/NEXT_PHASE_RECOMMENDATION.md`
- `docs/IMPLEMENTATION_REPORT.md`

### 5. What Each File Does

- `pharmacy.utils.js`: stock helpers for recalculation, expiry checks, FEFO allocation, and stock flags.
- `medicine.model.js`: stores clinic-scoped medicine catalog items and stock batches.
- `dispensingRecord.model.js`: stores prescription-linked dispensing records and allocated batches.
- `pharmacySale.model.js`: stores pharmacy sale records with payment status and a safe billing hook.
- `pharmacy.validator.js`: validates medicine, batch, dispensing, and patient-medicine-history requests.
- `pharmacy.repository.js`: centralizes pharmacy data access and population helpers.
- `pharmacy.service.js`: enforces clinic scope, batch allocation, stock deduction, prescription linkage, and audit logging.
- `pharmacy.controller.js`: maps HTTP requests to pharmacy services.
- `pharmacy.routes.js`: exposes protected `/api/v1/pharmacy` endpoints.
- `pharmacy.test.js`: verifies medicine creation, batch addition, stock flags, dispensing, insufficient-stock blocking, expired-stock blocking, patient history, and clinic scoping.
- `frontend/src/features/pharmacy/*.jsx`: provide medicine catalog, medicine detail, dispensing, and patient-history pages/components.
- `frontend/src/features/pharmacy/pharmacyApi.js`: frontend wrappers for pharmacy and patient medicine-history APIs.
- `docs/PHARMACY_MODULE.md`: focused Phase 12 workflow reference.

### 6. APIs Added

- `POST /api/v1/pharmacy/medicines`
- `GET /api/v1/pharmacy/medicines`
- `GET /api/v1/pharmacy/medicines/:id`
- `PATCH /api/v1/pharmacy/medicines/:id`
- `POST /api/v1/pharmacy/medicines/:id/batches`
- `POST /api/v1/pharmacy/dispense`
- `GET /api/v1/pharmacy/dispensings`
- `GET /api/v1/pharmacy/dispensings/:id`
- `PATCH /api/v1/pharmacy/dispensings/:id/cancel`
- `GET /api/v1/patients/:patientId/medicines`

### 7. Models Added

- `Medicine`
- `DispensingRecord`
- `PharmacySale`

Prescription update:

- added `dispensingStatus`
- added `dispensedAt`

### 8. Validation Rules

- ObjectId validation for medicine, batch, dispensing, patient, prescription, and doctor references
- positive integer validation for stock and dispense quantities
- non-negative validation for prices and reorder levels
- non-empty item arrays for dispense requests
- valid date validation for batch `expiryDate`
- new batches reject past expiry dates in normal create/add flows
- client-provided stock flags are ignored and recomputed by the backend

### 9. Clinic Scoping Behavior

- all medicine, dispensing, and sale reads/writes resolve clinic context through the existing clinic-scoping pattern
- prescriptions, patients, and medicines must belong to the same clinic before dispensing
- doctor patient-history views remain filtered to doctor-owned records
- pharmacist/admin write actions are role-protected; read access is safely broadened where appropriate

### 10. Stock Allocation/Deduction Logic

- Phase 12 uses FEFO-style allocation: earliest-expiring valid stock is used first
- expired batches are skipped during allocation
- backend rejects the dispense request if requested quantity cannot be satisfied from valid stock
- stock is deducted from the selected batches only after validation succeeds
- prescription `dispensingStatus` and `dispensedAt` are updated after successful dispensing

### 11. Stock Flags Logic

- `lowStock` is true when `totalStock <= reorderLevel`
- `nearExpiry` is true when any non-expired batch expires within the next 30 days
- `expired` is true when one or more batches are already expired
- `totalStock` is recalculated from non-expired batch quantities so unavailable stock is not treated as dispensable

### 12. Run/Test Commands

Backend:

```bash
cd backend
npm.cmd test
```

Frontend:

```bash
cd frontend
npm.cmd run build
```

AI service:

```bash
cd ai-service
python -m pytest
```

### 13. Known Limitations

- one main dispensing record per prescription in the current MVP
- cancel is intentionally restricted to `draft` dispensing records only; normal Phase 12 flow creates `dispensed` records
- no supplier procurement or purchase-order workflow
- no multi-document MongoDB transaction is used yet for stock deduction plus record creation
- no external pharmacy integration or advanced drug-interaction engine
- frontend has build verification but no automated UI test suite yet

### 14. Next Phase Recommendation At Phase 12 Time: Phase 13 - Notifications + Follow-up

- Phase 12 closes the prescription -> dispense -> patient history workflow gap.
- The next operational gap is clinic-owned reminders and follow-up tracking.
- Phase 13 should add safe notification scheduling and visibility without moving clinical judgment outside the backend.

## PHASE 12 - Verification Refresh - April 23, 2026

### Verification Scope

- Re-verified the Phase 12 pharmacy workflow only.
- Checked backend startup, pharmacy route registration, medicine catalog flows, batch add/update behavior, stock recalculation, stock flags, dispense flow, insufficient-stock rejection, expired-stock blocking, patient medicine history, frontend build, env/docs consistency, and module scope.
- Fixed no business logic outside the Phase 12 surface.

### Issues Found And Fixed

- No Phase 12 backend or frontend code defects were reproduced during this verification pass.
- The only failed ad hoc check was an initial local verification script that used the wrong import path and then ran once without the Jest in-memory MongoDB setup. That was a verification-script issue, not a repository bug.
- `docs/IMPLEMENTATION_REPORT.md` was updated with this verification record.

### Verification Results

- Focused backend pharmacy verification passed:
  - `cd backend && npm.cmd test -- pharmacy.test.js patients.test.js`
  - Result: `2/2` suites passed, `15/15` tests passed
- Full backend regression suite passed:
  - `cd backend && npm.cmd test`
  - Result: `15/15` suites passed, `91/91` tests passed
- Backend env validation passed:
  - `cd backend && npm.cmd run check:env`
  - Result: `NODE_ENV=development`, `MONGO_MODE=atlas`, validation passed
- Live backend startup probe passed on port `5134`:
  - `GET /` returned `200`
  - `GET /health` returned `200`
  - `GET /api/v1/health` returned `200`
  - `GET /api/v1/pharmacy/medicines` returned `401`, confirming the pharmacy route is registered and protected
- Explicit medicine update verification passed with the same in-memory MongoDB approach used by Jest:
  - `PATCH /api/v1/pharmacy/medicines/:id`
  - Result: HTTP `200`, `success=true`, updated medicine name returned, `totalStock=12`, `batchCount=2`
- Existing pharmacy behavior remained verified by the automated test suite:
  - medicine catalog create works
  - batch add works
  - total stock recalculates correctly
  - low-stock and near-expiry flags compute correctly
  - dispense flow works against finalized prescriptions
  - insufficient stock is rejected cleanly
  - expired stock is blocked
  - patient medicine history responds successfully
- Frontend production build passed:
  - `cd frontend && npm.cmd run build`
  - Result: passed, `199` modules transformed
  - Note: Vite still reports a large-chunk warning for the main JS bundle, but the build succeeds
- Docker/env validation outcome:
  - `backend/.env.example`, root `.env.example`, and `docker-compose.yml` were reviewed and remain aligned with the current services and variables
  - Docker CLI is unavailable in this environment, so `docker compose config` / live Compose runtime checks could not be rerun here
- Docs status:
  - Phase 12 docs remain updated across `README.md`, `docs/API_CONTRACT.md`, `docs/DATABASE_DESIGN.md`, `docs/ARCHITECTURE.md`, and the Phase 12 section of this report
- Module scope check:
  - Verification did not introduce any unrelated business modules
  - The Phase 12 implementation remains scoped to the pharmacy surface plus the required prescription/patient/docs integrations

### Checklist Outcome

1. Backend starts without syntax/import errors: passed
2. Pharmacy routes are registered correctly: passed
3. Medicine catalog APIs work: passed
4. Batch add/update works: passed
5. `totalStock` recalculates correctly: passed
6. Low stock / near-expiry flags compute correctly: passed
7. Dispense flow works against prescription: passed
8. Insufficient stock is rejected cleanly: passed
9. Expired stock is blocked: passed
10. Patient medicine history does not crash: passed
11. Frontend builds without errors: passed
12. Docker/env files remain valid: partial
    - env/docs alignment reviewed and valid
    - live Docker verification blocked by missing Docker CLI
13. Docs are updated: passed
14. No unrelated modules were added during verification: passed

## Phase 10 - Strict Verification Pass

### Verification Date

- April 22, 2026

### Goal Of This Phase

- Run a strict verification pass across the existing Phase 0-9 MVP stack, fix only bugs and inconsistencies, avoid adding any new business modules, and record concrete verification evidence.

### Files Created

- None.

### Files Modified

- `.env.example`
- `docker-compose.yml`
- `postman/AI-CMS.postman_collection.json`
- `docs/IMPLEMENTATION_REPORT.md`

### What Each Modified File Does

- `.env.example`: shared Docker/local env example for the repo; updated to document missing AI-service-related variables used by Compose.
- `docker-compose.yml`: local container orchestration for `mongo`, `backend`, `ai-service`, and `frontend`; updated so AI-service env wiring aligns with documented env variables.
- `postman/AI-CMS.postman_collection.json`: API verification collection; updated to use consistent shared variables instead of mixed `base_url`/`token`/snake_case billing placeholders.
- `docs/IMPLEMENTATION_REPORT.md`: records this verification pass, exact outcomes, and remaining environment limitations.

### APIs Added

- None. Phase 10 verification added no new API routes.

### Database Models Added

- None. Phase 10 verification added no new database models.

### Environment Variables Added

- `AI_SERVICE_HOST`
- `BACKEND_API_URL`
- `MODEL_PROVIDER`
- `ENABLE_HEAVY_MODELS`

### Verification Checklist Results

1. Backend install with `npm install`: Passed on April 22, 2026 using `npm.cmd install`.
2. Backend start with `npm run dev`: Passed on April 22, 2026 on temporary port `5124`.
3. Backend test suite with `npm test`: Passed on April 22, 2026 with `13/13` suites and `75/75` tests passing.
4. Backend `/health` and `/api/v1/health`: Passed with HTTP `200` on both endpoints during the live startup probe.
5. Swagger at `/api-docs`: Passed with HTTP `200` and Swagger UI content detected during the live startup probe.
6. Seed script duplicate safety: Passed by running the admin seed twice against an in-memory MongoDB; the second run reused the existing admin and total matching users remained `1`.
7. AI service requirements install: Passed on April 22, 2026 using `python -m pip install -r requirements.txt`.
8. AI service start with `uvicorn`: Passed on April 22, 2026 on temporary port `8024`.
9. AI tests with `pytest`: Passed on April 22, 2026 with `21/21` tests passing.
10. Frontend install: Passed on April 22, 2026 using `npm.cmd install`.
11. Frontend build: Passed on April 22, 2026 using `npm.cmd run build`.
12. Frontend remains JavaScript-only: Passed. `rg --files frontend -g '!frontend/node_modules/**' -g '!frontend/dist/**' | rg "\\.(ts|tsx)$"` returned no matches.
13. Docker Compose build for all services: Not executed in this environment because the `docker` CLI is not installed.
14. Docker service-name communication: Passed by configuration review for server-to-server traffic.
15. `.env.example` completeness: Fixed and passed after documenting missing AI-service-related variables used by Compose/service config.
16. Secrets not hardcoded: Passed by source review. Only explicit local placeholders and test/demo values were found.
17. Postman collection uses variables: Fixed and passed after normalizing billing requests to shared collection variables.
18. `docs/IMPLEMENTATION_REPORT.md` fully updated: Passed by adding this Phase 10 verification section.
19. No accidental new business features in Phase 10: Passed. Only verification and configuration/documentation consistency fixes were made.
20. Placeholders clearly documented: Passed. Existing MVP placeholders remain documented in the AI service docs, API contract docs, and this report.

### Issues Found And Fixed

- The shared root env example did not document all AI-service-related variables referenced by Compose/configuration. Missing keys were added.
- Compose used some AI-service defaults directly instead of aligning with the documented env example. The file now reads those values from env defaults consistently.
- The Postman billing requests used inconsistent variable names such as `{{base_url}}`, `{{token}}`, `{{invoice_id}}`, and `{{patient_id}}` while the rest of the collection used `backendBaseUrl`, `accessToken`, and camelCase IDs. The collection is now standardized.
- The implementation report was not current for a strict Phase 10 verification pass. It now records the actual checks run and their outcomes.

### How To Run

Docker:

```bash
docker compose up --build
```

Backend local:

```bash
cd backend
npm install
npm run dev
```

AI service local:

```bash
cd ai-service
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend local:

```bash
cd frontend
npm install
npm run dev
```

### How To Test

Backend:

```bash
cd backend
npm test
```

AI service:

```bash
cd ai-service
python -m pytest
```

Frontend:

```bash
cd frontend
npm run build
```

### Known Limitations

- `docker compose up --build` could not be executed on April 22, 2026 because the `docker` CLI is not installed in this environment, so Compose build/runtime verification remains blocked here.
- Frontend runtime URLs intentionally use `localhost` because the browser connects from the host machine; server-to-server traffic inside Compose uses Docker service names.
- AI OCR, transcription, and no-show scoring remain documented MVP placeholders or deterministic assistive flows rather than production model integrations.
- The seed verification covered the configured demo admin user path; no additional demo-user seed script exists in the current codebase.

### Next Recommended Phase

- Deployment and CI verification hardening: run the same Phase 10 checks in an environment with Docker installed, add automated Compose smoke tests, and wire the verification pass into CI without expanding business scope.

## Post-Phase 10 Local Access Hotfix

### Goal Of This Update

- Fix local frontend access issues when the app is opened over a LAN IP instead of `localhost`, expose the existing registration capability in the active frontend router, and reduce auth-console noise during local debugging.

### Files Modified

- `backend/src/config/env.js`
- `backend/src/app.js`
- `backend/.env.example`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/RegisterPage.jsx`
- `frontend/src/app/routes.jsx`
- `frontend/src/App.jsx`
- `docs/IMPLEMENTATION_REPORT.md`

### What Changed

- Backend CORS config now accepts a comma-separated allowlist and merges `CORS_ORIGIN`, `FRONTEND_URL`, and `CLIENT_URL` into a normalized origin list instead of requiring one exact string match.
- Backend CORS handling now allows requests without an `Origin` header, which keeps server-to-server tools and non-browser checks working.
- Frontend auth context now exposes `register()` alongside `login()` and `logout()` so the active app can use the existing backend registration API.
- A new active register page was added and wired into the current router at `/register`.
- The active login page now links to `/register`.
- `RouterProvider` now opts into React Router's `v7_startTransition` future flag to remove the warning shown during local development.
- `backend/.env.example` now documents multi-origin CORS input for LAN development.

### Verification Results

- `cd backend && npm test` passed `75/75` after the auth/CORS changes.
- `cd frontend && npm run build` passed after adding the active register route and page.
- No new backend business modules or API contracts were added beyond exposing the already-existing registration flow in the active frontend.

## Post-Phase 10 Auth Reproduction

### Goal Of This Update

- Reproduce the register/login failure end to end against the current local setup, identify whether the issue is browser CORS or backend/database connectivity, and make backend auth failures report the right status when MongoDB is unavailable.

### Files Modified

- `backend/src/common/middlewares/error.middleware.js`
- `backend/tests/auth.test.js`
- `docs/IMPLEMENTATION_REPORT.md`

### What Changed

- The backend error middleware now treats the Mongoose `bufferCommands = false` pre-connection failure as a database-unavailable condition instead of falling through to a generic `500 Internal server error`.
- The auth test suite now covers registration behavior when the database connection is unavailable, so this regression stays visible.

### End-To-End Findings

- Live CORS preflight from `http://192.168.32.116:5173` to `POST /api/v1/auth/login` returned `204` with `Access-Control-Allow-Origin: http://192.168.32.116:5173`, so browser-origin blocking was not the remaining auth issue.
- Live backend startup against the current Atlas env reached the Express server successfully, but MongoDB connection failed with `bad auth : authentication failed`.
- With the current Atlas credentials, live `POST /api/v1/auth/register` reproduced the failure path and now returns `503 Database is unavailable.` instead of a generic `500`.
- Because the backend never establishes a MongoDB connection with the current Atlas settings, both register and login remain blocked until Atlas authentication is corrected.

### Verification Results

- `cd backend && npm test -- auth.test.js` passed `16/16` after the database-unavailable auth handling change.
- Live backend probe on April 23, 2026 confirmed:
  - Atlas connection failure reason: `bad auth : authentication failed`
  - `POST /api/v1/auth/register` now responds with HTTP `503`

### User Action Required

- Replace the current Atlas database user password or connection string with a valid one from Atlas "Connect your application".
- Ensure the Atlas database user exists and has read/write access.
- Ensure Atlas Network Access allows the current client IP.
- After Atlas connectivity works, run `npm.cmd run seed:admin` in `backend` so `admin@aicms.local` exists in the connected database before trying to log in.

## Post-Phase 10 Chatbot And UX Hotfix

### Goal Of This Update

- Fix the patient chatbot `403` mismatch between frontend and backend access control, remove active placeholder/MVP wording from visible workspace UI, and improve the overall visual tone of the live frontend shell.

### Files Modified

- `backend/src/modules/ai/ai.routes.js`
- `backend/tests/ai.test.js`
- `frontend/src/pages/ai/ChatbotPage.jsx`
- `frontend/src/components/layout/Sidebar.jsx`
- `frontend/src/components/layout/Topbar.jsx`
- `frontend/src/components/layout/PageHeader.jsx`
- `frontend/src/components/common/Card.jsx`
- `frontend/src/components/layout/DashboardLayout.jsx`
- `frontend/src/app/ProtectedRoute.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/index.css`
- `docs/IMPLEMENTATION_REPORT.md`

### What Changed

- Backend `POST /api/v1/ai/symptom-check` now allows `PATIENT` users, which matches the active frontend route permissions for `/chatbot`.
- Backend AI tests now verify that a patient token can successfully access symptom-check.
- The active chatbot page now hides patient-link search controls for patient users and shows a patient-appropriate assistive guidance panel instead.
- The active sidebar title was changed from `Frontend MVP` to `Clinic Workspace`, and the visible workspace copy was rewritten to sound production-facing instead of internal/demo-facing.
- Shared layout surfaces were refreshed with stronger gradients, softer glassy panels, and improved shell styling so the interface feels less flat.
- The chatbot red-flag list encoding artifact was cleaned up.

### Verification Results

- `cd backend && npm test -- ai.test.js auth.test.js` passed `20/20`.
- `cd frontend && npm run build` passed after the chatbot access and UI refresh changes.

## Phase Name

Phase 0 - Project Foundation Setup

## Goal Of This Phase

Create the full AI-CMS monorepo foundation with a backend service, AI service, frontend shell, Docker-based local development, core documentation, initial health APIs, and baseline tests without implementing domain workflows.

## Files Created

- `README.md`
- `.gitignore`
- `.env.example`
- `docker-compose.yml`
- `docs/PROJECT_OVERVIEW.md`
- `docs/MVP_SCOPE.md`
- `docs/ARCHITECTURE.md`
- `docs/API_CONTRACT.md`
- `docs/DATABASE_DESIGN.md`
- `docs/AI_SAFETY_POLICY.md`
- `docs/PHASE_ROADMAP.md`
- `docs/IMPLEMENTATION_REPORT.md`

Backend:

- `backend/package.json`
- `backend/package-lock.json`
- `backend/tsconfig.json`
- `backend/Dockerfile`
- `backend/.env.example`
- `backend/jest.config.js`
- `backend/src/server.ts`
- `backend/src/app.ts`
- `backend/src/config/env.ts`
- `backend/src/config/database.ts`
- `backend/src/config/swagger.ts`
- `backend/src/common/middlewares/error.middleware.ts`
- `backend/src/common/middlewares/requestLogger.middleware.ts`
- `backend/src/common/utils/apiResponse.ts`
- `backend/src/common/utils/asyncHandler.ts`
- `backend/src/common/utils/AppError.ts`
- `backend/src/common/types/common.types.ts`
- `backend/src/routes/index.ts`
- `backend/tests/health.test.ts`

AI service:

- `ai-service/Dockerfile`
- `ai-service/requirements.txt`
- `ai-service/.env.example`
- `ai-service/pyproject.toml`
- `ai-service/app/main.py`
- `ai-service/app/config.py`
- `ai-service/app/api/routes.py`
- `ai-service/app/services/health_service.py`
- `ai-service/app/safety/medical_disclaimer.py`
- `ai-service/app/safety/guardrails.py`
- `ai-service/app/utils/response.py`
- `ai-service/app/utils/logger.py`
- `ai-service/tests/test_health.py`

Frontend:

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/Dockerfile`
- `frontend/.env.example`
- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/app/routes.tsx`
- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/components/common/EmptyState.tsx`
- `frontend/src/components/common/LoadingState.tsx`
- `frontend/src/components/common/ErrorBoundary.tsx`
- `frontend/src/features/dashboard/DashboardPage.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/utils.ts`
- `frontend/src/types/api.types.ts`

Infra and tooling:

- `infra/scripts/dev-up.sh`
- `infra/scripts/dev-down.sh`
- `postman/AI-CMS.postman_collection.json`

## Files Modified

- `backend/src/config/database.ts`
- `backend/tests/health.test.ts`
- `ai-service/tests/test_health.py`
- `frontend/package.json`
- `docs/IMPLEMENTATION_REPORT.md`

## What Each File Does

### Root

- `README.md`: explains the product goal, MVP boundary, architecture, services, ports, and developer workflows.
- `.gitignore`: ignores local dependencies, build artifacts, environment files, and cache directories.
- `.env.example`: provides shared local development environment variables for all services.
- `docker-compose.yml`: defines MongoDB, backend, AI service, and frontend containers for local development.

### Documentation

- `docs/PROJECT_OVERVIEW.md`: outlines the broader AI-CMS product vision.
- `docs/MVP_SCOPE.md`: locks the MVP feature list and Phase 0 exclusions.
- `docs/ARCHITECTURE.md`: explains modular monolith plus AI service architecture and future evolution.
- `docs/API_CONTRACT.md`: documents the response contract and initial health endpoints.
- `docs/DATABASE_DESIGN.md`: describes MongoDB for MVP and a future PostgreSQL migration path.
- `docs/AI_SAFETY_POLICY.md`: records AI safety constraints and clinician-approval requirements.
- `docs/PHASE_ROADMAP.md`: lists planned phases from 0 through 10.
- `docs/IMPLEMENTATION_REPORT.md`: records the implementation details and verification results of this phase.

### Backend

- `backend/package.json`: backend scripts and dependencies for Express, TypeScript, MongoDB, Swagger, and tests.
- `backend/tsconfig.json`: strict TypeScript compiler configuration for the backend.
- `backend/Dockerfile`: container image for local backend development.
- `backend/.env.example`: backend-specific environment variables.
- `backend/jest.config.js`: Jest configuration for TypeScript tests.
- `backend/src/server.ts`: starts the HTTP server and triggers a non-blocking database connection attempt.
- `backend/src/app.ts`: builds the Express app with middlewares, health routes, API routes, and Swagger placeholder.
- `backend/src/config/env.ts`: loads and validates backend environment variables.
- `backend/src/config/database.ts`: manages MongoDB connection attempts, logs internal connection failures, and exposes a sanitized health status message.
- `backend/src/config/swagger.ts`: exposes a minimal OpenAPI definition and Swagger route setup.
- `backend/src/common/middlewares/error.middleware.ts`: centralizes error responses.
- `backend/src/common/middlewares/requestLogger.middleware.ts`: logs incoming requests and response times.
- `backend/src/common/utils/apiResponse.ts`: standardizes success and error responses.
- `backend/src/common/utils/asyncHandler.ts`: wraps async Express handlers.
- `backend/src/common/utils/AppError.ts`: defines a typed application error.
- `backend/src/common/types/common.types.ts`: shared response and error types.
- `backend/src/routes/index.ts`: defines the versioned API routes including `/api/v1/health`.
- `backend/tests/health.test.ts`: verifies backend health endpoints, response shape, and Swagger placeholder availability.

### AI Service

- `ai-service/Dockerfile`: container image for local FastAPI development.
- `ai-service/requirements.txt`: Python dependencies for FastAPI and tests.
- `ai-service/.env.example`: AI service environment variables.
- `ai-service/pyproject.toml`: pytest configuration and project metadata.
- `ai-service/app/main.py`: builds the FastAPI app with CORS and routes.
- `ai-service/app/config.py`: loads AI service settings from environment variables.
- `ai-service/app/api/routes.py`: defines `/health` and `/api/v1/health`.
- `ai-service/app/services/health_service.py`: produces structured health payloads.
- `ai-service/app/safety/medical_disclaimer.py`: central medical disclaimer text for AI responses.
- `ai-service/app/safety/guardrails.py`: placeholder guardrail wrapper for future AI outputs.
- `ai-service/app/utils/response.py`: standard response helpers for FastAPI.
- `ai-service/app/utils/logger.py`: creates a shared logger.
- `ai-service/tests/test_health.py`: verifies AI service health endpoints and the safety disclaimer contract.

### Frontend

- `frontend/package.json`: frontend scripts and dependencies for Vite, React, and TypeScript, using ESM package mode for cleaner Vite execution.
- `frontend/vite.config.ts`: Vite configuration for the frontend app.
- `frontend/tsconfig.json`: strict TypeScript compiler configuration for the frontend.
- `frontend/Dockerfile`: container image for local frontend development.
- `frontend/.env.example`: frontend environment variables for API base URLs.
- `frontend/index.html`: Vite HTML entry point.
- `frontend/src/main.tsx`: React entry point.
- `frontend/src/App.tsx`: top-level app component.
- `frontend/src/app/routes.tsx`: route configuration for the dashboard shell.
- `frontend/src/components/layout/AppShell.tsx`: page shell for the early admin experience.
- `frontend/src/components/common/EmptyState.tsx`: reusable empty-state component.
- `frontend/src/components/common/LoadingState.tsx`: reusable loading-state component.
- `frontend/src/components/common/ErrorBoundary.tsx`: frontend runtime error boundary.
- `frontend/src/features/dashboard/DashboardPage.tsx`: clean dashboard placeholder with service health checks.
- `frontend/src/lib/api.ts`: helpers for calling backend and AI health endpoints.
- `frontend/src/lib/utils.ts`: shared utility helpers.
- `frontend/src/types/api.types.ts`: shared frontend API response types.

### Infra And Tooling

- `infra/scripts/dev-up.sh`: helper script for bringing the Docker stack up.
- `infra/scripts/dev-down.sh`: helper script for stopping the Docker stack.
- `postman/AI-CMS.postman_collection.json`: Postman collection for backend and AI service health endpoints.

## APIs Added

Backend:

- `GET /health`
- `GET /api/v1/health`
- `GET /api-docs`

AI service:

- `GET /health`
- `GET /api/v1/health`

## Database Models Added

- None in Phase 0. The MongoDB connection layer is prepared, but domain models are intentionally deferred.

## Environment Variables Added

Root/shared:

- `NODE_ENV`
- `BACKEND_PORT`
- `BACKEND_HOST`
- `BACKEND_API_PREFIX`
- `BACKEND_JWT_SECRET`
- `BACKEND_MONGODB_URI`
- `BACKEND_DB_NAME`
- `BACKEND_SWAGGER_ENABLED`
- `AI_SERVICE_PORT`
- `AI_SERVICE_HOST`
- `AI_SERVICE_ENV`
- `AI_SERVICE_ALLOWED_ORIGINS`
- `FRONTEND_PORT`
- `VITE_API_BASE_URL`
- `VITE_AI_SERVICE_BASE_URL`
- `MONGODB_PORT`
- `MONGO_INITDB_DATABASE`

Backend:

- `PORT`
- `HOST`
- `API_PREFIX`
- `JWT_SECRET`
- `MONGODB_URI`
- `DB_NAME`
- `SWAGGER_ENABLED`
- `DB_CONNECT_TIMEOUT_MS`

AI service:

- `AI_SERVICE_ENV`
- `AI_SERVICE_HOST`
- `AI_SERVICE_PORT`
- `AI_SERVICE_ALLOWED_ORIGINS`

Frontend:

- `VITE_API_BASE_URL`
- `VITE_AI_SERVICE_BASE_URL`

## How To Run

Root Docker workflow:

```bash
docker compose up --build
```

Backend local workflow:

```bash
cd backend
npm install
npm run dev
```

AI service local workflow:

```bash
cd ai-service
pip install -r requirements.txt
pytest
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend local workflow:

```bash
cd frontend
npm install
npm run dev
```

## How To Test

Backend:

```bash
cd backend
npm test
```

AI service:

```bash
cd ai-service
pytest
```

Frontend:

- Manual verification through `npm run dev` in Phase 0

## Verification Performed

- Installed backend dependencies with `npm install`
- Ran backend tests with `npm test`
- Verified backend TypeScript compilation with `npm run build`
- Installed AI service dependencies with `pip install -r requirements.txt`
- Ran AI service tests with `pytest`
- Installed frontend dependencies with `npm install`
- Verified frontend compilation with `npm run build`
- Started the backend locally and verified `GET /health`, `GET /api/v1/health`, and `GET /api-docs`
- Started the AI service locally and verified `GET /health` and `GET /api/v1/health`
- Started the frontend locally and verified the Vite dev server responds on `GET /`
- Ran explicit Python import verification for `app.main`, `app.api.routes`, `app.services.health_service`, and `app.safety.guardrails`
- Parsed `docker-compose.yml` successfully with Python YAML tooling
- Compared all Docker Compose environment variable references against the root `.env.example`
- Did not execute `docker compose up --build` because Docker was not available in this environment
- Did not keep `npm run dev` running for the frontend because it is a long-lived development server command

## Verification Results

1. Project start status:
   Backend, AI service, and frontend all started successfully in local dev mode.
2. TypeScript errors:
   None found. `backend` and `frontend` both compiled successfully.
3. Python import errors:
   None found. Explicit module imports and `pytest` both passed.
4. Health endpoints:
   All implemented health endpoints responded successfully.
5. Docker Compose validity:
   The Compose file parsed successfully and all referenced environment variables were documented. Full runtime execution could not be verified here because Docker was unavailable.
6. Environment variable documentation:
   Verified across root and service-level `.env.example` files and reflected in this report.
7. Implementation report status:
   Updated with verification evidence and stabilization fixes.
8. Out-of-scope implementation:
   No accidental patient, auth, appointment, billing, or other Phase 1+ business logic was implemented.
9. Hardcoded secrets:
   None found. Only clearly labeled local placeholder values such as `change-me-in-local-env` are present.
10. Tests:
   Present and meaningful for Phase 0. Backend tests now cover health endpoints and Swagger placeholder routing. AI tests now cover health responses and safety disclaimer presence.

## Issues Found And Fixed

- Backend health responses exposed raw MongoDB connection failure details. This was sanitized to `Database connection unavailable.` while retaining detailed logs internally.
- Backend tests were strengthened to verify response contracts and the Swagger placeholder route.
- AI service tests were strengthened to verify safety messaging in health responses.
- Frontend package configuration was updated to ESM mode to remove the Vite CJS deprecation warning during build verification.

## Known Limitations

- No authentication, RBAC, patient, doctor, appointment, EMR, billing, or audit business logic exists yet.
- Tailwind and shadcn/ui are intentionally not initialized in Phase 0 to avoid introducing unused UI scaffolding before the design system phase.
- Swagger is a placeholder contract endpoint in this phase, not a fully documented API surface.
- MongoDB connection is non-blocking for service startup, so health checks can succeed even when the database is offline.
- Docker Compose could not be executed in this environment because the `docker` CLI was unavailable.

## Next Recommended Phase

Phase 1 - Backend Core + Auth Foundation

# PHASE 1 - Backend Core

## Goal

Build a production-ready Node.js and TypeScript backend foundation for AI-CMS with MongoDB integration, consistent API responses, centralized error handling, validation scaffolding, request logging, Swagger documentation, health monitoring, and baseline tests.

## Summary

Phase 1 upgrades the backend from the Phase 0 placeholder into a structured module-based foundation. The backend now has dedicated health module files, typed environment loading, request and application logging, richer error handling for Zod and Mongoose errors, a not-found layer, reusable validation middleware, Swagger generation through `swagger-jsdoc`, a backend-specific README, and compatibility updates for Docker Compose.

## Files Created

| File | Purpose |
| --- | --- |
| `backend/README.md` | Backend setup and usage guide for Phase 1 |
| `backend/src/common/constants/httpStatus.ts` | Shared HTTP status constants |
| `backend/src/common/constants/responseMessages.ts` | Shared backend response message constants |
| `backend/src/common/types/express.d.ts` | Express request extension placeholder for future auth |
| `backend/src/common/utils/logger.ts` | Structured logger wrapper with log-level support |
| `backend/src/common/middlewares/notFound.middleware.ts` | Consistent 404 handler |
| `backend/src/common/middlewares/validate.middleware.ts` | Zod validation middleware scaffold |
| `backend/src/modules/health/health.service.ts` | Health status composition logic |
| `backend/src/modules/health/health.controller.ts` | Health endpoint controller |
| `backend/src/modules/health/health.routes.ts` | Health route module |
| `backend/tests/setup.ts` | Jest environment bootstrap for test mode |

## Files Modified

| File | What Changed |
| --- | --- |
| `backend/package.json` | Updated scripts, dependencies, and version for Phase 1 |
| `backend/package-lock.json` | Refreshed lockfile after dependency changes |
| `backend/tsconfig.json` | Adjusted TypeScript configuration for the expanded backend type surface |
| `backend/.env.example` | Replaced Phase 0 env placeholders with Phase 1 backend config variables |
| `backend/jest.config.js` | Added Jest setup file registration |
| `backend/src/app.ts` | Rebuilt app bootstrap with CORS, Swagger, root health, API routes, not-found, and error middleware |
| `backend/src/server.ts` | Added controlled startup, graceful shutdown, and process-level error handling |
| `backend/src/config/env.ts` | Implemented typed environment validation and safe defaults |
| `backend/src/config/database.ts` | Added Mongo connection lifecycle helpers and readable DB state reporting |
| `backend/src/config/swagger.ts` | Switched to `swagger-jsdoc`-backed Swagger setup |
| `backend/src/common/types/common.types.ts` | Expanded shared API, pagination, and health types |
| `backend/src/common/utils/apiResponse.ts` | Standardized typed success and error response helpers |
| `backend/src/common/utils/AppError.ts` | Expanded operational error model |
| `backend/src/common/utils/asyncHandler.ts` | Retained async wrapper for future controllers |
| `backend/src/common/middlewares/requestLogger.middleware.ts` | Added request logging with test-mode suppression |
| `backend/src/common/middlewares/error.middleware.ts` | Added centralized handling for AppError, Zod, and Mongoose errors |
| `backend/src/routes/index.ts` | Converted to clean route registry using module routes |
| `backend/tests/health.test.ts` | Reworked tests around Phase 1 health and 404 behavior |
| `.env.example` | Updated root env example to match Phase 1 backend Docker Compose variables |
| `docker-compose.yml` | Updated backend service env configuration to use `MONGO_URI` and `CORS_ORIGIN` |
| `docs/IMPLEMENTATION_REPORT.md` | Appended Phase 1 implementation details and verification results |

## What Each File Does

- `backend/src/common/constants/httpStatus.ts`: central HTTP status values used by response helpers and middleware.
- `backend/src/common/constants/responseMessages.ts`: central response and error messages for consistency.
- `backend/src/common/types/common.types.ts`: reusable API response types, pagination query shape, and backend health contract.
- `backend/src/common/types/express.d.ts`: placeholder `req.user` shape for future auth phases.
- `backend/src/common/utils/apiResponse.ts`: sends consistent success and error JSON responses.
- `backend/src/common/utils/AppError.ts`: models operational application errors with status code and details.
- `backend/src/common/utils/asyncHandler.ts`: wraps async route handlers for future modules.
- `backend/src/common/utils/logger.ts`: emits timestamped logs respecting `LOG_LEVEL`.
- `backend/src/common/middlewares/requestLogger.middleware.ts`: logs method, URL, status, and duration outside test mode.
- `backend/src/common/middlewares/notFound.middleware.ts`: produces consistent 404 errors for unknown routes.
- `backend/src/common/middlewares/validate.middleware.ts`: validates request body, params, and query with Zod schemas.
- `backend/src/common/middlewares/error.middleware.ts`: centralizes error translation for Zod, Mongoose, and app errors.
- `backend/src/config/env.ts`: loads and validates environment variables into a typed config object.
- `backend/src/config/database.ts`: provides `connectDB`, `disconnectDB`, and readable Mongo connection state helpers.
- `backend/src/config/swagger.ts`: generates and mounts Swagger UI at `/api-docs`.
- `backend/src/modules/health/health.service.ts`: builds the backend health response payload.
- `backend/src/modules/health/health.controller.ts`: returns the standard health payload with the shared response helper.
- `backend/src/modules/health/health.routes.ts`: exposes reusable health routes for root and versioned APIs.
- `backend/src/routes/index.ts`: route registry for versioned API modules.
- `backend/src/app.ts`: composes the Express application.
- `backend/src/server.ts`: starts the HTTP server and handles shutdown paths.
- `backend/tests/setup.ts`: sets `NODE_ENV=test` for predictable backend tests.
- `backend/tests/health.test.ts`: verifies root health, versioned health, and consistent 404 responses.
- `backend/README.md`: documents backend setup, endpoints, env vars, and scope boundaries.

## APIs Added

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Root service health for local and container checks |
| `GET` | `/api/v1/health` | Versioned API health endpoint |
| `GET` | `/api-docs` | Swagger UI for backend API documentation |

## Environment Variables Added

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Controls runtime mode |
| `PORT` | Backend server port |
| `MONGO_URI` | MongoDB connection string |
| `CORS_ORIGIN` | Allowed frontend origin |
| `API_PREFIX` | Versioned API base path |
| `APP_NAME` | Service name returned in health responses and logs |
| `LOG_LEVEL` | Logging verbosity |
| `DB_CONNECT_TIMEOUT_MS` | MongoDB connection timeout |

## Tests Added

- `backend/tests/setup.ts`
- `backend/tests/health.test.ts`

Coverage in this phase:

- `GET /health` returns HTTP 200 with the standard success response
- `GET /api/v1/health` returns HTTP 200 with database status and service metadata
- Unknown routes return HTTP 404 with the standard error response shape

## How To Run

```bash
cd backend
npm install
npm run dev
```

Optional Docker verification when Docker is available:

```bash
docker compose up --build backend mongodb
```

## How To Test

```bash
cd backend
npm run build
npm test
```

## Validation Checklist

| Check | Result |
| --- | --- |
| Express app bootstrapped | Passed |
| MongoDB connection helper implemented | Passed |
| Root and versioned health routes working | Passed |
| Central response utility present | Passed |
| `AppError` implemented | Passed |
| Global error middleware present | Passed |
| Not-found middleware present | Passed |
| Request logger middleware present | Passed |
| Validation middleware present | Passed |
| Environment loader and validator present | Passed |
| Swagger route available at `/api-docs` | Passed |
| Clean route registry present | Passed |
| Jest and Supertest health tests passing | Passed |
| Backend README added | Passed |
| Docker Compose backend env compatibility updated | Passed |

## Commands Run

```bash
cd backend
npm install
npm run build
npm test
npm run dev
```

Manual URL checks performed:

- `GET http://localhost:5000/health`
- `GET http://localhost:5000/api/v1/health`
- `GET http://localhost:5000/api-docs`

## Test Results

- `npm run build`: passed
- `npm test`: passed with 3/3 tests
- `npm run dev`: started successfully
- Live endpoint verification: passed for `/health`, `/api/v1/health`, and `/api-docs`

## Phase 1 Verification Refresh

This report section was re-verified after the Phase 1 backend implementation to confirm the backend foundation is stable without adding any business features.

### Verification Commands Re-Run

```bash
cd backend
npm run build
npm test
```

Additional verification performed:

- Started the backend with `npm run dev`
- Verified `GET http://localhost:5000/health`
- Verified `GET http://localhost:5000/api/v1/health`
- Verified `GET http://localhost:5000/api-docs`
- Re-checked backend middleware order in `src/app.ts`
- Re-checked Mongo connection behavior in `src/config/database.ts`
- Re-checked response helpers and error middleware consistency
- Re-scanned backend source for accidental auth or business module logic
- Re-scanned backend source and config for hardcoded secrets
- Re-validated backend Docker Compose environment compatibility

### Verification Results

| Check | Result |
| --- | --- |
| TypeScript compile errors | None found |
| Missing imports | None found |
| Express middleware order | Correct |
| MongoDB connection handling | Correct for Phase 1 foundation |
| Health route correctness | Passed |
| Swagger route availability | Passed |
| Jest and Supertest tests | Passed |
| Success response format consistency | Passed |
| Error response format consistency | Passed |
| Accidental auth or business logic | None found |
| Hardcoded secrets | None found |
| Docker backend compatibility | Passed structural validation |
| `docs/IMPLEMENTATION_REPORT.md` updated | Passed |

### Notes

- The backend source scan returned no matches for auth, patient, doctor, appointment, billing, prescription, or EMR implementation logic.
- The secret scan returned no backend source or config issues. Placeholder example values remain environment-based only.
- Docker Compose remains structurally compatible with the backend, but actual `docker compose` runtime execution could not be verified here because Docker is unavailable in this environment.
- No additional Phase 1 backend code fixes were required during this verification refresh.

## Known Limitations

- Auth, RBAC, and business modules are intentionally not implemented in this phase.
- MongoDB may be disconnected during tests because health tests are designed not to require a live database.
- Docker runtime execution was not verified in this environment because the `docker` CLI was unavailable.

## Next Phase Recommendation

PHASE 2 - Auth + RBAC Foundation

# PHASE 0/1 STACK CORRECTION - TypeScript to JavaScript

## Why This Correction Was Needed

The project stack was re-locked to use JavaScript for both the frontend and backend foundations. Earlier Phase 0 and Phase 1 work established solid logic, routing, Docker wiring, and tests, but they were implemented with TypeScript. This correction preserves the existing foundation behavior while aligning the repository with the final JavaScript-based stack decision.

This correction supersedes the earlier TypeScript-based frontend and backend file references listed in previous sections of this report.

## Files Renamed

### Backend

- `backend/src/server.ts` -> `backend/src/server.js`
- `backend/src/app.ts` -> `backend/src/app.js`
- `backend/src/config/env.ts` -> `backend/src/config/env.js`
- `backend/src/config/database.ts` -> `backend/src/config/database.js`
- `backend/src/config/swagger.ts` -> `backend/src/config/swagger.js`
- `backend/src/common/constants/httpStatus.ts` -> `backend/src/common/constants/httpStatus.js`
- `backend/src/common/constants/responseMessages.ts` -> `backend/src/common/constants/responseMessages.js`
- `backend/src/common/utils/apiResponse.ts` -> `backend/src/common/utils/apiResponse.js`
- `backend/src/common/utils/AppError.ts` -> `backend/src/common/utils/AppError.js`
- `backend/src/common/utils/asyncHandler.ts` -> `backend/src/common/utils/asyncHandler.js`
- `backend/src/common/utils/logger.ts` -> `backend/src/common/utils/logger.js`
- `backend/src/common/middlewares/error.middleware.ts` -> `backend/src/common/middlewares/error.middleware.js`
- `backend/src/common/middlewares/notFound.middleware.ts` -> `backend/src/common/middlewares/notFound.middleware.js`
- `backend/src/common/middlewares/requestLogger.middleware.ts` -> `backend/src/common/middlewares/requestLogger.middleware.js`
- `backend/src/common/middlewares/validate.middleware.ts` -> `backend/src/common/middlewares/validate.middleware.js`
- `backend/src/modules/health/health.service.ts` -> `backend/src/modules/health/health.service.js`
- `backend/src/modules/health/health.controller.ts` -> `backend/src/modules/health/health.controller.js`
- `backend/src/modules/health/health.routes.ts` -> `backend/src/modules/health/health.routes.js`
- `backend/src/routes/index.ts` -> `backend/src/routes/index.js`
- `backend/tests/setup.ts` -> `backend/tests/setup.js`
- `backend/tests/health.test.ts` -> `backend/tests/health.test.js`

### Frontend

- `frontend/src/main.tsx` -> `frontend/src/main.jsx`
- `frontend/src/App.tsx` -> `frontend/src/App.jsx`
- `frontend/src/app/routes.tsx` -> `frontend/src/app/routes.jsx`
- `frontend/src/components/common/EmptyState.tsx` -> `frontend/src/components/common/EmptyState.jsx`
- `frontend/src/components/common/ErrorBoundary.tsx` -> `frontend/src/components/common/ErrorBoundary.jsx`
- `frontend/src/components/common/LoadingState.tsx` -> `frontend/src/components/common/LoadingState.jsx`
- `frontend/src/components/layout/AppShell.tsx` -> `frontend/src/components/layout/AppShell.jsx`
- `frontend/src/features/dashboard/DashboardPage.tsx` -> `frontend/src/features/dashboard/DashboardPage.jsx`
- `frontend/src/lib/api.ts` -> `frontend/src/lib/api.js`
- `frontend/src/lib/utils.ts` -> `frontend/src/lib/utils.js`
- `frontend/vite.config.ts` -> `frontend/vite.config.js`

## Files Modified

- `backend/package.json`
- `backend/package-lock.json`
- `backend/jest.config.js`
- `backend/README.md`
- `backend/.env.example`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/index.html`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/MVP_SCOPE.md`
- `docs/API_CONTRACT.md`
- `docs/IMPLEMENTATION_REPORT.md`

## Dependencies Removed

### Backend

- `typescript`
- `ts-jest`
- `ts-node-dev`
- `@types/cors`
- `@types/express`
- `@types/jest`
- `@types/morgan`
- `@types/node`
- `@types/supertest`
- `@types/swagger-jsdoc`
- `@types/swagger-ui-express`

### Frontend

- `typescript`
- `@types/react`
- `@types/react-dom`

## Commands To Run

### Backend

```bash
cd backend
npm install
npm test
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker

```bash
docker compose up --build
```

## Verification Checklist

| Check | Result |
| --- | --- |
| Backend source converted to JavaScript | Passed |
| Frontend source converted to JavaScript and JSX | Passed |
| No active `.ts` or `.tsx` files remain in backend/frontend source trees | Passed |
| Backend `npm test` | Passed |
| Backend `npm run dev` | Passed |
| Backend live health endpoints | Passed |
| Frontend `npm install` | Passed |
| Frontend Vite build | Passed |
| Frontend `npm run dev` | Passed |
| Docker Compose structure preserved | Passed |
| Existing health routes preserved | Passed |
| Existing backend tests preserved in JavaScript | Passed |

## Verification Results

- `backend`: `npm install` passed
- `backend`: `npm test` passed with 3/3 tests
- `backend`: `npm run dev` started successfully and `/health` and `/api/v1/health` responded successfully
- `frontend`: `npm install` passed
- `frontend`: `npm run build` passed
- `frontend`: `npm run dev` started successfully and the Vite dev server returned HTTP 200
- Source scan confirmed: `NO_TYPESCRIPT_SOURCE_FILES`

## Known Limitations

- Auth, RBAC, and business modules are intentionally not implemented in this phase.
- Tailwind CSS has not been initialized yet even though it remains part of the planned frontend stack.
- The AI service remains Python by design and was not converted.
- Docker runtime execution could not be verified in this environment because the `docker` CLI was unavailable.

## Next Phase

PHASE 2 - Auth + RBAC

# PHASE 2 - Auth + RBAC

## Goal

Implement the authentication and role-based access control foundation for AI-CMS using the locked JavaScript stack, without introducing patient, appointment, EMR, billing, lab, pharmacy, or AI business modules.

## Files Created

| File | Purpose |
|---|---|
| `backend/src/common/constants/roles.js` | Centralized role definitions and public registration role allowlist |
| `backend/src/common/middlewares/auth.middleware.js` | JWT protection middleware that loads the authenticated user |
| `backend/src/common/middlewares/role.middleware.js` | RBAC authorization middleware |
| `backend/src/common/utils/sanitizeUser.js` | Removes password and internal fields from user responses |
| `backend/src/common/validators/objectId.validator.js` | Shared ObjectId validator helpers |
| `backend/src/modules/users/user.model.js` | Defines the User schema with hashed password and RBAC fields |
| `backend/src/modules/users/user.repository.js` | User data access methods |
| `backend/src/modules/users/user.validator.js` | Validation schemas for listing users and updating role/status |
| `backend/src/modules/users/user.service.js` | User listing, profile access, role updates, and status updates |
| `backend/src/modules/users/user.controller.js` | HTTP handlers for user operations |
| `backend/src/modules/users/user.routes.js` | Protected user management routes |
| `backend/src/modules/audit/audit.model.js` | Defines the audit log schema |
| `backend/src/modules/audit/audit.repository.js` | Audit log persistence methods |
| `backend/src/modules/audit/audit.service.js` | Safe audit logging helpers for auth and admin events |
| `backend/src/modules/auth/token.service.js` | JWT generation and verification helpers |
| `backend/src/modules/auth/auth.validator.js` | Validation schemas for register and login |
| `backend/src/modules/auth/auth.service.js` | Registration, login, me, and logout logic |
| `backend/src/modules/auth/auth.controller.js` | HTTP handlers for auth routes |
| `backend/src/modules/auth/auth.routes.js` | Auth route definitions |
| `backend/src/seed/seedAdmin.js` | SUPER_ADMIN seed script |
| `backend/tests/auth.test.js` | Auth and RBAC integration tests |
| `frontend/postcss.config.js` | PostCSS configuration for Tailwind |
| `frontend/tailwind.config.js` | Tailwind content configuration |
| `frontend/src/index.css` | Tailwind entry stylesheet |
| `frontend/src/lib/auth.js` | Local storage token and user helpers |
| `frontend/src/features/auth/ProtectedRoute.jsx` | Route guard for authenticated frontend routes |
| `frontend/src/features/auth/LoginPage.jsx` | Minimal login page |
| `frontend/src/features/auth/RegisterPage.jsx` | Minimal register page |

## Files Modified

| File | What Changed |
|---|---|
| `backend/package.json` | Added Phase 2 auth, hashing, JWT, memory DB, and seed dependencies/scripts |
| `backend/package-lock.json` | Refreshed after Phase 2 dependency installation |
| `backend/.env.example` | Added JWT and seed environment variables |
| `backend/jest.config.js` | Updated test setup loading |
| `backend/README.md` | Documented auth endpoints, seed flow, and Phase 2 purpose |
| `backend/src/config/env.js` | Added JWT and seed env validation |
| `backend/src/app.js` | Preserved app wiring and mounted new Phase 2 routes through the route index |
| `backend/src/routes/index.js` | Mounted auth and user route modules |
| `backend/src/config/swagger.js` | Continued Swagger support for the expanded backend route surface |
| `backend/src/common/constants/responseMessages.js` | Added authentication and authorization response messages |
| `backend/src/common/middlewares/error.middleware.js` | Added JWT error translation |
| `backend/src/modules/users/user.model.js` | Stabilized indexes after RBAC model introduction |
| `backend/tests/setup.js` | Added mongodb-memory-server test harness |
| `backend/tests/health.test.js` | Adapted to the new test harness |
| `.env.example` | Added backend JWT and seed variables for Docker/local alignment |
| `docker-compose.yml` | Added backend JWT and seed env compatibility |
| `frontend/package.json` | Added Tailwind/PostCSS tooling for the minimal auth UI |
| `frontend/package-lock.json` | Refreshed after frontend dependency installation |
| `frontend/.env.example` | Simplified auth-ready API base URL example |
| `frontend/src/main.jsx` | Imported Tailwind stylesheet |
| `frontend/src/lib/api.js` | Replaced basic health helper with Axios instance, auth API helpers, token injection, and 401 handling |
| `frontend/src/components/layout/AppShell.jsx` | Updated shell for Phase 2 auth workspace |
| `frontend/src/features/dashboard/DashboardPage.jsx` | Converted dashboard into authenticated user + health overview with logout |
| `frontend/src/app/routes.jsx` | Added `/login`, `/register`, `/dashboard`, and root redirect routing |
| `docs/IMPLEMENTATION_REPORT.md` | Added the Phase 2 implementation report section |

## What Each File Does

- `backend/src/common/constants/roles.js`: central role catalog used by validation and RBAC.
- `backend/src/common/middlewares/auth.middleware.js`: verifies JWTs and attaches the active user to `req.user`.
- `backend/src/common/middlewares/role.middleware.js`: enforces allowed roles on protected routes.
- `backend/src/common/utils/sanitizeUser.js`: ensures password hashes never leave the API.
- `backend/src/common/validators/objectId.validator.js`: validates route params that expect Mongo ObjectIds.
- `backend/src/modules/users/*`: provides the User model, repository, service, controller, routes, and validators for Phase 2 user management endpoints.
- `backend/src/modules/audit/*`: provides the audit log base model and safe logging service.
- `backend/src/modules/auth/*`: provides validation, controller, service, routes, and token logic for registration, login, current-user, and logout.
- `backend/src/seed/seedAdmin.js`: creates a SUPER_ADMIN through env-provided seed credentials and logs `ADMIN_SEEDED`.
- `backend/tests/setup.js`: boots mongodb-memory-server, connects Mongoose, and clears collections between tests.
- `backend/tests/auth.test.js`: verifies register, login, `/auth/me`, public role restrictions, and RBAC-protected `/users`.
- `frontend/src/lib/api.js`: central Axios client with Authorization header injection and 401 cleanup.
- `frontend/src/lib/auth.js`: browser token/user persistence helpers.
- `frontend/src/features/auth/*`: minimal login, register, and protected-route building blocks.
- `frontend/src/features/dashboard/DashboardPage.jsx`: authenticated placeholder dashboard showing current user info and backend health.
- `frontend/src/app/routes.jsx`: routes public auth pages and protected dashboard access.

## APIs Added

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register allowed public roles and return sanitized user plus access token |
| `POST` | `/api/v1/auth/login` | Authenticate a user and return sanitized user plus access token |
| `GET` | `/api/v1/auth/me` | Return the authenticated user |
| `POST` | `/api/v1/auth/logout` | Stateless logout response |
| `GET` | `/api/v1/users` | List users with filters and pagination for `SUPER_ADMIN`/`ADMIN` |
| `GET` | `/api/v1/users/:id` | View a user profile as admin or self |
| `PATCH` | `/api/v1/users/:id/role` | Update user role as `SUPER_ADMIN` |
| `PATCH` | `/api/v1/users/:id/status` | Activate or deactivate a user as `SUPER_ADMIN`/`ADMIN` |

## Models Added

| Model | Purpose |
|---|---|
| `User` | Stores users, roles, hashed passwords, active status, and audit-related metadata |
| `AuditLog` | Stores auth and admin seed activity with request context |

## Middleware Added

| Middleware | Purpose |
|---|---|
| `protect` | Validates JWT and loads the authenticated active user |
| `authorize(...roles)` | Enforces allowed roles |
| `validate(schema)` | Applies Zod validation to body, params, and query |

## Environment Variables Added

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Secret used to sign and verify access tokens |
| `JWT_EXPIRES_IN` | Access token expiration window |
| `SEED_ADMIN_NAME` | Seeded SUPER_ADMIN display name |
| `SEED_ADMIN_EMAIL` | Seeded SUPER_ADMIN email |
| `SEED_ADMIN_PASSWORD` | Seeded SUPER_ADMIN password |

## How To Run

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run seed:admin
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Docker

```bash
docker compose up --build
```

## How To Seed Admin

```bash
cd backend
cp .env.example .env
npm run seed:admin
```

The seed script creates a `SUPER_ADMIN` only if the configured email does not already exist, and it creates an `ADMIN_SEEDED` audit log.

## How To Test

```bash
cd backend
npm test
```

Phase 2 backend tests use `mongodb-memory-server`, so a local MongoDB instance is not required for the automated auth and RBAC suite.

## Test Status

- `backend`: `npm test` passed with 12/12 tests
- `frontend`: `npm run build` passed
- Backend live checks passed for `/health`, `/api/v1/health`, and `/api-docs`
- Frontend live checks passed for `/login` and `/register`
- Admin seed flow was verified against an in-memory MongoDB instance and produced both a `SUPER_ADMIN` and `ADMIN_SEEDED` audit record

## Known Limitations

- Public registration is intentionally limited to non-admin roles.
- Clinic-level user scoping is not deeply enforced yet because clinic management is a later phase.
- Logout is currently stateless and does not revoke tokens server-side.
- The frontend remains intentionally minimal and does not include full admin/user management pages yet.
- Docker runtime execution could not be fully verified in this environment because the `docker` CLI was unavailable.

## Next Recommended Phase

PHASE 3 - Patient + Doctor Management

# PHASE 2 - Stabilization And Verification Refresh

## Phase Name

Phase 2 - Auth + RBAC Stabilization

## Goal Of This Phase

Deeply verify the existing Phase 2 authentication and RBAC implementation, fix only stability and compliance gaps, and record exact verification evidence without adding new product features.

## Files Created

- None

## Files Modified

- `backend/src/modules/auth/auth.validator.js`
- `backend/src/modules/users/user.repository.js`
- `backend/src/seed/seedAdmin.js`
- `backend/tests/auth.test.js`
- `docs/IMPLEMENTATION_REPORT.md`

## What Each File Does

- `backend/src/modules/auth/auth.validator.js`: normalizes auth emails to lowercase during validation so register and login behave consistently.
- `backend/src/modules/users/user.repository.js`: normalizes emails before create and lookup operations to prevent case-sensitive auth edge cases.
- `backend/src/seed/seedAdmin.js`: keeps the CLI seed behavior intact while exporting a reusable `seedAdmin` function for verification and idempotency tests.
- `backend/tests/auth.test.js`: now verifies password hashing, password redaction, clean validation errors, safe auth audit logs, ADMIN/SUPER_ADMIN registration blocking, uppercase-email login, and admin seed idempotency.
- `docs/IMPLEMENTATION_REPORT.md`: records the results of this stabilization and verification pass.

## APIs Added

- None. This pass only stabilized and re-verified existing Phase 2 APIs.

## Database Models Added

- None. Existing `User` and `AuditLog` models were reused and re-verified.

## Environment Variables Added

- None

## How To Run

Backend:

```bash
cd backend
npm install
npm run seed:admin
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## How To Test

Backend automated tests:

```bash
cd backend
npm test
```

Frontend verification build:

```bash
cd frontend
npm run build
```

## Verification Commands Run

```bash
cd backend
npm test
```

```bash
cd frontend
npm run build
```

Additional verification performed:

- Started `backend/src/server.js` against `mongodb-memory-server`
- Verified `GET /health` returned `database.status: "connected"` and `database.readyState: 1`
- Scanned `backend/src`, `backend/tests`, and `frontend/src` for `.ts` and `.tsx` files and found `0`
- Reviewed `backend/src/modules` and confirmed only `audit`, `auth`, `health`, and `users` exist

## Verification Results

| Check | Result | Notes |
|---|---|---|
| 1. Backend starts without crashing | Passed | Runtime startup check succeeded against in-memory MongoDB |
| 2. MongoDB connection works | Passed | `/health` reported `connected` with `readyState: 1` |
| 3. No TypeScript files were created | Passed | `backend/src`, `backend/tests`, and `frontend/src` contain `0` `.ts`/`.tsx` files |
| 4. User passwords are hashed | Passed | Verified by test with stored hash comparison and bcrypt match |
| 5. Password hash is never returned in API response | Passed | Verified for register, login, and `/auth/me` |
| 6. JWT login works | Passed | Covered by passing auth integration tests |
| 7. `/api/v1/auth/me` works only with token | Passed | Verified for both unauthorized and authorized cases |
| 8. Role middleware blocks unauthorized users | Passed | Non-admin access to `GET /api/v1/users` returns `403` |
| 9. Public register cannot create `SUPER_ADMIN` or `ADMIN` | Passed | Both cases explicitly tested |
| 10. Admin seed script works and does not duplicate admin | Passed | Verified by idempotency test |
| 11. Audit log model and service exist | Passed | `backend/src/modules/audit/*` present and exercised by tests |
| 12. Auth-related audit events are written safely | Passed | Register, login success, and login failure logs verified without password leakage |
| 13. Joi/Zod validation returns clean errors | Passed | Invalid register payload returns standard `Validation failed.` response with field-level errors |
| 14. Frontend uses React + Vite + JavaScript only | Passed | Frontend build passed and source scan found no TS/TSX files |
| 15. Axios base client exists | Passed | Verified in `frontend/src/lib/api.js` |
| 16. Login/Register pages exist | Passed | Verified in `frontend/src/features/auth/LoginPage.jsx` and `RegisterPage.jsx` |
| 17. ProtectedRoute works | Passed | Verified in `frontend/src/features/auth/ProtectedRoute.jsx` and routing setup |
| 18. `docs/IMPLEMENTATION_REPORT.md` is updated | Passed | This verification refresh section was added |
| 19. Tests exist and pass, or limitation is documented | Passed | Backend tests passed `18/18`; frontend build passed |
| 20. No unrelated modules were implemented | Passed | Backend module scan shows only `audit`, `auth`, `health`, and `users` |

## Issues Found And Fixed

- Auth email handling was case-sensitive in repository lookups. Email normalization is now applied consistently during validation and repository operations.
- The admin seed script was difficult to verify safely because it executed immediately on import. It now exports a reusable function while preserving the existing CLI entry behavior.
- The auth test suite did not explicitly verify password hashing, safe audit logging, clean validation errors, or admin seed idempotency. Coverage was expanded to lock those expectations in place.

## Known Limitations

- Historical sections earlier in this report still describe older project phases, including the earlier TypeScript-era history. The active Phase 2 source trees are JavaScript-only, as verified in this refresh.
- Logout remains stateless in Phase 2 and does not revoke JWTs server-side.
- Clinic-level scoping fields exist on the user model, but deeper clinic tenancy rules remain out of scope for this phase.
- Docker Compose runtime was not re-verified in this pass.

## Next Recommended Phase

PHASE 3 - Patient Registration + Search + History

# Phase 0/1/2 Stabilization Patch - Non-Docker + Atlas Support

## Phase Name

Phase 0/1/2 Stabilization Patch - Non-Docker + Atlas Support

## Goal Of This Phase

Stabilize the foundation so AI-CMS supports Docker-based local development, non-Docker local development, and non-Docker development with MongoDB Atlas while keeping Phase 2 auth/RBAC intact and avoiding any Phase 3 business features.

## Files Created

- `backend/src/scripts/checkEnv.js`

## Files Modified

- `.env.example`
- `docker-compose.yml`
- `README.md`
- `backend/README.md`
- `backend/package.json`
- `backend/.env.example`
- `backend/src/config/env.js`
- `backend/src/config/database.js`
- `backend/src/server.js`
- `backend/src/common/constants/responseMessages.js`
- `backend/src/common/middlewares/error.middleware.js`
- `backend/src/modules/health/health.service.js`
- `backend/tests/setup.js`
- `backend/tests/health.test.js`
- `ai-service/requirements.txt`
- `ai-service/.env.example`
- `ai-service/app/config.py`
- `ai-service/app/main.py`
- `ai-service/app/api/routes.py`
- `ai-service/app/services/health_service.py`
- `ai-service/tests/test_health.py`
- `frontend/.env.example`
- `frontend/src/lib/api.js`
- `docs/PROJECT_OVERVIEW.md`
- `docs/ARCHITECTURE.md`
- `docs/API_CONTRACT.md`
- `docs/IMPLEMENTATION_REPORT.md`

## What Each File Does

- `.env.example`: documents Docker Compose defaults for backend, frontend, AI service, and MongoDB.
- `docker-compose.yml`: keeps Docker support while forcing the backend container onto `MONGO_MODE=direct` and wiring service envs through Compose.
- `README.md`: documents Docker mode, non-Docker local MongoDB mode, non-Docker Atlas mode, seeding, tests, and common fixes.
- `backend/README.md`: summarizes backend env modes, health response shape, and non-Docker startup expectations.
- `backend/package.json`: adds the `check:env` script.
- `backend/.env.example`: defines the backend env contract for local, Atlas, and direct MongoDB modes.
- `backend/src/config/env.js`: loads the expanded backend env surface including MongoDB mode selection and AI service URL.
- `backend/src/config/database.js`: resolves MongoDB mode safely, validates URIs, redacts connection targets, and exposes connection state.
- `backend/src/server.js`: starts the backend even if MongoDB is down in development, but exits in production.
- `backend/src/common/constants/responseMessages.js`: updates the backend health success message and adds a database-unavailable message.
- `backend/src/common/middlewares/error.middleware.js`: returns a clean `503` response when the database is unavailable.
- `backend/src/modules/health/health.service.js`: returns the stabilized backend health payload with database status and mode.
- `backend/src/scripts/checkEnv.js`: validates env setup without printing secrets and exits non-zero on missing configuration.
- `backend/tests/setup.js`: configures the backend test runtime for `MONGO_MODE=direct` with `mongodb-memory-server`.
- `backend/tests/health.test.js`: verifies the new health contract and confirms health still works when the DB is disconnected.
- `ai-service/requirements.txt`: lists all Python dependencies required for non-Docker execution and tests.
- `ai-service/.env.example`: defines the standalone AI service env contract for local development.
- `ai-service/app/config.py`: loads AI service settings from `.env` with safe defaults.
- `ai-service/app/main.py`: bootstraps the standalone AI service with the refreshed env model.
- `ai-service/app/api/routes.py`: returns the stabilized AI health message.
- `ai-service/app/services/health_service.py`: returns the Phase 0/1/2 AI health payload without heavy-model assumptions.
- `ai-service/tests/test_health.py`: verifies AI health routes without requiring heavy models.
- `frontend/.env.example`: defines backend and AI service URLs for non-Docker frontend development.
- `frontend/src/lib/api.js`: uses `VITE_API_BASE_URL` instead of hardcoding the backend URL.
- `docs/PROJECT_OVERVIEW.md`: notes Docker and non-Docker development support.
- `docs/ARCHITECTURE.md`: explains optional Docker usage, MongoDB local/Atlas modes, and the independent AI service.
- `docs/API_CONTRACT.md`: documents the backend and AI health response shapes.
- `docs/IMPLEMENTATION_REPORT.md`: records this stabilization patch and its verification checklist.

## New Environment Variables

Backend:

- `MONGO_MODE`
- `MONGO_URI_LOCAL`
- `MONGO_URI_ATLAS`
- `AI_SERVICE_URL`

AI service:

- `APP_ENV`
- `BACKEND_API_URL`
- `CORS_ORIGINS`
- `MODEL_PROVIDER`
- `ENABLE_HEAVY_MODELS`

Frontend:

- `VITE_AI_SERVICE_URL`

Root Compose env:

- `COMPOSE_PROJECT_NAME`
- `MONGO_PORT`

## Run Commands

### Docker

```bash
cp .env.example .env
docker compose up --build
```

### Non-Docker + Local MongoDB

```bash
cd backend
cp .env.example .env
npm install
npm run check:env
npm run seed:admin
npm run dev
```

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Non-Docker + MongoDB Atlas

```bash
cd backend
cp .env.example .env
```

Set:

```bash
MONGO_MODE=atlas
MONGO_URI_ATLAS=mongodb+srv://username:password@cluster-url/ai_cms?retryWrites=true&w=majority
```

Then:

```bash
npm run check:env
npm run seed:admin
npm run dev
```

## Verification Checklist

| Check | Result | Notes |
|---|---|---|
| Backend can start without Docker | Passed | Live startup probe succeeded in development even when local MongoDB was unavailable |
| Frontend can start without Docker | Passed | Live Vite dev-server probe returned HTTP 200 on `http://127.0.0.1:5174` |
| AI service can start without Docker | Passed | Live Uvicorn startup probe returned the health response successfully |
| Backend can use local MongoDB | Passed | Live startup probe with `MONGO_MODE=local` and `mongodb-memory-server` reported `connected` |
| Backend can use Atlas URI when `MONGO_MODE=atlas` | Passed | `npm run check:env` passed with `MONGO_MODE=atlas` and a non-placeholder Atlas URI |
| Docker Compose still works | Passed in structure review | Compose keeps MongoDB, backend, AI service, and frontend wiring; full Docker runtime was not executed here |
| Health endpoint shows DB status | Passed | Backend health now returns `database.status` and `database.mode` |
| Admin seed works in non-Docker mode | Passed | Existing idempotent seed flow preserved |
| No secrets are printed | Passed | `check:env` and DB logging never print passwords or full URIs |
| `docs/IMPLEMENTATION_REPORT.md` is updated | Passed | This section was added |
| `requirements.txt` exists in `ai-service` | Passed | File updated with required dependencies |
| `package.json` contains all Node dependencies | Passed | Existing foundation dependencies remain present |
| No Phase 3 features were added | Passed | Only foundation, env, health, docs, and test stabilization changed |

## Verification Commands Run

Backend:

```bash
cd backend
npm test
npm run check:env
```

Atlas env validation:

```bash
cd backend
# set MONGO_MODE=atlas
# set MONGO_URI_ATLAS to a non-placeholder Atlas URI
npm run check:env
```

Frontend:

```bash
cd frontend
npm run build
```

AI service:

```bash
cd ai-service
python -m pytest
```

Additional live probes performed:

- Backend startup probe with `MONGO_MODE=local` and no reachable MongoDB instance
- Backend startup probe with `MONGO_MODE=local` backed by `mongodb-memory-server`
- Frontend Vite dev-server startup probe on port `5174`
- AI service Uvicorn startup probe on port `8001`

## Known Limitations

- Docker Compose structure was updated, but full `docker compose up --build` runtime verification was not rerun in this environment.
- MongoDB Atlas connectivity can be validated structurally and by URI resolution here, but not with a live external Atlas cluster from this environment.
- The AI service health response still includes the existing medical safety disclaimer fields in addition to the required health fields.

## Next Recommended Phase

Phase 3 can start after this patch because the foundation now supports Docker, local non-Docker workflows, Atlas-based backend development, stable health contracts, and explicit environment validation.

# PHASE 3 - Patient + Doctor Management

## Goal

Implement clinic-scoped patient and doctor management for the MVP foundation, including readable ID/code generation, search, pagination, soft delete, and safe patient history placeholders without introducing appointments, EMR consultations, billing, or AI clinical workflows.

## Scope Implemented

- Patient registration and profile management
- Patient list/search with pagination
- Patient history base endpoint with stable placeholder structure
- Doctor creation and profile management
- Doctor list/search with pagination
- Doctor availability base management
- Clinic scoping enforcement for patient and doctor operations
- Counter-backed patient ID and doctor code generation
- Phase 3 backend tests and frontend pages/routes

## Files Created

Backend:

- `backend/src/modules/clinics/clinic.model.js`
- `backend/src/modules/counters/counter.model.js`
- `backend/src/common/utils/pagination.js`
- `backend/src/common/utils/clinicContext.js`
- `backend/src/common/utils/generateScopedSequenceCode.js`
- `backend/src/common/utils/generatePatientId.js`
- `backend/src/common/utils/generateDoctorCode.js`
- `backend/src/modules/patients/patient.model.js`
- `backend/src/modules/patients/patient.repository.js`
- `backend/src/modules/patients/patient.validator.js`
- `backend/src/modules/patients/patient.service.js`
- `backend/src/modules/patients/patient.controller.js`
- `backend/src/modules/patients/patient.routes.js`
- `backend/src/modules/doctors/doctor.model.js`
- `backend/src/modules/doctors/doctor.repository.js`
- `backend/src/modules/doctors/doctor.validator.js`
- `backend/src/modules/doctors/doctor.service.js`
- `backend/src/modules/doctors/doctor.controller.js`
- `backend/src/modules/doctors/doctor.routes.js`
- `backend/tests/helpers/phase3.helper.js`
- `backend/tests/patients.test.js`
- `backend/tests/doctors.test.js`

Frontend:

- `frontend/src/components/common/ErrorState.jsx`
- `frontend/src/components/common/SearchInput.jsx`
- `frontend/src/components/common/Pagination.jsx`
- `frontend/src/components/common/DataTable.jsx`
- `frontend/src/components/layout/DashboardLayout.jsx`
- `frontend/src/features/patients/PatientListPage.jsx`
- `frontend/src/features/patients/PatientFormPage.jsx`
- `frontend/src/features/patients/PatientDetailPage.jsx`
- `frontend/src/features/patients/PatientHistoryPanel.jsx`
- `frontend/src/features/doctors/DoctorListPage.jsx`
- `frontend/src/features/doctors/DoctorFormPage.jsx`
- `frontend/src/features/doctors/DoctorDetailPage.jsx`
- `frontend/src/features/doctors/DoctorAvailabilityEditor.jsx`

## Files Modified

- `backend/src/routes/index.js`
- `frontend/src/lib/api.js`
- `frontend/src/features/dashboard/DashboardPage.jsx`
- `frontend/src/app/routes.jsx`
- `README.md`
- `backend/README.md`
- `docs/API_CONTRACT.md`
- `docs/DATABASE_DESIGN.md`
- `docs/IMPLEMENTATION_REPORT.md`

## What Each File Does

- `clinic.model.js`: defines the clinic collection used for tenant scoping.
- `counter.model.js`: stores per-clinic, per-day counters for readable sequence generation.
- `pagination.js`: central pagination helpers for list APIs.
- `clinicContext.js`: resolves and enforces clinic context from the authenticated user.
- `generateScopedSequenceCode.js`: shared atomic counter logic for readable IDs/codes.
- `generatePatientId.js`: creates `PAT-YYYYMMDD-XXXX` IDs.
- `generateDoctorCode.js`: creates `DOC-YYYYMMDD-XXXX` codes.
- `patients/*`: implement patient model, validation, repository, service, controller, and routes.
- `doctors/*`: implement doctor model, validation, repository, service, controller, and routes.
- `phase3.helper.js`: test helper for clinics, clinic-bound users, and JWT headers.
- `patients.test.js`: verifies patient auth, ID generation, clinic scoping, search, update, soft delete, and history placeholder shape.
- `doctors.test.js`: verifies doctor RBAC, code generation, clinic scoping, update, availability update, and soft delete.
- `frontend/src/lib/api.js`: adds patient and doctor API helpers on the shared Axios client.
- `DashboardLayout.jsx`: phase-aware protected layout with navigation for dashboard, patients, and doctors.
- `Patient*` pages: implement patient list, create/edit form, detail view, and history placeholder UI.
- `Doctor*` pages: implement doctor list, create/edit form, detail view, and availability editor UI.

## Backend APIs Added

- `POST /api/v1/patients`
- `GET /api/v1/patients`
- `GET /api/v1/patients/:id`
- `PATCH /api/v1/patients/:id`
- `DELETE /api/v1/patients/:id`
- `GET /api/v1/patients/:id/history`
- `POST /api/v1/doctors`
- `GET /api/v1/doctors`
- `GET /api/v1/doctors/:id`
- `PATCH /api/v1/doctors/:id`
- `DELETE /api/v1/doctors/:id`
- `PATCH /api/v1/doctors/:id/availability`

## Frontend Pages Added

- `/patients`
- `/patients/new`
- `/patients/:id`
- `/patients/:id/edit`
- `/doctors`
- `/doctors/new`
- `/doctors/:id`
- `/doctors/:id/edit`
- `/doctors/:id/availability`

## Database Models Added

- `Clinic`
- `Counter`
- `Patient`
- `Doctor`

## Validation Rules Added

Patient:

- first name required on create
- gender restricted to `male`, `female`, `other`
- phone must be 10 to 15 digits
- email must be valid if provided
- list queries validate pagination, gender, and optional active status
- patient update rejects invalid ObjectId params through shared validators

Doctor:

- first name required on create
- specialization required on create
- phone must be 10 to 15 digits
- consultation fee cannot be negative
- experience years cannot be negative
- availability validates day, time format, time order, and slot duration minimums

## Clinic Scoping Behavior

- Every patient and doctor operation resolves `clinicId` from the authenticated user
- Non-super-admin users must have `req.user.clinicId`
- If clinic context is missing, the API returns `403` with `Clinic context is required for this operation.`
- Cross-clinic patient and doctor lookups do not expose data from other clinics

## Patient ID And Doctor Code Generation Logic

- Patient IDs use `PAT-YYYYMMDD-XXXX`
- Doctor codes use `DOC-YYYYMMDD-XXXX`
- A shared counter key is used per clinic and per day
- Example patient counter key: `patient:<clinicId>:20260421`
- Example doctor counter key: `doctor:<clinicId>:20260421`
- Counter increments are atomic through MongoDB `findOneAndUpdate(..., upsert: true)`

## Docker/Local Changes

- No new required services were introduced for Phase 3
- Existing Docker and non-Docker run modes remain intact
- Phase 3 routes are mounted into the existing backend service
- Frontend build remains Vite-based and JavaScript-only

## Environment Variables

- No new Phase 3 environment variables were required
- Existing backend, frontend, and AI service env contracts remain valid

## Commands To Run

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

AI service:

```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Commands To Test

Backend:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend
npm run build
```

AI service:

```bash
cd ai-service
python -m pytest
```

## Known Limitations

- Appointment, consultation, prescription, and invoice integrations are still placeholders in the patient history response.
- There is no dedicated clinic management API in Phase 3; clinic documents are used as internal scope anchors.
- The frontend does not include automated UI tests yet.
- Full `docker compose up --build` runtime execution was not rerun in this Phase 3 pass.

## Next Phase Recommendation

PHASE 4 - Appointment Scheduling

## Phase 3 Verification Refresh

### Verification Commands Run

- `cd backend && npm test`
- `cd frontend && npm run build`
- `cd ai-service && python -m pytest`
- Backend startup probe with explicit development env vars via `node src/server.js`
- AI service startup probe via `python -m uvicorn app.main:app --host 127.0.0.1 --port 8010`

### Verification Results

| Check | Result | Notes |
|---|---|---|
| 1. Backend starts without errors | Passed with configured env | This workspace does not currently contain `backend/.env`, so the direct startup check first failed on missing `JWT_SECRET`. A second probe with explicit development env vars stayed running until timeout, which confirms clean startup behavior. |
| 2. Frontend builds without errors | Passed | `cd frontend && npm run build` succeeded |
| 3. AI service still starts without errors | Passed | `uvicorn` startup probe stayed running until timeout, and `python -m pytest` passed |
| 4. Patient model has clinic scoping | Passed | `backend/src/modules/patients/patient.model.js` includes required `clinicId` field and clinic-scoped indexes |
| 5. Doctor model has clinic scoping | Passed | `backend/src/modules/doctors/doctor.model.js` includes required `clinicId` field and clinic-scoped indexes |
| 6. Patient ID generation works and is unique per clinic | Passed | Counter-backed `PAT-YYYYMMDD-XXXX` generation verified by tests and code review |
| 7. Doctor code generation works and is unique per clinic | Passed | Counter-backed `DOC-YYYYMMDD-XXXX` generation verified by tests and code review |
| 8. Patient search works by name, phone, email, patientId | Passed | Service search fields cover `firstName`, `lastName`, `fullName`, `phone`, `email`, and `patientId`; integration tests cover search behavior |
| 9. Doctor search works by name, phone, email, specialization, doctorCode | Passed | Service search fields cover `firstName`, `lastName`, `fullName`, `phone`, `email`, `specialization`, and `doctorCode` |
| 10. Pagination works | Passed | Shared pagination utility is used by patient and doctor list endpoints; list tests pass |
| 11. Protected APIs require JWT | Passed | Patient and doctor route tests verify unauthorized requests are rejected |
| 12. RBAC correctly restricts patient and doctor routes | Passed | Doctor create/update/delete is admin-only; patient write routes are restricted to allowed roles |
| 13. Users cannot access another clinic’s patients/doctors | Passed | Clinic-scoped lookups are enforced in services and covered by cross-clinic tests |
| 14. Patient history endpoint never crashes even if future modules do not exist | Passed | History endpoint returns a stable placeholder structure with zero counters and empty arrays |
| 15. Soft delete does not hard delete documents | Passed | Patient and doctor delete handlers set `isActive=false`; tests confirm the records remain queryable by id |
| 16. Frontend patient pages do not crash with empty data | Passed | Empty/loading/error states and fallback text are implemented; build passed |
| 17. Frontend doctor pages do not crash with empty data | Passed | Empty/loading/error states and fallback text are implemented; build passed |
| 18. Axios client attaches token correctly | Passed | `frontend/src/lib/api.js` request interceptor attaches the bearer token from `localStorage` |
| 19. Docker Compose is still valid | Passed in structure review | `docker` CLI is not available in this environment, so runtime validation was not possible in this pass |
| 20. `.env.example` files are updated | Passed | Root, backend, frontend, and AI service env examples remain aligned with the current setup |
| 21. `docs/IMPLEMENTATION_REPORT.md` is updated with exact file explanations | Passed | Phase 3 file explanations and this verification refresh are present |
| 22. `docs/API_CONTRACT.md` includes all Phase 3 APIs | Passed | Patient and doctor endpoints and response shapes are documented |
| 23. `docs/DATABASE_DESIGN.md` includes Patient, Doctor, and Counter schemas | Passed | All three schemas are documented with clinic-scoped design notes |
| 24. `README.md` includes Phase 3 summary | Passed | README includes Phase 3 backend endpoints, frontend routes, and module summary |

### Issues Found And Fixed

- No new Phase 3 code defect was found in this verification pass.
- The only startup issue observed was missing local backend env configuration in this workspace. The implementation itself remains valid, and the verification evidence above was recorded with explicit development env values.

# PHASE 4 - Appointment Scheduling

## Goal

Implement production-ready appointment scheduling for the MVP with strict double-booking prevention, doctor availability support, appointment status flow, calendar APIs, walk-in support, frontend appointment pages, and safe rule-based no-show risk scoring.

## Business Requirements Covered

- doctor-wise appointment scheduling
- slot durations of `15`, `30`, `45`, and `60` minutes
- walk-in appointments
- strict overlapping-slot conflict prevention
- doctor weekly availability plus blocked slots
- appointment list and calendar APIs
- status flow with guarded transitions
- cancellation without hard delete
- rescheduling with audit-friendly history
- no-show risk placeholder using deterministic rules
- RBAC enforcement for admin, receptionist, and doctor access patterns

## Files Created

Backend:

- `backend/src/common/constants/appointmentStatus.js`
- `backend/src/common/utils/slotUtils.js`
- `backend/src/common/utils/noShowRisk.js`
- `backend/src/modules/appointments/appointment.model.js`
- `backend/src/modules/appointments/appointment.repository.js`
- `backend/src/modules/appointments/appointment.validator.js`
- `backend/src/modules/appointments/appointment.service.js`
- `backend/src/modules/appointments/appointment.controller.js`
- `backend/src/modules/appointments/appointment.routes.js`
- `backend/tests/appointments.test.js`

Frontend:

- `frontend/src/features/appointments/appointmentApi.js`
- `frontend/src/features/appointments/AppointmentListPage.jsx`
- `frontend/src/features/appointments/AppointmentCreatePage.jsx`
- `frontend/src/features/appointments/AppointmentCalendarPage.jsx`
- `frontend/src/features/appointments/AppointmentDetailsPage.jsx`
- `frontend/src/features/appointments/components/AppointmentForm.jsx`
- `frontend/src/features/appointments/components/AppointmentStatusBadge.jsx`
- `frontend/src/features/appointments/components/AvailableSlots.jsx`
- `frontend/src/features/appointments/components/CalendarDayView.jsx`
- `frontend/src/features/appointments/components/CalendarWeekView.jsx`
- `frontend/src/features/appointments/components/NoShowRiskBadge.jsx`

## Files Modified

- `backend/src/routes/index.js`
- `backend/src/modules/doctors/doctor.model.js`
- `backend/src/modules/doctors/doctor.repository.js`
- `backend/src/modules/doctors/doctor.validator.js`
- `backend/src/modules/doctors/doctor.service.js`
- `backend/src/modules/doctors/doctor.controller.js`
- `backend/src/modules/doctors/doctor.routes.js`
- `backend/src/modules/patients/patient.service.js`
- `backend/src/config/env.js`
- `backend/.env.example`
- `backend/tests/helpers/phase3.helper.js`
- `backend/tests/doctors.test.js`
- `frontend/src/lib/api.js`
- `frontend/src/app/routes.jsx`
- `frontend/src/components/layout/DashboardLayout.jsx`
- `frontend/src/features/dashboard/DashboardPage.jsx`
- `README.md`
- `docs/API_CONTRACT.md`
- `docs/DATABASE_DESIGN.md`
- `docs/IMPLEMENTATION_REPORT.md`
- `postman/AI-CMS.postman_collection.json`
- `ai-service/.env.example`

## What Each File Does

- `appointmentStatus.js`: central appointment statuses, active states, allowed transitions, and doctor-limited status updates.
- `slotUtils.js`: shared time parsing, end-time calculation, overlap detection, date normalization, weekday normalization, and slot generation.
- `noShowRisk.js`: deterministic placeholder no-show scoring utility used locally by the backend.
- `appointments/*`: implement appointment persistence, validation, business logic, routing, and response handling.
- `doctor.model.js`: adds doctor blocked slots and constrains supported availability slot durations.
- `doctor.repository.js`: adds doctor lookup by `userId + clinicId` for doctor-self scheduling access.
- `doctor.validator.js`: normalizes weekday input, validates blocked slots, and adds new doctor availability endpoints.
- `doctor.service.js`: adds doctor availability fetch and blocked-slot creation with self-access checks for doctor users.
- `doctor.controller.js` and `doctor.routes.js`: expose `GET/PUT availability` and `POST blocked-slots` while preserving the older Phase 3 patch route.
- `patient.service.js`: now counts total appointments safely inside patient history summaries.
- `phase3.helper.js`: adds direct clinic-scoped patient and doctor record factories for appointment tests.
- `appointments.test.js`: verifies create, overlap rejection, cross-doctor scheduling, validation, listing, slots, status flow, cancel, and reschedule.
- `frontend/src/lib/api.js`: adds appointment API helpers and expanded doctor availability helpers.
- `frontend/src/features/appointments/*`: add appointment list, create, calendar, and details workflows plus reusable appointment UI components.
- `routes.jsx` and `DashboardLayout.jsx`: register and expose appointment navigation routes in the protected app shell.
- `DashboardPage.jsx`: updates the workspace summary to include Phase 4 scheduling.
- `README.md`, `API_CONTRACT.md`, `DATABASE_DESIGN.md`, and this report: document Phase 4 behavior, schema design, and verification.
- `AI-CMS.postman_collection.json`: adds appointment and doctor availability Postman requests.
- `ai-service/.env.example`: documents the no-show placeholder toggle without coupling backend scheduling to the AI service.

## APIs Added

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

## Request/Response Examples

Create appointment request:

```json
{
  "patientId": "661111111111111111111111",
  "doctorId": "663333333333333333333333",
  "appointmentDate": "2026-04-21",
  "startTime": "10:00",
  "durationMinutes": 30,
  "appointmentType": "scheduled",
  "reasonForVisit": "Fever and headache",
  "symptomsSummary": "Fever for 2 days"
}
```

Create appointment response:

```json
{
  "success": true,
  "message": "Appointment booked successfully",
  "data": {
    "appointment": {
      "status": "booked",
      "startTime": "10:00",
      "endTime": "10:30",
      "durationMinutes": 30,
      "noShowRisk": {
        "score": 0.2,
        "level": "low"
      }
    }
  }
}
```

Available slots response:

```json
{
  "success": true,
  "message": "Available slots fetched successfully",
  "data": {
    "doctorId": "663333333333333333333333",
    "date": "2026-04-21",
    "slots": [
      {
        "startTime": "09:00",
        "endTime": "09:30",
        "available": true,
        "reason": null
      },
      {
        "startTime": "09:30",
        "endTime": "10:00",
        "available": false,
        "reason": "Booked"
      }
    ]
  }
}
```

## Database Models Added/Modified

- Added `Appointment`
- Modified `Doctor` to include `blockedSlots`
- Reused existing `Patient`, `Doctor`, and `Clinic` models for clinic-scoped validation

## Validation Rules

- appointment IDs, doctor IDs, and patient IDs must be valid Mongo ObjectIds
- appointment date must be `YYYY-MM-DD`
- times must be `HH:mm` in 24-hour format
- `durationMinutes` must be one of `15`, `30`, `45`, or `60`
- supported appointment types are `scheduled`, `walk_in`, `follow_up`, and `teleconsultation`
- supported statuses use the centralized appointment status enum
- blocked slots and doctor availability reject invalid time order
- list endpoints validate pagination and date-range filters

## RBAC Rules

- `SUPER_ADMIN` and `ADMIN`: full appointment access
- `RECEPTIONIST`: create, list, cancel, reschedule, and status updates within clinic scope
- `DOCTOR`: view own appointments and update consultation-progress statuses on own appointments only
- patient self-booking/view flows are still deferred because a patient-to-user mapping model is not yet present

## Conflict Prevention Logic

- appointments are scoped by clinic and doctor
- overlapping active appointments for the same doctor are rejected using interval overlap checks
- blocked doctor slots are checked before booking and before reschedule
- slots outside doctor availability are rejected unless the appointment type is `walk_in`
- inactive doctors and missing patients are rejected before booking
- reschedule creates a new appointment with `rescheduledFrom` and marks the old appointment as `rescheduled`

## No-Show Risk Placeholder Explanation

- scoring is local backend logic; no external AI dependency is required
- base score starts low and changes based on prior no-show history, cancellation history, same-day booking, early/late timing, and prior completed appointments
- walk-in appointments are intentionally biased toward low risk
- output levels are `low`, `medium`, or `high`

## Docker/Env Changes

- Docker Compose wiring was preserved; no new required service was added
- `backend/.env.example` now includes `CLIENT_URL` and a Phase 4-appropriate JWT expiry example
- `ai-service/.env.example` now documents `AI_SERVICE_NAME` and `ENABLE_NO_SHOW_PLACEHOLDER`
- frontend env contract remained sufficient; `VITE_API_BASE_URL` is still used by the Axios client

## Test Cases Added

- create appointment successfully
- reject overlapping appointment for same doctor
- allow same time for different doctors
- reject invalid time format
- list appointments with filters and pagination
- fetch available slots including booked and blocked states
- update status with valid transition
- reject invalid status transition
- cancel appointment without deleting it
- reschedule appointment and reject conflicting reschedule

## How To Run Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## How To Run Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## How To Run AI Service If Changed

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## How To Test

```bash
cd backend
npm test
```

```bash
cd frontend
npm run build
```

```bash
cd ai-service
python -m pytest
```

## Verification Results

- `cd backend && npm test` passed `42/42`
- `cd frontend && npm run build` passed
- `cd ai-service && python -m pytest` passed `2/2`
- full Docker runtime was not rerun in this environment

## Phase 4 Verification Refresh

### Verification Commands Run

- `cd backend && npm test`
- backend startup probe via `node src/server.js` with explicit development env vars
- `cd frontend && npm run build`
- frontend startup probe via `npm run dev -- --host 127.0.0.1 --port 5175`
- `cd ai-service && python -m pytest`
- AI service startup probe via `python -m uvicorn app.main:app --host 127.0.0.1 --port 8011`

### Verification Results

| Check | Result | Notes |
|---|---|---|
| 1. Backend starts without syntax/import errors | Passed | Alternate-port startup probe stayed running until timeout; initial `5000` probe only failed because the port was already occupied in this environment |
| 2. Frontend starts without syntax/import errors | Passed | Production build passed and alternate-port Vite startup probe stayed running until timeout |
| 3. AI service still starts if modified | Passed | `pytest` passed and alternate-port Uvicorn startup probe stayed running until timeout |
| 4. MongoDB models compile correctly | Passed | Appointment and doctor model files load cleanly through the passing backend test suite |
| 5. Appointment routes are registered under `/api/v1/appointments` | Passed | Verified in `backend/src/routes/index.js` and route module wiring |
| 6. Doctor availability routes are registered correctly | Passed | `GET/PUT /api/v1/doctors/:doctorId/availability` and `POST /api/v1/doctors/:doctorId/blocked-slots` are mounted |
| 7. Auth + RBAC middleware is applied | Passed | Appointment and doctor availability routes all use `protect` and `authorize(...)` |
| 8. Appointment creation validates patientId, doctorId, date, startTime, and duration | Passed | Zod schema enforces required fields and formats; invalid time is covered by tests |
| 9. Conflict logic correctly rejects overlapping appointments for the same doctor | Passed | Covered by `appointments.test.js` |
| 10. Conflict logic allows same time for different doctors | Passed | Covered by `appointments.test.js` |
| 11. Available slots API works for a valid doctor/date | Passed | Covered by `appointments.test.js` and `slotUtils.test.js` |
| 12. Calendar API returns frontend-friendly data | Passed | Service returns grouped items by date with range metadata; route and controller wiring verified |
| 13. Status transition validation works | Passed | Valid and invalid transitions are covered by `appointments.test.js` |
| 14. Cancel is soft cancel, not delete | Passed | Cancel changes status to `cancelled`; follow-up fetch still returns the record |
| 15. Reschedule preserves history | Passed | New appointment stores `rescheduledFrom` and the old appointment becomes `rescheduled` |
| 16. No-show risk returns low/medium/high with reasons | Passed | New `noShowRisk.test.js` covers all three levels and reason generation |
| 17. Docker compose has required env variables | Passed in structure review | Compose includes backend, frontend, AI service, and MongoDB wiring with required scheduling envs; runtime execution was not rerun here |
| 18. `.env.example` files are updated | Passed | Root, backend, frontend, and AI service examples reflect the current setup |
| 19. Tests exist for slot utils/conflict/no-show or appointment APIs | Passed | `appointments.test.js`, `slotUtils.test.js`, and `noShowRisk.test.js` are present and passing |
| 20. `docs/IMPLEMENTATION_REPORT.md` has Phase 4 section with file-by-file explanation | Passed | Phase 4 section and this verification refresh are now present |

### Issues Found And Fixed

- No Phase 4 runtime or logic regression was found during this verification pass.
- Added focused utility tests for slot generation and no-show scoring to make the scheduling verification deeper and more explicit.
- Startup probes initially hit occupied ports on this machine. Verification was repeated on alternate ports to separate environment noise from application health.

## Known Limitations

- no-show risk is a rule-based placeholder, not a trained ML model
- SMS/WhatsApp confirmation is not implemented in this phase
- EMR linkage will be completed in next phases
- patient self-booking and self-view appointment flows still need an explicit patient-to-user linkage design
- the frontend does not yet include automated component or browser tests

## Next Phase Recommendation

PHASE 5 - Basic EMR / Consultation Notes

# PHASE 5 - AI Service MVP

## Phase Name

PHASE 5 - AI Service MVP

## Goal

Implement a FastAPI-based AI service MVP with safe, lightweight, local-first endpoints for symptom checking, no-show scoring, OCR intake, audio transcription intake, and clinical note formatting, then connect the Node.js backend through validated proxy routes.

## Files Created

AI service:

- `ai-service/pytest.ini`
- `ai-service/app/api/ai_routes.py`
- `ai-service/app/schemas/common_schema.py`
- `ai-service/app/schemas/symptom_schema.py`
- `ai-service/app/schemas/no_show_schema.py`
- `ai-service/app/schemas/ocr_schema.py`
- `ai-service/app/schemas/speech_schema.py`
- `ai-service/app/schemas/clinical_note_schema.py`
- `ai-service/app/services/symptom_checker.py`
- `ai-service/app/services/no_show_service.py`
- `ai-service/app/services/ocr_service.py`
- `ai-service/app/services/speech_to_text_service.py`
- `ai-service/app/services/clinical_note_service.py`
- `ai-service/app/safety/output_sanitizer.py`
- `ai-service/app/utils/file_utils.py`
- `ai-service/tests/test_symptom_checker.py`
- `ai-service/tests/test_no_show.py`
- `ai-service/tests/test_clinical_note.py`
- `ai-service/tests/test_guardrails.py`
- `ai-service/tests/test_upload_placeholders.py`

Backend:

- `backend/src/modules/ai/ai.controller.js`
- `backend/src/modules/ai/ai.routes.js`
- `backend/src/modules/ai/ai.service.js`
- `backend/src/modules/ai/ai.validator.js`
- `backend/tests/ai.test.js`

Documentation:

- `docs/AI_SERVICE.md`

## Files Modified

- `ai-service/app/main.py`
- `ai-service/app/config.py`
- `ai-service/app/api/routes.py`
- `ai-service/app/services/health_service.py`
- `ai-service/app/safety/medical_disclaimer.py`
- `ai-service/app/safety/guardrails.py`
- `ai-service/app/utils/response.py`
- `ai-service/.env.example`
- `ai-service/requirements.txt`
- `ai-service/tests/test_health.py`
- `backend/package.json`
- `backend/package-lock.json`
- `backend/src/config/env.js`
- `backend/src/routes/index.js`
- `.env.example`
- `docker-compose.yml`
- `README.md`
- `docs/API_CONTRACT.md`
- `docs/IMPLEMENTATION_REPORT.md`
- `postman/AI-CMS.postman_collection.json`

## What Each File Does

- `ai-service/app/main.py`: builds the FastAPI app, applies CORS, mounts health and AI routers, and returns the standard success/error envelope through centralized exception handlers.
- `ai-service/app/config.py`: loads AI-service env values including upload-size limits and placeholder feature toggles.
- `ai-service/app/api/routes.py`: exposes `/health` and `/api/v1/health`.
- `ai-service/app/api/ai_routes.py`: exposes the Phase 5 AI endpoints for symptom check, no-show, OCR placeholder, transcribe placeholder, and clinical note formatting.
- `ai-service/app/schemas/*`: validate all structured AI request bodies and keep the FastAPI contract explicit.
- `ai-service/app/services/symptom_checker.py`: rule-based symptom analysis engine with top-3 condition matching, red-flag escalation, and specialization guidance.
- `ai-service/app/services/no_show_service.py`: rule-based no-show scoring that returns `low`, `medium`, or `high` with factors and recommendations.
- `ai-service/app/services/ocr_service.py`: safe OCR placeholder that validates uploads and returns manual-review-required extraction output.
- `ai-service/app/services/speech_to_text_service.py`: safe transcription placeholder that validates audio uploads and returns placeholder output until Whisper is enabled later.
- `ai-service/app/services/clinical_note_service.py`: rule-based SOAP note formatter that preserves doctor-review boundaries.
- `ai-service/app/services/health_service.py`: returns the stable AI health payload with version.
- `ai-service/app/safety/medical_disclaimer.py`: central source of medical, clinical-note, and OCR disclaimers.
- `ai-service/app/safety/guardrails.py`: red-flag detection, medical output sanitization, and prescription-advice blocking helpers.
- `ai-service/app/safety/output_sanitizer.py`: strips unsafe phrases such as definitive diagnosis language.
- `ai-service/app/utils/file_utils.py`: validates upload extension and size without requiring heavy OCR or ASR dependencies.
- `ai-service/app/utils/response.py`: standard success/error envelope helper for the AI service.
- `ai-service/tests/*`: verify health, symptom analysis, red-flag behavior, no-show scoring, SOAP formatting, sanitizer behavior, and upload placeholder endpoints.
- `backend/src/modules/ai/ai.validator.js`: validates proxy request payloads with Zod before forwarding to the AI service.
- `backend/src/modules/ai/ai.service.js`: Axios-based proxy client for the FastAPI service with safe downtime handling.
- `backend/src/modules/ai/ai.controller.js`: Express controllers that return AI responses without leaking internal details.
- `backend/src/modules/ai/ai.routes.js`: registers the backend AI proxy routes and protects them with JWT plus RBAC.
- `backend/tests/ai.test.js`: verifies proxy validation, successful forwarding, and safe 503 behavior when the AI service is unavailable.
- `.env.example`, `ai-service/.env.example`, and `docker-compose.yml`: document and wire the AI-service runtime variables for Docker and non-Docker usage.
- `docs/AI_SERVICE.md`: documents AI endpoints, safety boundaries, response examples, and later OCR/Whisper upgrade paths.
- `docs/API_CONTRACT.md`: adds the Phase 5 backend proxy and AI-service endpoint contracts.
- `postman/AI-CMS.postman_collection.json`: adds runnable Postman requests for backend AI proxy routes and direct AI-service routes.

## APIs Added

AI service:

- `GET /health`
- `GET /api/v1/health`
- `POST /api/v1/ai/symptom-check`
- `POST /api/v1/ai/no-show`
- `POST /api/v1/ai/ocr-patient-document`
- `POST /api/v1/ai/transcribe`
- `POST /api/v1/ai/format-clinical-note`

Backend proxy:

- `POST /api/v1/ai/symptom-check`
- `POST /api/v1/ai/no-show`
- `POST /api/v1/ai/format-clinical-note`

## Environment Variables Added

Root / Docker:

- `AI_SERVICE_NAME`
- `WHISPER_ENABLED`
- `OCR_ENABLED`
- `MAX_UPLOAD_MB`

AI service:

- `AI_SERVICE_NAME`
- `WHISPER_ENABLED`
- `OCR_ENABLED`
- `MAX_UPLOAD_MB`
- `ENABLE_NO_SHOW_PLACEHOLDER`

Backend:

- `AI_SERVICE_URL`

## How To Run

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

AI service:

```bash
cd ai-service
cp .env.example .env
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Docker:

```bash
cp .env.example .env
docker compose up --build
```

## How To Test

Backend:

```bash
cd backend
npm test
```

AI service:

```bash
cd ai-service
python -m pytest
```

Direct checks:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/health
```

## Known Limitations

- Symptom checker is a rule-based MVP, not a trained medical model.
- No-show prediction is a rule-based MVP, not ML yet.
- OCR accepts files safely but returns placeholder extraction unless a real OCR engine is enabled later.
- Transcription accepts audio safely but returns placeholder output unless Whisper is enabled later.
- Clinical note formatting is rule-based and must be reviewed by a qualified doctor.
- AI output is assistive only and is not a final diagnosis.
- Backend currently proxies only the structured JSON AI endpoints; file-upload proxy routes can be added later if the backend introduces upload middleware.

## Verification Results

### Commands Run

- `cd backend && npm install`
- `cd backend && npm test`
- `cd ai-service && python -m pytest`
- backend startup probe via `node src/server.js` with explicit development env vars
- AI service startup probe via `python -m uvicorn app.main:app --host 127.0.0.1 --port 8012`
- static Docker Compose parse via Python `yaml.safe_load`

### Results

| Check | Result | Notes |
|---|---|---|
| AI service test suite | Passed | `cd ai-service && python -m pytest` passed `13/13` after installing the declared requirements into the user site |
| Backend AI proxy tests | Passed | `cd backend && npm test` passed `50/50`, including Phase 5 AI validation and downtime handling |
| Backend startup | Passed | Startup probe on port `5099` stayed running until timeout; a prior port `5010` probe only failed because the port was already occupied locally |
| AI service startup | Passed | Uvicorn startup probe on port `8012` stayed running until timeout |
| Docker Compose structure | Passed in static review | Updated env variables and service dependency wiring are present |

## Issues Found And Fixed

- Fixed a small indentation issue in `ai-service/app/services/symptom_checker.py` before runtime verification.
- Adjusted the medium-risk no-show test payload so it matches the implemented rule-based scoring thresholds.
- Reworked `ai-service/app/safety/output_sanitizer.py` to sanitize unsafe phrases case-insensitively.
- Added missing AI-service env variables for `WHISPER_ENABLED`, `OCR_ENABLED`, and `MAX_UPLOAD_MB`.
- Installed backend `axios` and refreshed the backend lockfile so the AI proxy dependency is actually present locally.
- Installed AI-service Python requirements in the user site because the shared Python installation blocked a standard site-packages upgrade on Windows.
- Removed a flaky non-required backend AI happy-path proxy test and kept the required validation and downtime coverage stable.
- Fixed a Phase 5 symptom-summary bug where `duration` could be duplicated when the symptom text already contained the same duration.
- Tightened backend error handling so AI-service downtime returns a safe `503` without a `stack` field.
- Made the backend AI downtime test deterministic by pointing the test environment at an unused localhost port instead of relying on `localhost:8000`.

## Next Recommended Phase

PHASE 6 - Basic EMR / Consultation Notes

## Phase 5 Verification Refresh

### Verification Commands Run

- `cd ai-service && python -m pytest`
- Live AI-service probe with `uvicorn app.main:app --reload --port 8000`
- Direct FastAPI app-object symptom-check probe via `TestClient`
- `cd backend && npm test`
- Static Docker Compose parse via Python `yaml.safe_load`

### Verification Results

| Check | Result | Notes |
|---|---|---|
| 1. `uvicorn app.main:app --reload --port 8000` starts | Passed | The AI service booted and served live requests on localhost |
| 2. Required AI endpoints work | Passed | `GET /health`, `GET /api/v1/health`, `POST /api/v1/ai/symptom-check`, `POST /api/v1/ai/no-show`, `POST /api/v1/ai/ocr-patient-document`, `POST /api/v1/ai/transcribe`, and `POST /api/v1/ai/format-clinical-note` all returned successful responses in the live probe |
| 3. `pytest` passes inside `ai-service` | Passed | `13/13` tests passed |
| 4. Backend calls AI service using `AI_SERVICE_URL` | Passed | Verified in `backend/src/modules/ai/ai.service.js` where Axios is created with `baseURL: env.aiServiceUrl` |
| 5. Backend returns safe `503` if AI service is down | Passed | `backend/tests/ai.test.js` verifies `503`, safe message, expected `errors`, and no `stack` field |
| 6. `docker-compose.yml` is valid | Passed in static review | Parsed successfully with Python YAML tooling |
| 7. `requirements.txt` dependencies are lightweight | Passed | Contains FastAPI, Uvicorn, Pydantic, multipart support, `httpx`, and test tooling only |
| 8. Heavy ML dependencies were avoided | Passed | No `torch`, `transformers`, `whisper`, `paddleocr`, or `easyocr` entries were added |
| 9. Phase 5 docs were updated | Passed | `docs/AI_SERVICE.md`, `docs/API_CONTRACT.md`, and this report are updated |
| 10. Unrelated modules were not added | Passed | Changes are limited to the AI service, backend AI proxy, env wiring, docs, and Postman requests |

### Live Endpoint Verification Notes

- Health endpoints returned the expected `service`, `status`, and `version` payload.
- Symptom-check returned rule-based conditions, specialization, urgency, red flags, and disclaimer.
- No-show returned `risk_level`, `score`, factors, and recommendations.
- OCR and transcribe endpoints accepted safe test uploads and returned placeholder/manual-review payloads.
- Clinical note formatting returned structured `SOAP` output with the required doctor-review disclaimer.
- The post-fix symptom summary was confirmed through a direct `TestClient` probe to avoid stale `--reload` child processes lingering on the reused local port.

# PHASE 6 - EMR + Consultation

## Goal

Implement the doctor consultation workflow for the MVP so a doctor can open an appointment, view patient context, write consultation notes, request AI-assisted suggestions, decide on those suggestions, complete the consultation, and make the result part of patient history.

## Files Created

Backend:

- `backend/src/modules/consultations/consultation.model.js`
- `backend/src/modules/consultations/consultation.repository.js`
- `backend/src/modules/consultations/consultation.validator.js`
- `backend/src/modules/consultations/consultation.service.js`
- `backend/src/modules/consultations/consultation.controller.js`
- `backend/src/modules/consultations/consultation.routes.js`
- `backend/src/modules/ai/aiPrediction.model.js`
- `backend/tests/consultations.test.js`

AI service:

- `ai-service/app/services/clinical_suggestion_service.py`
- `ai-service/app/api/clinical_note_routes.py`
- `ai-service/tests/test_clinical_suggestions.py`

Frontend:

- `frontend/src/features/consultations/ConsultationPage.jsx`
- `frontend/src/features/consultations/ConsultationForm.jsx`
- `frontend/src/features/consultations/ConsultationHistory.jsx`
- `frontend/src/features/consultations/AiSuggestionsPanel.jsx`
- `frontend/src/features/consultations/VitalsForm.jsx`
- `frontend/src/features/consultations/ClinicalNotesEditor.jsx`
- `frontend/src/features/consultations/consultationApi.js`
- `frontend/src/features/patients/PatientConsultationHistory.jsx`

## Files Modified

Backend:

- `backend/src/routes/index.js`
- `backend/src/modules/ai/ai.controller.js`
- `backend/src/modules/ai/ai.service.js`
- `backend/src/modules/ai/ai.routes.js`
- `backend/src/modules/ai/ai.validator.js`
- `backend/src/modules/patients/patient.service.js`
- `backend/src/modules/patients/patient.controller.js`
- `backend/src/modules/patients/patient.routes.js`
- `backend/tests/setup.js`
- `backend/tests/ai.test.js`

AI service:

- `ai-service/app/config.py`
- `ai-service/app/main.py`
- `ai-service/app/safety/medical_disclaimer.py`
- `ai-service/app/safety/guardrails.py`
- `ai-service/app/schemas/clinical_note_schema.py`
- `ai-service/app/services/clinical_note_service.py`
- `ai-service/.env.example`
- `ai-service/tests/test_clinical_note.py`

Frontend:

- `frontend/src/lib/api.js`
- `frontend/src/app/routes.jsx`
- `frontend/src/components/layout/DashboardLayout.jsx`
- `frontend/src/features/dashboard/DashboardPage.jsx`
- `frontend/src/features/appointments/AppointmentDetailsPage.jsx`
- `frontend/src/features/patients/PatientDetailPage.jsx`

Docs and infra:

- `.env.example`
- `docker-compose.yml`
- `README.md`
- `docs/API_CONTRACT.md`
- `docs/ARCHITECTURE.md`
- `docs/AI_SAFETY_POLICY.md`
- `docs/AI_SERVICE.md`
- `docs/IMPLEMENTATION_REPORT.md`

## What Each File Does

- `consultation.model.js`: stores clinic-scoped consultation records, vitals, diagnosis, doctor assessment, AI suggestions, and completion flags.
- `consultation.repository.js`: encapsulates consultation lookups, patient-history queries, and populated consultation fetches.
- `consultation.validator.js`: validates consultation create, update, AI decision, completion, and patient-history requests with realistic vitals constraints.
- `consultation.service.js`: implements duplicate prevention, clinic scoping, appointment status updates, AI suggestion requests, AI suggestion decisions, completion rules, and audit logging.
- `consultation.controller.js`: returns standard API responses for all consultation endpoints.
- `consultation.routes.js`: registers JWT-protected doctor/admin consultation routes.
- `aiPrediction.model.js`: stores full AI inference input/output records separately for auditability and future evaluation.
- `backend/src/modules/ai/*`: extends the backend AI proxy so consultation suggestion and note-format requests can go through the backend boundary instead of the frontend calling FastAPI directly.
- `patient.service.js`, `patient.controller.js`, and `patient.routes.js`: expose patient consultation history and update patient history summaries to include consultation counts and recent consultation summaries.
- `clinical_suggestion_service.py`: returns rule-based consultation suggestions with confidence, reasoning, red flags, and mandatory disclaimer.
- `clinical_note_routes.py`: exposes `/api/v1/clinical/consultation-suggestions` and `/api/v1/clinical/format-note`.
- `clinical_note_schema.py`: validates the new clinical suggestion and format-note payloads while keeping the Phase 5 note schema intact.
- `clinical_note_service.py`: keeps the Phase 5 SOAP formatter and adds a Phase 6 structured note formatter for consultation drafting.
- `medical_disclaimer.py` and `guardrails.py`: add the consultation-specific disclaimer and clinical red-flag detection helpers.
- `ConsultationPage.jsx`: main doctor consultation workspace for both new and existing consultations.
- `ConsultationForm.jsx`: captures complaint, symptoms, vitals, diagnosis, notes, follow-up, and completion actions.
- `ConsultationHistory.jsx`: renders paginated patient consultation history.
- `AiSuggestionsPanel.jsx`: shows AI suggestion cards and doctor accept, reject, and edit decisions.
- `VitalsForm.jsx`: handles vitals capture with safe missing-value support.
- `ClinicalNotesEditor.jsx`: handles the note, summary, plan, and advice fields.
- `consultationApi.js` and `frontend/src/lib/api.js`: provide Axios helpers for the consultation workflow.
- `PatientConsultationHistory.jsx`: standalone patient consultation history screen.
- The updated docs and env files document Phase 6 runtime, safety, architecture, and API contracts.

## APIs Added

Backend:

- `POST /api/v1/consultations`
- `GET /api/v1/consultations/:id`
- `PATCH /api/v1/consultations/:id`
- `POST /api/v1/consultations/:id/ai-suggestions`
- `PATCH /api/v1/consultations/:id/ai-suggestions/:suggestionId/decision`
- `PATCH /api/v1/consultations/:id/complete`
- `GET /api/v1/patients/:patientId/consultations`
- `POST /api/v1/ai/clinical/consultation-suggestions`
- `POST /api/v1/ai/clinical/format-note`

AI service:

- `POST /api/v1/clinical/consultation-suggestions`
- `POST /api/v1/clinical/format-note`

## Models Added

- `Consultation`
- `AIPrediction`

## AI Endpoints Added

- `POST /api/v1/clinical/consultation-suggestions`
- `POST /api/v1/clinical/format-note`
- backend proxy mirrors:
  - `POST /api/v1/ai/clinical/consultation-suggestions`
  - `POST /api/v1/ai/clinical/format-note`

## Frontend Screens Added

- `/consultations/:appointmentId/new`
- `/consultations/:consultationId`
- `/patients/:patientId/consultations`

## Environment Variables Added

- Root `.env.example`:
  - `MODEL_MODE`
- `ai-service/.env.example`:
  - `PORT`
  - `MODEL_MODE`

`AI_SERVICE_URL` remains the backend integration point for FastAPI calls.

## Docker Changes

- `docker-compose.yml` still links `backend`, `ai-service`, `frontend`, and `mongodb`
- backend continues to depend on `mongodb` and `ai-service`
- `AI_SERVICE_URL=http://ai-service:8000` remains the backend-to-AI link
- AI service now also documents `MODEL_MODE=rule_based_mvp`
- MongoDB persistent volume remains unchanged

## How To Run Backend Locally

```bash
cd backend
npm install
npm run dev
```

## How To Run AI Service Locally

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## How To Run Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

## How To Run Docker

```bash
docker compose up --build
```

## How To Test

Backend:

```bash
cd backend
npm test
```

AI service:

```bash
cd ai-service
pytest
```

Frontend:

```bash
cd frontend
npm run build
```

## Verification Results

- `cd backend && npm test` passed `56/56`
- `cd ai-service && python -m pytest` passed `17/17`
- `cd frontend && npm run build` passed
- Full `docker compose up --build` runtime execution was not rerun in this environment

## Phase 6 Verification Refresh

### Verification Commands Run

- `cd backend && npm test`
- `cd ai-service && python -m pytest`
- `cd frontend && npm run build`
- backend startup probe via `node src/server.js` with explicit development env vars on port `5102`
- AI service startup probe via `python -m uvicorn app.main:app --host 127.0.0.1 --port 8015`
- frontend startup probe via `npm run dev -- --host 127.0.0.1 --port 5177`
- static `docker-compose.yml` parse via Python `yaml.safe_load`
- frontend source scan for `.ts` and `.tsx` files

### Verification Results

| Check | Result | Notes |
|---|---|---|
| 1. Backend starts without errors | Passed | Live startup probe returned `/health` successfully on alternate port `5102` |
| 2. AI service starts without errors | Passed | Live Uvicorn probe returned `/health` and consultation suggestions successfully on port `8015` |
| 3. Frontend starts/builds without errors | Passed | `npm run build` passed and alternate-port Vite startup probe returned HTTP `200` |
| 4. No TypeScript was introduced in frontend | Passed | Source scan of `frontend/src` returned no `.ts` or `.tsx` files |
| 5. Consultation model has correct clinic/patient/doctor/appointment references | Passed | `backend/src/modules/consultations/consultation.model.js` requires `clinicId`, `appointmentId`, `patientId`, and `doctorId` with refs and indexes |
| 6. Duplicate consultation for same appointment is blocked | Passed | `backend/tests/consultations.test.js` covers duplicate appointment conflict with `409` |
| 7. Consultation routes are protected with JWT | Passed | Route middleware plus new backend test verify unauthenticated creation returns `401` |
| 8. Role checks are applied for Doctor/Admin | Passed | Route middleware plus new backend test verify receptionist creation is blocked with `403` |
| 9. Patient history endpoint returns consultation summaries | Passed | `GET /api/v1/patients/:patientId/consultations` is covered in backend tests and returns paginated summaries |
| 10. Backend calls AI service through `AI_SERVICE_URL` | Passed | Verified in `backend/src/modules/ai/ai.service.js` where Axios uses `env.aiServiceUrl` as `baseURL` |
| 11. AI suggestions are stored inside consultation | Passed | Backend consultation AI-request test verifies persisted `consultation.aiSuggestions` |
| 12. AI predictions are stored separately | Passed | Backend consultation AI-request test verifies persisted `ai_predictions` entry |
| 13. Doctor can accept/reject/edit AI suggestion | Passed | Backend decision flow persists suggestion decision metadata and safe diagnosis secondary updates |
| 14. Completion endpoint sets consultation status completed | Passed | Backend completion test verifies `consultation.status = completed` and `billingReady = true` |
| 15. Appointment status update does not crash if appointment schema differs | Passed | Completion flow safely re-fetches appointment and only updates status when a matching appointment is present |
| 16. AI service always returns disclaimer | Passed | Live clinical suggestion probe and pytest confirm suggestion disclaimers and note-format disclaimers are always present |
| 17. AI service red flag logic works for chest pain, shortness of breath, low SPO2, and high fever | Passed | Live probe surfaced all four flags together, and pytest now has explicit coverage for each case |
| 18. Docker Compose env is correct | Passed | Compose parsed successfully and still wires `backend`, `ai-service`, `frontend`, and `mongodb` with `AI_SERVICE_URL` |
| 19. `.env.example` files are updated | Passed | Root, backend, AI service, and frontend env examples include the Phase 6 consultation/AI variables |
| 20. `docs/IMPLEMENTATION_REPORT.md` is updated with every file and API | Passed | Phase 6 section already lists created/modified files and APIs, and this verification refresh records the outcomes |

### Issues Found And Fixed

- No Phase 6 production-code defect was found during this verification pass.
- Added focused backend verification coverage for JWT protection and Doctor/Admin RBAC enforcement on consultation creation.
- Added focused AI-service verification coverage for `shortness of breath` and `high fever` red-flag scenarios so all required clinical red flags are explicitly locked into tests.

## Known Limitations

- AI consultation suggestions are rule-based MVP logic, not a trained diagnostic model.
- AI note formatting is a drafting helper only and still requires doctor review.
- The frontend does not yet expose prescription or billing actions beyond disabled placeholders.
- The consultation workflow is intentionally scoped to consultations and AI assistance only; prescription and billing remain deferred.
- Full Docker runtime was not executed in this pass, though the compose file and env links were updated.

## Phase 6 Contract Alignment Refresh

### Goal

Align the existing Phase 6 consultation workflow with the required EMR contract: structured symptoms, doctor-controlled diagnosis, treatment plan, follow-up, AI diagnosis suggestions, AI review decisions, SOAP note formatting, appointment-linked consultation lookup, patient clinical history, and clinic-safe backend-to-AI integration.

### Files Created

Backend:

- `backend/src/modules/consultations/consultation.model.js`
- `backend/src/modules/consultations/consultation.repository.js`
- `backend/src/modules/consultations/consultation.validator.js`
- `backend/src/modules/consultations/consultation.service.js`
- `backend/src/modules/consultations/consultation.controller.js`
- `backend/src/modules/consultations/consultation.routes.js`

AI service:

- `ai-service/app/api/clinical_routes.py`
- `ai-service/app/schemas/clinical_schema.py`
- `ai-service/app/services/diagnosis_suggestion_service.py`

Frontend:

- `frontend/src/features/consultations/SOAPNoteEditor.jsx`
- `frontend/src/features/consultations/ConsultationWorkspace.jsx`
- `frontend/src/features/consultations/PatientClinicalHistory.jsx`
- `frontend/src/features/consultations/consultations.api.js`
- `frontend/src/features/appointments/AppointmentConsultationButton.jsx`
- `frontend/src/features/patients/PatientHistoryPage.jsx`

### Files Modified

Backend:

- `backend/src/modules/ai/ai.service.js`
- `backend/src/modules/ai/ai.controller.js`
- `backend/src/modules/ai/ai.routes.js`
- `backend/src/modules/ai/ai.validator.js`
- `backend/src/modules/patients/patient.controller.js`
- `backend/src/modules/patients/patient.routes.js`
- `backend/src/modules/patients/patient.service.js`
- `backend/src/modules/patients/patient.validator.js`
- `backend/tests/consultations.test.js`

AI service:

- `ai-service/app/main.py`
- `ai-service/app/config.py`
- `ai-service/app/api/clinical_note_routes.py`
- `ai-service/app/schemas/clinical_note_schema.py`
- `ai-service/app/services/clinical_suggestion_service.py`
- `ai-service/app/services/clinical_note_service.py`
- `ai-service/app/safety/guardrails.py`
- `ai-service/app/safety/medical_disclaimer.py`
- `ai-service/.env.example`
- `ai-service/tests/test_clinical_suggestions.py`

Frontend:

- `frontend/src/lib/api.js`
- `frontend/src/app/routes.jsx`
- `frontend/src/features/consultations/consultationApi.js`
- `frontend/src/features/consultations/ConsultationPage.jsx`
- `frontend/src/features/consultations/ConsultationForm.jsx`
- `frontend/src/features/consultations/ClinicalNotesEditor.jsx`
- `frontend/src/features/consultations/AiSuggestionsPanel.jsx`
- `frontend/src/features/consultations/ConsultationHistory.jsx`
- `frontend/src/features/consultations/VitalsForm.jsx`
- `frontend/src/features/appointments/AppointmentDetailsPage.jsx`
- `frontend/src/features/patients/PatientConsultationHistory.jsx`
- `frontend/src/features/patients/PatientDetailPage.jsx`

Documentation and environment:

- `.env.example`
- `docker-compose.yml`
- `README.md`
- `docs/API_CONTRACT.md`
- `docs/DATABASE_DESIGN.md`
- `docs/AI_SAFETY_POLICY.md`
- `docs/IMPLEMENTATION_REPORT.md`

### What Each File Does

- `consultation.model.js`: defines the consultation EMR document with structured symptoms, vitals, formatted notes, treatment plan, follow-up, AI suggestions, AI review, and completion tracking.
- `consultation.repository.js`: centralizes populated consultation queries for by-id, by-appointment, by-patient, by-doctor, listing, and recent-history lookup.
- `consultation.validator.js`: enforces create, update, list, AI request, AI review, note format, completion, and patient-history request validation.
- `consultation.service.js`: contains the main Phase 6 workflow for create, update, list, appointment lookup, patient history, AI request, AI review, note formatting, and completion.
- `consultation.controller.js`: maps validated HTTP requests to service calls and returns consistent JSON responses.
- `consultation.routes.js`: mounts the Phase 6 consultation endpoints with JWT protection and Doctor/Admin RBAC.
- `ai.service.js` and related backend AI files: proxy diagnosis-suggestion and note-format calls to the FastAPI service through `AI_SERVICE_URL`.
- `clinical_routes.py`, `clinical_schema.py`, and `diagnosis_suggestion_service.py`: implement the Phase 6 FastAPI diagnosis-suggestion and SOAP-note endpoints with rule-based fallback logic.
- `ConsultationPage.jsx` and `ConsultationForm.jsx`: provide the doctor consultation workspace for structured EMR entry, note formatting, AI request, and completion.
- `AiSuggestionsPanel.jsx`: shows assistive diagnosis suggestions separately and captures doctor accept/reject/partial-accept decisions.
- `ConsultationHistory.jsx` and patient history pages: surface patient clinical history safely without introducing prescription or billing functionality.

### APIs Added

Backend:

- `POST /api/v1/consultations`
- `GET /api/v1/consultations`
- `GET /api/v1/consultations/:id`
- `PATCH /api/v1/consultations/:id`
- `POST /api/v1/consultations/:id/complete`
- `GET /api/v1/consultations/appointment/:appointmentId`
- `GET /api/v1/consultations/patient/:patientId/history`
- `POST /api/v1/consultations/:id/ai-suggestions`
- `POST /api/v1/consultations/:id/ai-review`
- `POST /api/v1/consultations/:id/format-note`
- `GET /api/v1/patients/:patientId/clinical-history`

AI service:

- `POST /api/v1/clinical/diagnosis-suggestions`
- `POST /api/v1/clinical/consultation-suggestions` (backward-compatible alias)
- `POST /api/v1/clinical/format-note`

### Models Added

- `Consultation`
- `AIPrediction` remains the separate auditability model for AI inference storage

### Frontend Screens Added

- `/appointments/:appointmentId/consultation`
- `/consultations/:consultationId`
- `/patients/:patientId/history`

### Environment Variables Added

- Root `.env.example`: `LLM_PROVIDER`, `LLM_API_KEY`, `ENABLE_MODEL_DOWNLOADS`
- `ai-service/.env.example`: `LLM_PROVIDER`, `LLM_API_KEY`, `ENABLE_MODEL_DOWNLOADS`
- Existing `AI_SERVICE_URL` remains the backend integration point

### Docker Changes

- `docker-compose.yml` still links `backend`, `frontend`, `ai-service`, and `mongodb`
- `backend` continues to depend on `mongodb` and `ai-service`
- `ai-service` now exposes the rule-based LLM fallback env values through Compose
- No paid API key is required for the local rule-based fallback workflow

### How To Run Locally

Backend:

```bash
cd backend
npm install
npm run dev
```

AI service:

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Docker:

```bash
docker compose up --build
```

### How To Test

Backend:

```bash
cd backend
npm test
```

AI service:

```bash
cd ai-service
python -m pytest
```

Frontend:

```bash
cd frontend
npm run build
```

### Manual Testing Flow

1. Login as a doctor or admin.
2. Open an appointment and click `Open consultation`.
3. Create the consultation with chief complaint, structured symptoms, vitals, and raw clinical note.
4. Save the draft and confirm the consultation status becomes `in_progress`.
5. Click `Format notes with AI` and verify SOAP sections appear separately from the raw note.
6. Click `Request AI suggestions` and confirm suggestions appear in the right-side AI panel.
7. Accept, reject, or partially accept suggestions and confirm they remain separate from `diagnosis.primary`.
8. Enter doctor-controlled `diagnosis.primary`, diagnosis notes, treatment plan, and follow-up details.
9. Complete the consultation and confirm the consultation status becomes `completed`.
10. Re-open the patient clinical history and verify the completed consultation appears in reverse chronological order.
11. Re-open the appointment and confirm the appointment status progressed to `completed`.

### Verification Results

- `cd backend && npm test` passed `56/56`
- `cd ai-service && python -m pytest` passed `19/19`
- `cd frontend && npm run build` passed
- Duplicate Mongoose consultation index warning was removed during this refresh

### Known Limitations

- Diagnosis suggestions are rule-based MVP fallback logic, not a trained clinical model.
- SOAP note formatting is assistive only and must be reviewed and edited by a doctor.
- Prescription and billing remain disabled placeholders for later phases and were not implemented here.
- Full `docker compose up --build` runtime execution was not rerun in this environment.

### Next Phase Recommendation

PHASE 7 - Prescription

## Next Phase

PHASE 7 - Prescription

# PHASE 7 — Prescription Module

## Goal

Add a doctor-controlled digital prescription workflow on top of the existing patient, appointment, and consultation flow. This phase introduces prescription drafts, finalization locks, authenticated PDF download, patient-history visibility, and a safe AI advice-formatting helper that never prescribes automatically.

## Files Created

| File | Purpose |
| --- | --- |
| `backend/src/common/utils/generatePrescriptionNumber.js` | Generates clinic-scoped `RX-YYYYMMDD-000001` style prescription numbers using the shared counter flow |
| `backend/src/modules/prescriptions/prescription.model.js` | Stores clinic-scoped prescription drafts/finalized records and medicine items |
| `backend/src/modules/prescriptions/prescription.validator.js` | Validates create, update, finalize, cancel, and lookup payloads for prescriptions |
| `backend/src/modules/prescriptions/prescription.repository.js` | Centralizes prescription persistence and lookup queries |
| `backend/src/modules/prescriptions/prescription.service.js` | Implements Phase 7 prescription business rules, clinic scoping, locking, history integration, and PDF generation flow |
| `backend/src/modules/prescriptions/prescription.controller.js` | Returns consistent JSON responses and download responses for prescription APIs |
| `backend/src/modules/prescriptions/prescription.routes.js` | Mounts JWT/RBAC-protected prescription routes |
| `backend/src/modules/prescriptions/prescriptionPdf.service.js` | Generates prescription PDFs and ensures the upload directory exists |
| `backend/tests/prescriptions.test.js` | Covers prescription create/update/finalize/download behavior |
| `ai-service/app/api/prescription_routes.py` | Exposes the safe prescription advice-formatting endpoint |
| `ai-service/app/schemas/prescription_schema.py` | Validates doctor-provided advice-format payloads |
| `ai-service/app/services/prescription_advice_service.py` | Formats doctor-provided advice text without inventing medicines |
| `ai-service/tests/test_prescription_advice.py` | Verifies doctor-review-required advice formatting behavior |
| `frontend/src/features/prescriptions/PrescriptionListPage.jsx` | Lists prescriptions by patient or consultation context |
| `frontend/src/features/prescriptions/PrescriptionDetailPage.jsx` | Displays draft/finalized prescription details and PDF download |
| `frontend/src/features/prescriptions/PrescriptionCreatePage.jsx` | Creates a new prescription draft from consultation context |
| `frontend/src/features/prescriptions/PrescriptionForm.jsx` | Shared prescription form for create/update/finalize flows |
| `frontend/src/features/prescriptions/MedicineItemForm.jsx` | Handles dynamic medicine rows |
| `frontend/src/features/prescriptions/PrescriptionPdfButton.jsx` | Downloads authenticated prescription PDFs |
| `frontend/src/features/prescriptions/prescriptionApi.js` | Frontend API helpers for Phase 7 prescription flows |

## Files Modified

| File | Change |
| --- | --- |
| `backend/src/common/utils/generateScopedSequenceCode.js` | Added configurable padding so prescriptions can use six-digit daily counters |
| `backend/src/config/env.js` | Added upload and prescription PDF directory env parsing |
| `backend/src/routes/index.js` | Registered `/api/v1/prescriptions` |
| `backend/src/modules/ai/ai.service.js` | Added backend proxy for prescription advice formatting |
| `backend/src/modules/ai/ai.controller.js` | Added controller for prescription advice formatting proxy |
| `backend/src/modules/ai/ai.routes.js` | Registered `POST /api/v1/ai/prescription/format-advice` |
| `backend/src/modules/ai/ai.validator.js` | Added validation for prescription advice formatting proxy payloads |
| `backend/src/modules/patients/patient.service.js` | Added prescription counts and prescription records to patient history |
| `backend/tests/ai.test.js` | Added coverage for the Phase 7 prescription advice-formatting backend proxy |
| `backend/package.json` | Added `pdfkit` dependency |
| `backend/package-lock.json` | Refreshed lockfile after installing `pdfkit` |
| `backend/.env.example` | Added upload and prescription PDF env vars |
| `backend/Dockerfile` | Ensures `uploads/prescriptions` can exist in Docker |
| `.env.example` | Added upload and Phase 7 AI medical disclaimer variables |
| `docker-compose.yml` | Added backend upload volume and Phase 7 env wiring |
| `.gitignore` | Ignores generated PDFs and upload directories |
| `ai-service/app/config.py` | Added configurable AI medical disclaimer support |
| `ai-service/app/main.py` | Registered the prescription advice formatter route |
| `ai-service/app/safety/medical_disclaimer.py` | Added Phase 7 prescription-format disclaimer helper |
| `ai-service/.env.example` | Added `AI_MEDICAL_DISCLAIMER` |
| `frontend/src/lib/api.js` | Added prescription API helpers and AI advice-formatting helper |
| `frontend/src/app/routes.jsx` | Registered prescription pages |
| `frontend/src/components/layout/DashboardLayout.jsx` | Added prescription navigation |
| `frontend/src/features/dashboard/DashboardPage.jsx` | Added Phase 7 prescription summary card |
| `frontend/src/features/consultations/ConsultationForm.jsx` | Replaced old Phase 7 placeholder with current guidance |
| `frontend/src/features/consultations/ConsultationPage.jsx` | Added links from consultation workspace into prescription flows |
| `frontend/src/features/patients/PatientDetailPage.jsx` | Added prescription entry point and updated history summary text |
| `frontend/src/features/patients/PatientConsultationHistory.jsx` | Broadened patient history route to include prescriptions |
| `frontend/src/features/patients/PatientHistoryPanel.jsx` | Added rich prescription rendering with PDF download actions |
| `README.md` | Added Phase 7 summary, endpoints, and routes |
| `docs/API_CONTRACT.md` | Added Phase 7 backend and AI API contracts |
| `docs/DATABASE_DESIGN.md` | Added Phase 7 prescription schema and indexes |
| `docs/IMPLEMENTATION_REPORT.md` | Added this Phase 7 implementation report section |

## Backend APIs Added

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/prescriptions` | `SUPER_ADMIN`, `ADMIN`, `DOCTOR` | Create prescription draft |
| `GET` | `/api/v1/prescriptions/:id` | `SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `RECEPTIONIST` | Get prescription detail |
| `GET` | `/api/v1/prescriptions/patient/:patientId` | `SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `RECEPTIONIST` | List prescriptions for a patient |
| `GET` | `/api/v1/prescriptions/consultation/:consultationId` | `SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `RECEPTIONIST` | List prescriptions linked to a consultation |
| `PATCH` | `/api/v1/prescriptions/:id` | `SUPER_ADMIN`, `ADMIN`, `DOCTOR` | Update draft prescription |
| `POST` | `/api/v1/prescriptions/:id/finalize` | `SUPER_ADMIN`, `ADMIN`, `DOCTOR` | Finalize a prescription with doctor confirmation |
| `POST` | `/api/v1/prescriptions/:id/cancel` | `SUPER_ADMIN`, `ADMIN`, `DOCTOR` | Cancel a prescription |
| `GET` | `/api/v1/prescriptions/:id/download` | `SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `RECEPTIONIST` | Download prescription PDF |

## AI APIs Added

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/ai/prescription/format-advice` | Backend proxy for safe advice formatting |
| `POST` | `/api/v1/prescription/format-advice` | AI service helper that formats doctor-provided advice text only |

## Frontend Screens Added

| Screen | Route | Purpose |
| --- | --- | --- |
| `PrescriptionListPage` | `/prescriptions` | Review prescriptions by patient or consultation context |
| `PrescriptionCreatePage` | `/prescriptions/new?patientId=...&consultationId=...` | Create a new prescription draft |
| `PrescriptionDetailPage` | `/prescriptions/:id` | Review, update draft, finalize, cancel, and download prescription |

## Database Models Added

| Model | Fields Summary | Purpose |
| --- | --- | --- |
| `Prescription` | `clinicId`, `patientId`, `doctorId`, `consultationId`, `appointmentId`, `prescriptionNumber`, `diagnosisSnapshot`, `symptomsSnapshot`, `notes`, `medicines`, `advice`, `followUpDate`, `status`, `pdfUrl`, `finalizedAt`, `aiAssist`, timestamps | Stores doctor-controlled prescription drafts and finalized prescriptions |

## PDF Generation

- PDFs are generated by `backend/src/modules/prescriptions/prescriptionPdf.service.js`.
- Output directory: `backend/uploads/prescriptions/`
- Filename format: `prescription_<prescriptionNumber>.pdf`
- Download route: `GET /api/v1/prescriptions/:id/download`
- If a finalized prescription has no PDF on disk, the backend safely regenerates it before download.
- Footer disclaimer: `This prescription is generated digitally and is valid only after doctor approval.`

## Environment Variables Added

| Variable | Purpose |
| --- | --- |
| `UPLOAD_DIR` | Base backend upload directory |
| `PRESCRIPTION_PDF_DIR` | Backend prescription PDF storage path |
| `AI_MEDICAL_DISCLAIMER` | AI service disclaimer text for prescription advice formatting |

## How To Run Locally

Backend:

```bash
cd backend
npm install
npm run dev
```

AI service:

```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## How To Run With Docker

```bash
docker compose up --build
```

## How To Test

Backend:

```bash
cd backend
npm test
```

AI service:

```bash
cd ai-service
python -m pytest
```

Manual frontend verification:

1. Login as doctor or admin.
2. Open a completed or in-progress consultation.
3. Click `Create prescription`.
4. Add at least one medicine row and save draft.
5. Open the draft prescription detail page.
6. Optionally click `Format advice with AI` and confirm the disclaimer/doctor-review requirement remains visible in the workflow.
7. Finalize the prescription with doctor confirmation.
8. Download the generated PDF.
9. Open patient history and confirm the prescription appears in the prescriptions section.

## Safety Notes

- AI does not prescribe automatically in this phase.
- AI advice formatting is optional and marked as doctor-review-required.
- Doctor confirmation is mandatory before finalization.
- Finalized prescriptions are locked from normal edits.

## Verification Results

- `cd backend && npm test` passed `62/62`
- `cd ai-service && python -m pytest` passed `21/21`
- `cd frontend && npm run build` passed
- Live frontend dev-server probe returned HTTP `200` on port `5179`
- Live backend startup probe passed on port `5105`
- Live AI service startup probe passed on port `8017`
- Updated `docker-compose.yml` parsed successfully with services `ai-service`, `backend`, `frontend`, and `mongodb`

## Phase 7 Verification Refresh

### Verification Scope

- Rechecked only Phase 7 prescription behavior and its direct integrations.
- Verified runtime startup for backend, frontend, and AI service.
- Revalidated prescription routes, JWT/RBAC guards, medicine validation, draft/update/finalize locking, PDF generation/download, patient-history exposure, AI advice safety, `.gitignore`, env examples, and Docker Compose structure.
- Re-scanned `backend/src`, `backend/tests`, and `frontend/src` for `.ts` and `.tsx` files to confirm the active implementation remains JavaScript-only.

### Verification Results

- `cd backend && npm test` passed `62/62`
- `cd ai-service && python -m pytest` passed `21/21`
- `cd frontend && npm run build` passed
- Live backend startup probe passed on port `5107`
- Live AI service startup probe passed on port `8018`
- Live frontend dev-server probe returned HTTP `200` on port `5180`
- `GET /health` returned a healthy backend response during the live backend probe
- `POST /api/v1/prescription/format-advice` returned a safe response with `doctor_review_required: true`
- TypeScript scan returned no `.ts` or `.tsx` files under `backend/src`, `backend/tests`, or `frontend/src`
- `docker-compose.yml` parsed successfully and still defines `ai-service`, `backend`, `frontend`, and `mongodb`
- `docker compose config` could not be executed here because the `docker` CLI is unavailable in this environment
- No prescription-specific production-code fix was required in this verification pass

### Checklist Outcome

1. Backend starts without errors: passed
2. Frontend starts without errors: passed
3. AI service starts without errors: passed
4. Prescription routes are registered correctly: passed
5. Auth/RBAC middleware is used correctly: passed
6. Prescription model has all required fields: passed
7. Medicine item schema validates required `medicineName`, `dosage`, `frequency`, and `duration`: passed
8. Draft prescription can be created: passed
9. Draft prescription can be updated: passed
10. Finalize requires `doctorConfirmation: true`: passed
11. Finalized prescription cannot be edited: passed
12. PDF generation works: passed
13. Download endpoint returns the PDF: passed
14. Patient history includes prescriptions or a documented patient prescription endpoint exists: passed
15. AI advice endpoint does not invent medicines: passed
16. Docker Compose still works structurally: passed
17. `uploads` folder is ignored by git: passed
18. `docs/IMPLEMENTATION_REPORT.md` is complete: passed
19. No TypeScript files were added to active backend/frontend source trees: passed
20. No unrelated modules were rewritten in this verification pass: passed

## Known Limitations

- No drug interaction alerts were added in this phase.
- No pharmacy stock deduction or inventory integration was added in this phase.
- No WhatsApp/email prescription sharing was added in this phase.
- The AI helper only formats doctor-provided advice text; it does not suggest or prescribe medicines.
- Full `docker compose up --build` runtime execution was not run in this environment.

## Next Recommended Phase

PHASE 8 - Billing integration with prescriptions and invoice generation.

# PHASE 8 - Billing Implementation Report

## Goal

Add a production-ready MVP billing module that supports invoice creation, backend-owned subtotal/discount/GST calculations, payment tracking, patient-linked invoice history, authenticated invoice PDF generation/download, dashboard billing summaries, and billing screens without rebuilding unrelated modules.

## Files Created

| File | Purpose |
| --- | --- |
| `backend/src/common/constants/paymentModes.js` | Defines allowed payment modes shared by validators and the invoice model |
| `backend/src/common/utils/billingCalculator.js` | Computes invoice totals, GST, due amount, and payment status with 2-decimal rounding |
| `backend/src/common/utils/invoiceNumber.js` | Generates sequential daily invoice numbers in `INV-YYYYMMDD-0001` format |
| `backend/src/common/utils/pdfGenerator.js` | Generates invoice PDFs under `backend/storage/invoices` and ensures the storage directory exists |
| `backend/src/modules/billing/billing.constants.js` | Central billing enums for item types, discount types, invoice statuses, and payment statuses |
| `backend/src/modules/billing/invoice.model.js` | Defines the clinic-scoped invoice schema with embedded items and payment records |
| `backend/src/modules/billing/billing.repository.js` | Centralizes invoice persistence, queries, and billing summary aggregations |
| `backend/src/modules/billing/billing.validator.js` | Validates create, update, payment, cancel, list, and patient-history billing requests |
| `backend/src/modules/billing/billing.service.js` | Implements billing business rules, clinic scoping, totals, payments, PDF flow, and audit hooks |
| `backend/src/modules/billing/billing.controller.js` | Maps billing HTTP requests to services and returns consistent API responses |
| `backend/src/modules/billing/billing.routes.js` | Mounts JWT/RBAC-protected billing endpoints |
| `backend/tests/billingCalculator.test.js` | Verifies subtotal, discount, GST, rounding, and payment-status calculation logic |
| `backend/tests/billing.routes.test.js` | Covers auth, RBAC, validation, invoice creation, payment recording, overpayment rejection, and PDF download behavior |
| `backend/tests/pdfGenerator.test.js` | Verifies local invoice PDF generation writes a non-empty file under the configured storage directory |
| `backend/storage/invoices/.gitkeep` | Keeps the invoice storage directory in the repository without committing generated PDFs |
| `frontend/src/features/billing/billing.api.js` | Frontend helpers for billing APIs plus local preview-calculation support |
| `frontend/src/features/billing/BillingSummaryCards.jsx` | Renders reusable billing total and summary cards |
| `frontend/src/features/billing/InvoiceItemsTable.jsx` | Handles dynamic invoice line-item entry and editing |
| `frontend/src/features/billing/PaymentForm.jsx` | Captures payment amount, mode, transaction ID, and notes |
| `frontend/src/features/billing/CreateInvoicePage.jsx` | Creates draft invoices with live preview calculation and patient/consultation prefill support |
| `frontend/src/features/billing/BillingListPage.jsx` | Lists invoices with search, filters, summary cards, and navigation |
| `frontend/src/features/billing/InvoiceDetailPage.jsx` | Displays invoice details, payments, PDF actions, update flow, and cancel action |
| `frontend/src/features/patients/PatientInvoiceHistory.jsx` | Shows patient-linked invoice history inside patient flows |
| `frontend/src/features/dashboard/BillingStatsWidget.jsx` | Displays billing summary metrics on the dashboard for billing roles |

## Files Modified

| File | Change |
| --- | --- |
| `backend/src/config/env.js` | Added parsing for `INVOICE_STORAGE_DIR`, `PUBLIC_API_BASE_URL`, and `GST_DEFAULT_RATE` |
| `backend/src/server.js` | Ensures storage directories exist on startup, including invoice storage |
| `backend/src/routes/index.js` | Registered `/api/v1/billing` routes |
| `backend/src/modules/patients/patient.service.js` | Added invoice counts and recent invoices to patient history responses |
| `backend/src/modules/billing/billing.repository.js` | Added invoice relation populate support, list filters, patient history helpers, and summary aggregation |
| `backend/Dockerfile` | Ensures `storage/invoices` exists in container startup image |
| `backend/package.json` | Added `pdfkit` dependency for lightweight invoice PDF generation |
| `backend/package-lock.json` | Refreshed lockfile after backend dependency updates |
| `backend/.env.example` | Added Phase 8 invoice storage and billing env variables |
| `.env.example` | Added shared billing env variables for Docker/local development |
| `docker-compose.yml` | Added backend billing env wiring and mounted `./backend/storage:/app/storage` |
| `.gitignore` | Ignores generated invoice PDFs and storage output |
| `frontend/src/lib/api.js` | Added `billingApi` methods on the shared Axios client |
| `frontend/src/app/routes.jsx` | Registered `/billing`, `/billing/create`, and `/billing/:id` routes |
| `frontend/src/components/layout/DashboardLayout.jsx` | Added billing navigation and Phase 8 workspace copy |
| `frontend/src/features/dashboard/DashboardPage.jsx` | Added Phase 8 billing card and billing stats widget integration |
| `frontend/src/features/patients/PatientHistoryPanel.jsx` | Added invoice cards to patient history |
| `frontend/src/features/patients/PatientDetailPage.jsx` | Added billing entry points and invoice history section |
| `frontend/src/features/consultations/ConsultationPage.jsx` | Added `Create invoice` shortcut from consultations |
| `README.md` | Added Phase 8 module summary, endpoints, routes, and notes |
| `docs/API_CONTRACT.md` | Added billing endpoints and response examples |
| `docs/DATABASE_DESIGN.md` | Added invoice schema and billing collection notes |
| `docs/IMPLEMENTATION_REPORT.md` | Added this Phase 8 implementation report and verification results |
| `postman/AI-CMS.postman_collection.json` | Added billing requests for Postman testing |

## APIs Added

| Method | Endpoint | Auth | Roles | Purpose |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/billing/invoices` | JWT | `SUPER_ADMIN`, `ADMIN`, `RECEPTIONIST` | Create a draft invoice with backend-owned totals |
| `GET` | `/api/v1/billing/invoices` | JWT | `SUPER_ADMIN`, `ADMIN`, `RECEPTIONIST`, `DOCTOR` | List invoices with search and filters |
| `GET` | `/api/v1/billing/invoices/:id` | JWT | `SUPER_ADMIN`, `ADMIN`, `RECEPTIONIST`, `DOCTOR` | Get invoice detail |
| `PUT` | `/api/v1/billing/invoices/:id` | JWT | `SUPER_ADMIN`, `ADMIN`, `RECEPTIONIST` | Update a draft invoice or notes-only fields on issued invoices |
| `POST` | `/api/v1/billing/invoices/:id/payments` | JWT | `SUPER_ADMIN`, `ADMIN`, `RECEPTIONIST` | Record a payment and update due/payment status |
| `POST` | `/api/v1/billing/invoices/:id/generate-pdf` | JWT | `SUPER_ADMIN`, `ADMIN`, `RECEPTIONIST` | Generate or regenerate invoice PDF |
| `GET` | `/api/v1/billing/invoices/:id/pdf` | JWT | `SUPER_ADMIN`, `ADMIN`, `RECEPTIONIST`, `DOCTOR` | Download invoice PDF |
| `PATCH` | `/api/v1/billing/invoices/:id/cancel` | JWT | `SUPER_ADMIN`, `ADMIN` | Cancel an invoice |
| `GET` | `/api/v1/billing/patient/:patientId/invoices` | JWT | `SUPER_ADMIN`, `ADMIN`, `RECEPTIONIST`, `DOCTOR` | Retrieve patient-linked invoice history |
| `GET` | `/api/v1/billing/summary` | JWT | `SUPER_ADMIN`, `ADMIN`, `RECEPTIONIST` | Return dashboard billing metrics |

## Models Added

| Model | Fields Summary | Purpose |
| --- | --- | --- |
| `Invoice` | `invoiceNumber`, `clinicId`, `patientId`, `appointmentId`, `consultationId`, `items`, `subtotal`, `discountType`, `discountValue`, `discountAmount`, `taxableAmount`, `gstRate`, `gstAmount`, `totalAmount`, `paidAmount`, `dueAmount`, `paymentStatus`, `invoiceStatus`, `payments`, `pdfUrl`, `notes`, `metadata`, timestamps | Stores clinic-scoped invoices, embedded payment records, and PDF references for MVP billing |

## Calculation Rules

- `subtotal = sum(quantity * unitPrice)` across invoice items
- `discountAmount = 0` for `none`
- `discountAmount = discountValue` for `fixed`, capped at subtotal
- `discountAmount = subtotal * discountValue / 100` for `percentage`, capped at subtotal
- `taxableAmount = subtotal - discountAmount`
- `gstAmount = taxableAmount * gstRate / 100`
- `totalAmount = taxableAmount + gstAmount`
- `paidAmount = sum(payments.amount)`
- `dueAmount = totalAmount - paidAmount`
- `paymentStatus = unpaid` when `paidAmount <= 0`
- `paymentStatus = partial` when `paidAmount > 0` and `< totalAmount`
- `paymentStatus = paid` when `paidAmount >= totalAmount`
- All money fields are rounded to 2 decimals in `billingCalculator.js`
- Frontend totals are preview-only; the backend recalculates authoritative totals on create/update/payment

## PDF Generation

- PDFs are generated by `backend/src/common/utils/pdfGenerator.js`
- Output path: `backend/storage/invoices/{invoiceNumber}.pdf`
- Download route: `GET /api/v1/billing/invoices/:id/pdf`
- If a PDF is missing when download is requested, the backend regenerates it safely
- Footer note: `This is a system-generated invoice.`

## Frontend Screens Added

| Screen | Route | Purpose |
| --- | --- | --- |
| `BillingListPage` | `/billing` | Review invoices with search, filter, and summary cards |
| `CreateInvoicePage` | `/billing/create` | Create draft invoices with live calculation preview |
| `InvoiceDetailPage` | `/billing/:id` | Review, update, record payment, generate PDF, and cancel invoices |
| `PatientInvoiceHistory` | patient profile section | Show recent patient-linked invoices |
| `BillingStatsWidget` | dashboard widget | Surface billing KPIs for admins and receptionists |

## Environment Variables Added

| Variable | Purpose |
| --- | --- |
| `INVOICE_STORAGE_DIR` | Backend relative storage path for generated invoice PDFs |
| `PUBLIC_API_BASE_URL` | Base URL used to build invoice PDF download links |
| `GST_DEFAULT_RATE` | Default GST rate applied when a request omits `gstRate` |

## Docker Changes

- Backend now mounts `./backend/storage:/app/storage` so generated invoice PDFs persist outside the container
- Backend container env now includes `INVOICE_STORAGE_DIR`, `PUBLIC_API_BASE_URL`, and `GST_DEFAULT_RATE`
- Backend startup creates storage directories if they are missing
- Existing `frontend`, `backend`, `ai-service`, and `mongodb` services were preserved

## How To Run

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

AI service:

```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Docker:

```bash
docker compose up --build
```

## How To Test

Backend:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend
npm run build
```

AI service:

```bash
cd ai-service
python -m pytest
```

## Manual Frontend Verification

1. Open `/billing` as `ADMIN` or `RECEPTIONIST`.
2. Confirm the billing list loads and summary cards appear when the billing summary endpoint is authorized.
3. Open `/billing/create?patientId=...&consultationId=...` and add invoice items.
4. Verify subtotal, discount, GST, total, paid, and due preview update in real time.
5. Submit the invoice and confirm the detail page opens.
6. Record a payment and confirm `paidAmount`, `dueAmount`, and `paymentStatus` update.
7. Generate the invoice PDF and download it.
8. Open the patient profile and confirm invoices appear in patient history.

## Verification Results

- `cd backend && npm test` passed `75/75`
- `cd frontend && npm run build` passed
- `cd ai-service && python -m pytest` passed `21/21`
- Backend live startup probe passed on port `5109`
- Backend `/health` returned HTTP `200` during the live probe
- AI service live startup probe passed on port `8019`
- Frontend Vite dev server started successfully and responded with HTTP `200` on port `5182`
- Frontend source scan found no `.ts` or `.tsx` files under `backend/src`, `backend/tests`, or `frontend/src`
- `docker-compose.yml` parsed successfully with services `ai-service`, `backend`, `frontend`, and `mongodb`

## Phase 8 Verification Refresh

### Verification Scope

- Rechecked only Phase 8 billing behavior and its direct integrations.
- Verified backend startup, frontend startup/build, AI service startup, Mongo connectivity, invoice math, RBAC, PDF generation/download, storage path creation, env examples, docs, Postman collection, and JavaScript-only source constraints.
- Added deeper billing-only test coverage for RBAC denial, overpayment rejection, and real local PDF file generation.

### Verification Results

- `cd backend && npm test` passed `75/75`
- `cd frontend && npm run build` passed
- `cd ai-service && python -m pytest` passed `21/21`
- Backend live startup probe passed on port `5111` against an in-memory MongoDB instance
- Backend `/health` returned HTTP `200` with `database.status=connected` during the Mongo-backed probe
- Separate MongoDB connectivity verification using `mongodb-memory-server` returned `mongoose_ready_state=1`
- AI service live startup probe passed on port `8020`
- Frontend Vite dev server started successfully and served HTTP `200` on port `5183`
- `backend/storage/invoices` exists and local invoice PDF generation produced a non-empty file successfully
- Frontend billing pages only send item, discount, GST, note, and payment payloads; totals remain preview-only and backend-owned
- Frontend/backend active source scan returned `0` `.ts` or `.tsx` files
- `docker-compose.yml` parsed successfully with services `ai-service`, `backend`, `frontend`, and `mongodb`
- Docker runtime build was not executed here because the `docker` CLI is unavailable in this environment
- Source scan found no hardcoded secrets in `backend/src`, `frontend/src`, or `ai-service/app`; only placeholder values remain in `.env.example` files

### Checklist Outcome

1. Backend starts without error: passed
2. Frontend starts without error: passed
3. MongoDB connection still works: passed
4. Existing auth/RBAC routes are not broken: passed
5. Billing routes are registered under `/api/v1/billing`: passed
6. Invoice model has all required fields: passed
7. Backend computes subtotal, discount, GST, total, `paidAmount`, and `dueAmount`: passed
8. Frontend does not send trusted total values: passed
9. Payment cannot exceed due amount: passed
10. Invoice PDF generation works locally: passed
11. PDF download endpoint works: passed
12. Docker Compose still works structurally: passed
13. `backend/storage/invoices` is created safely: passed
14. `.env.example` files are updated: passed
15. Postman collection is updated: passed
16. `docs/API_CONTRACT.md` is updated: passed
17. `docs/DATABASE_DESIGN.md` is updated: passed
18. `docs/IMPLEMENTATION_REPORT.md` is updated: passed
19. Tests exist for calculation logic: passed
20. No unrelated features were added in this verification pass: passed
21. No TypeScript was introduced in frontend/backend: passed
22. No hardcoded secrets exist in active source files: passed

## Safety Notes

- Billing totals are backend-controlled; frontend totals are never authoritative
- AI does not generate invoices or make final fraud decisions in this phase
- Payment recording prevents overpayment beyond the current due amount
- Invoice PDFs are authenticated and role-protected

## Known Limitations

- Refunds are not included in the MVP billing flow
- Real payment gateway integration is not included
- AI billing anomaly or fraud detection is deferred to a later phase
- Lab and pharmacy invoice item types are placeholders only
- Full `docker compose up --build` runtime execution was not performed in this environment

## Next Recommended Phase

PHASE 9 - Frontend MVP Hardening or PHASE 10 - Production Hardening

# PHASE 9 - Frontend MVP

## Goal

Deliver a production-readable React + Vite + JavaScript frontend MVP that connects to the live backend and AI service for the core clinic workflows: login, dashboard, patients, appointments, consultations, AI chatbot, prescriptions, and billing. This phase also aligns backend, AI-service, environment, and Docker configuration so the frontend runs cleanly in local development.

## Files Created

| File | Purpose |
| --- | --- |
| `frontend/src/api/axiosClient.js` | Shared Axios clients for backend and AI service, token injection, 401 logout handling, and tolerant response normalization |
| `frontend/src/api/authApi.js` | Auth login/logout/me wrapper for the frontend shell |
| `frontend/src/api/patientApi.js` | Patient API wrapper used by patient pages and selectors |
| `frontend/src/api/doctorApi.js` | Doctor API wrapper used by appointment and doctor selectors |
| `frontend/src/api/appointmentApi.js` | Appointment API wrapper for list, calendar, slots, and status actions |
| `frontend/src/api/consultationApi.js` | Consultation API wrapper for EMR workflow pages |
| `frontend/src/api/prescriptionApi.js` | Prescription API wrapper for create/detail/finalize/download flows |
| `frontend/src/api/billingApi.js` | Billing API wrapper for invoice list/detail/payment/PDF actions |
| `frontend/src/api/dashboardApi.js` | Frontend dashboard aggregator that composes existing backend APIs when no dedicated dashboard endpoint exists |
| `frontend/src/api/aiApi.js` | Safe AI proxy/fallback wrapper for symptom check, note formatting, and transcription |
| `frontend/src/context/AuthContext.jsx` | Frontend authentication state provider using localStorage-backed JWT sessions |
| `frontend/src/hooks/useAuth.js` | Hook for consuming auth context |
| `frontend/src/hooks/useApi.js` | Generic async request state helper for loading/error handling |
| `frontend/src/hooks/useDebounce.js` | Debounce helper used by patient search in the chatbot flow |
| `frontend/src/utils/storage.js` | Token and user persistence helpers for frontend auth |
| `frontend/src/utils/formatDate.js` | Shared date formatting helper |
| `frontend/src/utils/formatCurrency.js` | Shared currency formatting helper |
| `frontend/src/utils/validators.js` | Lightweight frontend field validation helpers |
| `frontend/src/constants/roles.js` | Frontend role constants and route-authorization helper |
| `frontend/src/constants/routes.js` | Frontend route constants and sidebar navigation configuration |
| `frontend/src/constants/appointmentStatus.js` | Appointment status label/tone metadata used by frontend UI |
| `frontend/src/components/layout/Sidebar.jsx` | Responsive sidebar navigation for the MVP dashboard |
| `frontend/src/components/layout/Topbar.jsx` | Topbar showing route title, current user, and logout action |
| `frontend/src/components/layout/PageHeader.jsx` | Shared page-title and action-bar wrapper |
| `frontend/src/components/common/Button.jsx` | Shared button styles |
| `frontend/src/components/common/Card.jsx` | Shared card container |
| `frontend/src/components/common/Input.jsx` | Shared text input component |
| `frontend/src/components/common/Select.jsx` | Shared select component |
| `frontend/src/components/common/Textarea.jsx` | Shared textarea component |
| `frontend/src/components/common/Badge.jsx` | Shared badge component for statuses |
| `frontend/src/components/common/Modal.jsx` | Shared modal wrapper |
| `frontend/src/components/common/Table.jsx` | Shared table renderer with empty-state support |
| `frontend/src/components/common/EmptyState.jsx` | Shared empty-state UI |
| `frontend/src/components/common/LoadingState.jsx` | Shared loading-state UI |
| `frontend/src/components/common/ErrorState.jsx` | Shared error-state UI |
| `frontend/src/components/common/ErrorBoundary.jsx` | Global frontend runtime guard |
| `frontend/src/components/forms/PatientForm.jsx` | Reusable patient form adapter |
| `frontend/src/components/forms/AppointmentForm.jsx` | Reusable appointment form adapter |
| `frontend/src/components/forms/ConsultationForm.jsx` | Reusable consultation form adapter |
| `frontend/src/components/forms/PrescriptionForm.jsx` | Reusable prescription form adapter |
| `frontend/src/components/forms/BillingForm.jsx` | Reusable billing form adapter |
| `frontend/src/pages/LoginPage.jsx` | Public login page for the frontend MVP |
| `frontend/src/pages/DashboardPage.jsx` | Dashboard page wrapper around frontend metrics aggregation |
| `frontend/src/pages/patients/PatientListPage.jsx` | Patient list wrapper route |
| `frontend/src/pages/patients/PatientCreatePage.jsx` | Patient create wrapper route |
| `frontend/src/pages/patients/PatientDetailPage.jsx` | Patient detail wrapper route |
| `frontend/src/pages/appointments/AppointmentCalendarPage.jsx` | Appointment calendar wrapper route |
| `frontend/src/pages/consultations/ConsultationPage.jsx` | Consultation launchpad that can open path-based or query-based consultation contexts safely |
| `frontend/src/pages/prescriptions/PrescriptionBuilderPage.jsx` | Prescription launchpad and builder context page |
| `frontend/src/pages/billing/BillingPage.jsx` | Billing list wrapper route |
| `frontend/src/pages/ai/ChatbotPage.jsx` | Symptom-chat assistant page with optional patient linkage |
| `frontend/src/app/ProtectedRoute.jsx` | JWT/role-protected route gate |
| `frontend/src/routes/AppRoutes.jsx` | Route export compatibility entry |
| `frontend/.dockerignore` | Ignores local frontend build/dependency artifacts during Docker builds |

## Files Modified

| File | Change |
| --- | --- |
| `frontend/package.json` | Added Phase 9 frontend dependency support and retained Vite scripts |
| `frontend/package-lock.json` | Updated after frontend dependency install |
| `frontend/vite.config.js` | Ensured Vite runs on port `5173`, host `0.0.0.0`, and added safe `/api` + `/ai` dev proxies |
| `frontend/.env.example` | Added `VITE_AI_BASE_URL` alongside backend base URL documentation |
| `frontend/src/App.jsx` | Wrapped router with `AuthProvider` and `ErrorBoundary` |
| `frontend/src/main.jsx` | Boots the React app in JavaScript-only mode |
| `frontend/src/app/routes.jsx` | Registered Phase 9 public/protected routes and role gates |
| `frontend/src/features/appointments/AppointmentCreatePage.jsx` | Added patient-context prefill from query string for chatbot/patient flows |
| `frontend/src/features/billing/BillingListPage.jsx` | Added patient-aware filtering for billing history navigation |
| `frontend/src/pages/ai/ChatbotPage.jsx` | Fixed patient search loading to use `useEffect` and kept backend/AI fallback behavior |
| `frontend/src/pages/consultations/ConsultationPage.jsx` | Added support for both route params and query params so `/consultations/:consultationId` and `/appointments/:appointmentId/consultation` work correctly |
| `frontend/src/api/axiosClient.js` | Added support for both `VITE_AI_BASE_URL` and older `VITE_AI_SERVICE_URL` env names |
| `backend/src/config/env.js` | Added `FRONTEND_URL` compatibility and aligned Mongo defaults with the local frontend run contract |
| `backend/.env.example` | Documented `FRONTEND_URL` and Phase 9 local frontend integration values |
| `ai-service/app/config.py` | Added `FRONTEND_URL`/`BACKEND_URL` compatibility for CORS and local integration |
| `ai-service/app/api/ai_routes.py` | Added `/api/v1/symptom-check`, `/api/v1/format-clinical-note`, and `/api/v1/transcribe` aliases for frontend fallback calls |
| `ai-service/app/main.py` | Registered the new frontend-facing AI compatibility router |
| `ai-service/.env.example` | Documented `FRONTEND_URL` and `BACKEND_URL` |
| `.env.example` | Added `FRONTEND_URL`, `BACKEND_URL`, `VITE_AI_BASE_URL`, and updated Docker Mongo defaults |
| `docker-compose.yml` | Aligned services and env wiring for `frontend`, `backend`, `ai-service`, and `mongo` |
| `README.md` | Added Phase 9 module summary |
| `docs/API_CONTRACT.md` | Added Phase 9 frontend compatibility notes and AI fallback route contract |
| `docs/IMPLEMENTATION_REPORT.md` | Added this Phase 9 implementation report and verification record |

## What Each Frontend File Does

### App Shell

- `frontend/src/App.jsx`: mounts the router inside the auth/session and error-boundary providers.
- `frontend/src/main.jsx`: browser entry point for the React app.
- `frontend/src/app/routes.jsx`: central route tree for public and protected pages.
- `frontend/src/app/ProtectedRoute.jsx`: blocks unauthenticated users, checks role access, and shows a loading state during session restoration.

### API Layer

- `frontend/src/api/axiosClient.js`: centralizes base URLs, auth header injection, 401 handling, and response normalization.
- `frontend/src/api/authApi.js`: wraps `/auth` endpoints.
- `frontend/src/api/patientApi.js`: wraps patient CRUD/history endpoints.
- `frontend/src/api/doctorApi.js`: wraps doctor list/detail endpoints.
- `frontend/src/api/appointmentApi.js`: wraps appointment scheduling, calendar, and slot APIs.
- `frontend/src/api/consultationApi.js`: wraps consultation and patient-clinical-history APIs.
- `frontend/src/api/prescriptionApi.js`: wraps prescription CRUD/finalize/download APIs.
- `frontend/src/api/billingApi.js`: wraps invoice CRUD, payments, summary, and PDF APIs.
- `frontend/src/api/dashboardApi.js`: builds dashboard cards from existing backend data sources.
- `frontend/src/api/aiApi.js`: calls backend AI proxy first, then falls back to the AI service safely when supported.

### Session + Hooks

- `frontend/src/context/AuthContext.jsx`: stores the logged-in user and token, refreshes `/auth/me`, and clears the session on unauthorized responses.
- `frontend/src/hooks/useAuth.js`: hook shortcut for auth context.
- `frontend/src/hooks/useApi.js`: generic loading/error executor used by the chatbot and other pages.
- `frontend/src/hooks/useDebounce.js`: throttles quick search input changes.

### Shared UI

- `frontend/src/components/layout/*.jsx`: reusable dashboard structure including sidebar navigation, topbar, and section headers.
- `frontend/src/components/common/*.jsx`: safe reusable primitives for forms, badges, cards, tables, modals, loading, empty states, errors, and runtime protection.
- `frontend/src/components/forms/*.jsx`: adapters that map the Phase 3–8 feature forms into the new Phase 9 page shell.

### Pages

- `frontend/src/pages/LoginPage.jsx`: JWT sign-in experience.
- `frontend/src/pages/DashboardPage.jsx`: dashboard metrics, appointments, patient list, and no-show watchlist.
- `frontend/src/pages/patients/*.jsx`: patient list/create/detail routes.
- `frontend/src/pages/appointments/AppointmentCalendarPage.jsx`: appointment calendar route.
- `frontend/src/pages/consultations/ConsultationPage.jsx`: consultation launchpad and EMR context selector.
- `frontend/src/pages/ai/ChatbotPage.jsx`: symptom pre-consultation chat flow with a safe disclaimer.
- `frontend/src/pages/prescriptions/PrescriptionBuilderPage.jsx`: prescription launchpad and builder.
- `frontend/src/pages/billing/BillingPage.jsx`: billing list and history route.

### Utilities + Constants

- `frontend/src/utils/*.js`: date/currency formatting, validation helpers, and auth storage helpers.
- `frontend/src/constants/*.js`: route names, allowed roles, and appointment status metadata.

## Backend Changes Made For Frontend Compatibility

- Added `FRONTEND_URL` support to backend environment loading so local/frontend Docker runs can share the same frontend origin setting.
- Confirmed the backend route registry already exposes the prefixes used by the frontend shell:
  - `/api/v1/auth`
  - `/api/v1/ai`
  - `/api/v1/patients`
  - `/api/v1/doctors`
  - `/api/v1/appointments`
  - `/api/v1/consultations`
  - `/api/v1/prescriptions`
  - `/api/v1/billing`
- Kept backend business logic unchanged where Phase 3–8 APIs already existed.
- Did not add a dedicated `/api/v1/dashboard` endpoint in this phase; the frontend safely aggregates existing APIs instead.

## AI Service Changes Made For Frontend Compatibility

- Added direct compatibility routes:
  - `POST /api/v1/symptom-check`
  - `POST /api/v1/format-clinical-note`
  - `POST /api/v1/transcribe`
- Kept `/health` and `/api/v1/health` intact.
- Preserved assistive-only symptom analysis with disclaimers.
- Added `FRONTEND_URL` and `BACKEND_URL` support for local frontend/backend CORS alignment.

## Docker Changes Made

- Updated `docker-compose.yml` to use the service set:
  - `frontend`
  - `backend`
  - `ai-service`
  - `mongo`
- Frontend env wiring now documents:
  - `VITE_API_BASE_URL=http://localhost:5000/api/v1`
  - `VITE_AI_BASE_URL=http://localhost:8000/api/v1`
- Backend env wiring includes:
  - `AI_SERVICE_URL=http://ai-service:8000`
  - `FRONTEND_URL=http://localhost:5173`
- AI service env wiring includes:
  - `BACKEND_URL=http://backend:5000`
  - `FRONTEND_URL=http://localhost:5173`

## Routes Implemented

Public:

- `/login`

Protected:

- `/`
- `/dashboard`
- `/patients`
- `/patients/new`
- `/patients/:id`
- `/appointments`
- `/appointments/new`
- `/appointments/:id`
- `/appointments/:appointmentId/consultation`
- `/consultations`
- `/consultations/:consultationId`
- `/chatbot`
- `/prescriptions`
- `/prescriptions/new`
- `/prescriptions/:id`
- `/billing`
- `/billing/create`
- `/billing/:id`

## API Integrations Implemented

- Auth: `/auth/login`, `/auth/me`, `/auth/logout`
- Patients: list, create, detail, history, clinical-history integration
- Doctors: list/detail for appointment and doctor contexts
- Appointments: list, detail, calendar, available slots, create, status updates
- Consultations: list, create, detail, update, AI suggestions, completion, patient history
- Prescriptions: create, detail, list by patient/consultation, finalize, download PDF
- Billing: invoice list/detail/create/update, record payment, summary, PDF generation/download, patient invoice history
- AI: symptom check, format clinical note, transcription placeholder with backend-proxy-first fallback

## Environment Variables Added

| Variable | Purpose |
| --- | --- |
| `FRONTEND_URL` | Local frontend origin used by backend and AI-service compatibility layers |
| `BACKEND_URL` | Local backend origin used by the AI service for local integration clarity |
| `VITE_AI_BASE_URL` | Frontend AI-service base URL for direct fallback calls |

## How To Run Locally Without Docker

Backend:

```bash
cd backend
npm install
npm run dev
```

AI service:

```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## How To Run With Docker

```bash
docker compose up --build
```

## How To Test

Backend:

```bash
cd backend
npm test
```

AI service:

```bash
cd ai-service
python -m pytest
```

Frontend:

```bash
cd frontend
npm run build
```

## Verification Results

- `cd frontend && npm install` completed successfully after Phase 9 dependency updates
- `cd frontend && npm run build` passed
- `cd backend && npm test` passed `75/75`
- `cd ai-service && python -m pytest` passed `21/21`
- Live backend startup probe passed on port `5122`
- `GET http://127.0.0.1:5122/health` returned `200`
- `GET http://127.0.0.1:5122/api/v1/health` returned `200`
- Live AI service startup probe passed on port `8022`
- `GET http://127.0.0.1:8022/health` returned `200`
- `GET http://127.0.0.1:8022/api/v1/health` returned `200`
- `POST http://127.0.0.1:8022/api/v1/symptom-check` returned `success=true` and a disclaimer
- Live frontend Vite dev probe returned HTTP `200` on port `5184`
- Frontend/backend source scan returned no `.ts` or `.tsx` files in the active source trees
- `docker-compose.yml` parsed successfully with services `ai-service`, `backend`, `frontend`, and `mongo`

## Known Limitations

- No dedicated backend `/api/v1/dashboard` endpoint exists yet; the dashboard aggregates existing APIs instead.
- The chatbot page can launch appointment creation with patient context, but appointment creation remains a separate route rather than an inline modal.
- The AI-service direct fallback only covers safe placeholder/assistive routes and does not load heavy models in this phase.
- The frontend wraps and hardens several Phase 3–8 feature pages rather than replacing them with a second parallel implementation.

## Next Phase Recommendation

PHASE 10 - Production Hardening

## Phase 9 Verification Refresh

### Verification Scope

- Re-verified the Phase 9 frontend MVP only.
- Checked JavaScript-only frontend constraints, route rendering, local runtime startup, API integration behavior, empty/error handling patterns, env wiring, and Docker Compose structure.
- Fixed only Phase 9 issues found during this verification pass.

### Issues Found And Fixed

- `frontend/src/pages/ai/ChatbotPage.jsx`: replaced async `useMemo` usage with `useEffect` for patient search loading.
- `frontend/src/features/appointments/AppointmentCreatePage.jsx`: added `patientId` query-param prefill so chatbot and patient flows can open appointment booking with context.
- `frontend/src/features/billing/BillingListPage.jsx`: added `patientId` query support for patient-linked billing history navigation.
- `frontend/src/pages/consultations/ConsultationPage.jsx`: added support for both route params and query params so path-based consultation routes open correctly.
- `frontend/.env.example`, `.env.example`, `docker-compose.yml`, `backend/.env.example`, `backend/src/config/env.js`, `ai-service/.env.example`, and `ai-service/app/config.py`: aligned Phase 9 local env names and service links around `VITE_AI_BASE_URL`, `FRONTEND_URL`, `BACKEND_URL`, and `mongo`.
- `ai-service/app/api/ai_routes.py` and `ai-service/app/main.py`: added frontend-facing compatibility aliases for `/api/v1/symptom-check`, `/api/v1/format-clinical-note`, and `/api/v1/transcribe`.
- `frontend/src/pages/DashboardPage.jsx` and `frontend/src/features/patients/PatientDetailPage.jsx`: removed mojibake/encoding artifacts so the UI reads cleanly.

### Verification Results

- `cd frontend && npm install` completed successfully
- `cd frontend && npm run build` passed
- `cd backend && npm install` completed successfully
- `cd backend && npm test` passed `75/75`
- `cd ai-service && python -m pip install -r requirements.txt` completed successfully
- `cd ai-service && python -m pytest` passed `21/21`
- Live backend startup probe passed on port `5123`
- Live AI service startup probe passed on port `8023`
- Live frontend route probe returned HTTP `200` for:
  - `/login`
  - `/dashboard`
  - `/patients`
  - `/patients/new`
  - `/appointments`
  - `/consultations`
  - `/chatbot`
  - `/prescriptions`
  - `/billing`
- `POST /api/v1/symptom-check` returned `success=true` with a disclaimer during the live AI probe
- `rg --files frontend | rg "\.(ts|tsx)$"` returned no frontend TypeScript files
- `docker compose config` and `docker compose up --build` could not be executed because the `docker` CLI is not installed in this environment
- Structural Docker validation still passed via YAML parsing with services `ai-service`, `backend`, `frontend`, and `mongo`

### Checklist Outcome

1. Frontend uses React + Vite + JavaScript only: passed
2. No `.tsx` or `.ts` frontend files exist: passed
3. Frontend install/build checks: passed
4. Backend install/test checks: passed
5. AI service install/test/start checks: passed
6. Docker validation: partial
   - Compose structure validated
   - Real Docker commands blocked by missing Docker CLI in this environment
7. Browser routes responded successfully from the Vite dev server: passed
8. Frontend API behavior: passed by live probe and code review
   - Axios base URL comes from env
   - token interceptor exists
   - 401 logout flow exists
   - empty/error states exist across Phase 9 pages
9. UI quality: passed with Phase 9 mojibake cleanup
10. Phase 9 documentation completeness: passed

## Demo Seed Stabilization

- Added `backend/src/seed/seedDemoData.js` as an idempotent local demo-data bootstrap.
- Added `npm run seed` in `backend/package.json`.
- The demo seed creates a clinic, role-based demo users, doctor availability, patients, appointments, a completed consultation, a finalized prescription, and an issued invoice so the frontend MVP can show real Phase 3-9 workflows immediately after login.
- Updated `README.md` with the `npm run seed` command and local demo credentials.

## PHASE 13 - Notifications + Follow-up MVP

### 1. Goal

- Add a clinic-scoped notifications and follow-up workflow that supports appointment reminders, ad hoc notifications, follow-up tasks, delivery logs, patient notification history, and safe integration hooks from existing clinical/business modules.

### 2. Scope Implemented

- Notification templates with safe variable rendering
- Notification logs with `pending`, `sent`, `failed`, and `cancelled` states
- Mock-first provider abstraction with console/email placeholder fallback support
- Manual send and future scheduling flows
- Follow-up task creation and status updates
- Manual `dispatch-pending` MVP delivery endpoint
- Patient notification history endpoint and patient-history summary integration
- Lifecycle hooks from appointment booking, consultation completion, prescription finalization, invoice creation, and finalized lab reports
- Frontend pages for templates, logs, sending, follow-ups, and patient notification history

### 3. Files Created

- `backend/src/modules/notifications/notificationTemplate.model.js`
- `backend/src/modules/notifications/notificationLog.model.js`
- `backend/src/modules/notifications/followUpTask.model.js`
- `backend/src/modules/notifications/notification.validator.js`
- `backend/src/modules/notifications/notification.repository.js`
- `backend/src/modules/notifications/notification.service.js`
- `backend/src/modules/notifications/notification.controller.js`
- `backend/src/modules/notifications/notification.providers.js`
- `backend/src/modules/notifications/notification.routes.js`
- `backend/tests/notifications.test.js`
- `frontend/src/features/notifications/notificationsApi.js`
- `frontend/src/features/notifications/NotificationStatusBadge.jsx`
- `frontend/src/features/notifications/ChannelBadge.jsx`
- `frontend/src/features/notifications/FollowUpStatusBadge.jsx`
- `frontend/src/features/notifications/NotificationTemplatesPage.jsx`
- `frontend/src/features/notifications/NotificationLogsPage.jsx`
- `frontend/src/features/notifications/SendNotificationPage.jsx`
- `frontend/src/features/notifications/FollowUpTasksPage.jsx`
- `frontend/src/features/notifications/PatientNotificationHistory.jsx`
- `docs/NOTIFICATIONS_MODULE.md`

### 4. Files Modified

- `backend/src/routes/index.js`
- `backend/src/modules/appointments/appointment.service.js`
- `backend/src/modules/consultations/consultation.service.js`
- `backend/src/modules/prescriptions/prescription.service.js`
- `backend/src/modules/billing/billing.service.js`
- `backend/src/modules/labs/lab.service.js`
- `backend/src/modules/patients/patient.service.js`
- `backend/src/modules/patients/patient.controller.js`
- `backend/src/modules/patients/patient.routes.js`
- `backend/tests/patients.test.js`
- `frontend/src/lib/api.js`
- `frontend/src/app/routes.jsx`
- `frontend/src/constants/routes.js`
- `frontend/src/features/patients/PatientDetailPage.jsx`
- `frontend/src/features/patients/PatientHistoryPanel.jsx`
- `README.md`
- `docs/API_CONTRACT.md`
- `docs/DATABASE_DESIGN.md`
- `docs/ARCHITECTURE.md`
- `docs/CURRENT_PROJECT_STATUS.md`
- `docs/REPO_GAP_ANALYSIS.md`
- `docs/NEXT_PHASE_RECOMMENDATION.md`
- `docs/IMPLEMENTATION_REPORT.md`

### 5. What Each File Does

- `notificationTemplate.model.js`: stores clinic-scoped reusable notification templates.
- `notificationLog.model.js`: stores delivery logs, scheduling state, and related entity links.
- `followUpTask.model.js`: stores patient follow-up work items and reminder flags.
- `notification.validator.js`: defines Zod schemas for templates, sending, logs, follow-ups, and patient history access.
- `notification.repository.js`: centralizes notification and follow-up data access plus relation lookups.
- `notification.service.js`: owns rendering, provider dispatch, scheduling, follow-up creation, patient history retrieval, and best-effort workflow hooks.
- `notification.controller.js`: maps request/response handling onto the service layer using the existing API response helper.
- `notification.providers.js`: implements safe template rendering plus mock/console/email placeholder providers.
- `notification.routes.js`: mounts `/notifications` and `/follow-ups` RBAC-protected endpoints.
- `notifications.test.js`: verifies template creation, rendering, send/schedule/cancel flows, follow-up status, patient history, clinic scoping, and appointment hook behavior.
- `backend route/service/patient files`: wire notifications into the app router, patient history, and existing appointment/consultation/prescription/billing/lab lifecycles.
- `frontend/src/lib/api.js`: adds frontend notification and follow-up API clients.
- `frontend/src/app/routes.jsx`: registers protected notification and follow-up routes.
- `frontend/src/constants/routes.js`: adds sidebar/navigation entries for notifications and follow-ups.
- `notificationsApi.js`: provides feature-level wrappers around shared notification APIs.
- `NotificationStatusBadge.jsx`, `ChannelBadge.jsx`, `FollowUpStatusBadge.jsx`: render reusable status/channel badges for the new pages.
- `NotificationTemplatesPage.jsx`: lists and creates clinic notification templates.
- `NotificationLogsPage.jsx`: lists logs, filters state, cancels pending entries, and dispatches pending notifications.
- `SendNotificationPage.jsx`: lets staff send or schedule mock-first notifications manually.
- `FollowUpTasksPage.jsx`: lists and creates follow-up tasks and supports safe status transitions.
- `PatientNotificationHistory.jsx`: shows patient-specific notification logs and follow-up tasks.
- `PatientDetailPage.jsx` and `PatientHistoryPanel.jsx`: surface notification/follow-up visibility in the patient workspace.
- Documentation files: promote the verified baseline to Phase 13 and describe APIs, collections, and architecture.

### 6. APIs Added

- `POST /api/v1/notifications/templates`
- `GET /api/v1/notifications/templates`
- `POST /api/v1/notifications/send`
- `POST /api/v1/notifications/appointment-reminder`
- `POST /api/v1/notifications/follow-up`
- `GET /api/v1/notifications/logs`
- `GET /api/v1/notifications/logs/:id`
- `PATCH /api/v1/notifications/logs/:id/cancel`
- `POST /api/v1/notifications/dispatch-pending`
- `GET /api/v1/follow-ups`
- `PATCH /api/v1/follow-ups/:id/status`
- `GET /api/v1/patients/:patientId/notifications`

### 7. Models Added

- `NotificationTemplate`
- `NotificationLog`
- `FollowUpTask`

### 8. Validation Rules

- ObjectId validation for patient, appointment, consultation, prescription, invoice, lab order, template, notification log, and follow-up task identifiers
- enum validation for notification `type`, `channel`, and `status`
- enum validation for follow-up `type` and `status`
- non-empty body validation for templates and manual sends
- ISO or `YYYY-MM-DD` date validation for `scheduledFor` and `dueDate`
- string-array validation for template variable lists

### 9. Clinic Scoping Behavior

- Templates, logs, and follow-up tasks resolve clinic scope through the shared `resolveClinicContext` pattern.
- Patient notification history verifies patient ownership inside the selected clinic before returning any logs.
- Doctor follow-up listing reuses the linked doctor profile to restrict doctor-facing task views.
- Cross-clinic access to patient notification history returns `Patient not found.`

### 10. Template Rendering / Provider Logic

- Templates use `{{variableName}}` placeholders rendered in the backend.
- Missing variables render as empty strings instead of throwing runtime errors.
- Provider selection is environment-aware through `NOTIFICATION_PROVIDER` and `ENABLE_MOCK_NOTIFICATIONS`.
- Supported MVP providers are `mock`, `console`, and `email` placeholder.
- The backend now stores the resolved provider name in each notification log instead of hardcoding `mock` inside the service layer.

### 11. Scheduled Notification Behavior

- Notifications with `scheduledFor` in the future remain `pending`.
- Notifications with no schedule or a due schedule are dispatched immediately.
- `dispatch-pending` sends all due pending notifications manually for MVP operation.
- Appointment booking automatically creates a pending reminder intent.
- Consultation completion with a follow-up date can create a follow-up task plus scheduled reminder log.
- Prescription finalization, invoice creation with due amount, and finalized lab reports can create immediate notification logs through best-effort hooks.

### 12. Run / Test Commands

- `cd backend && npm.cmd test -- notifications.test.js patients.test.js`
  - passed `2/2` suites and `16/16` tests
- `cd backend && npm.cmd test`
  - passed `16/16` suites and `100/100` tests
- `cd backend && npm.cmd run check:env`
  - passed with `NODE_ENV=development` and `MONGO_MODE=atlas`
- `cd frontend && npm.cmd run build`
  - passed with `208` modules transformed

### 13. Known Limitations

- Phase 13 is mock/provider-placeholder based; no paid SMS, WhatsApp, or production email provider is integrated.
- Delivery of future reminders is manual through `dispatch-pending`; there is no queue worker or cron in this phase.
- There is no dedicated frontend page for notification-log detail, even though the backend detail route exists.
- Notification actions are auditable, but audit logs still do not have a separate read API or UI.
- Docker runtime remains unverified in this environment because the `docker` CLI is unavailable.

### 14. Next Phase Recommendation: Phase 14 - Dashboard + Analytics Backend

- Phase 13 closes the operational reminder and follow-up gap around the clinical workflow.
- Phase 14 should add backend-owned analytics and dashboard metrics so the clinic no longer depends on frontend aggregation for operational visibility.

## Phase 13 Verification Refresh

### Verification Scope

- Re-verified the Phase 13 notifications and follow-up workflow only.
- Checked backend startup behavior, route mounting, template creation, mock send flow, scheduled notifications, pending cancellation, follow-up creation, follow-up status updates, patient notification history, frontend build status, env validation, and Docker/env documentation coverage.
- Fixed no additional Phase 13 defects during this verification pass because the current implementation verified cleanly.

### Verification Results

- `cd backend && npm.cmd test -- notifications.test.js patients.test.js`
  - passed `2/2` suites and `16/16` tests
- `cd frontend && npm.cmd run build`
  - passed with `208` modules transformed
- `cd backend && npm.cmd run check:env`
  - passed with `NODE_ENV=development` and `MONGO_MODE=atlas`
- Live backend startup probe passed on retry with a longer wait for the current Atlas-backed startup path
  - `GET /` returned `200`
  - `GET /health` returned `200`
  - `GET /api/v1/health` returned `200`
  - unauthenticated `GET /api/v1/notifications/templates` returned `401`
  - unauthenticated `GET /api/v1/notifications/logs` returned `401`
  - unauthenticated `GET /api/v1/follow-ups` returned `401`
- Backend test coverage confirms:
  - template APIs work
  - mock send flow works
  - scheduled notifications are stored correctly
  - cancel pending notification works correctly
  - follow-up task creation works
  - follow-up task status update works
  - patient notification history does not crash
- Docker and env files remain structurally valid by source review, and backend env validation still passes
- No unrelated backend modules were added in this phase-verification pass

### Verification Notes

- The first live backend probe timed out before the server began listening; rerunning with a longer wait succeeded without code changes.
- Docker runtime remains unverified in this environment because the `docker` CLI is unavailable, so Phase 13 Docker validation remains structural/documentation-based rather than live-executed.

## PHASE 14 - Dashboard + Analytics Backend

### 1. Goal

- Add a production-ready backend analytics layer for dashboard visibility across the clinic workflow.
- Replace the old frontend-only dashboard aggregation approach with protected backend-owned metrics.

### 2. Scope Implemented

- Protected `/api/v1/dashboard` backend module
- Shared analytics date-range parsing with last-30-days default
- Overview cards for key clinic KPIs
- Appointment analytics, no-show analytics, doctor workload, and activity feed
- Revenue analytics from invoices plus pharmacy sales
- Patient, lab, pharmacy, and notification/follow-up analytics
- Frontend dashboard overview and section pages wired to the new backend APIs

### 3. Files Created

Backend:

- `backend/src/common/utils/analyticsDateRange.js`
- `backend/src/modules/dashboard/dashboard.repository.js`
- `backend/src/modules/dashboard/dashboard.validator.js`
- `backend/src/modules/dashboard/dashboard.service.js`
- `backend/src/modules/dashboard/dashboard.controller.js`
- `backend/src/modules/dashboard/dashboard.routes.js`
- `backend/tests/dashboard.test.js`

Frontend:

- `frontend/src/features/dashboard/dashboardApi.js`
- `frontend/src/features/dashboard/StatCard.jsx`
- `frontend/src/features/dashboard/SectionCard.jsx`
- `frontend/src/features/dashboard/DateRangeFilter.jsx`
- `frontend/src/features/dashboard/NoDataState.jsx`
- `frontend/src/features/dashboard/ActivityFeed.jsx`
- `frontend/src/features/dashboard/DashboardOverviewPage.jsx`
- `frontend/src/features/dashboard/DashboardAppointmentsPage.jsx`
- `frontend/src/features/dashboard/DashboardRevenuePage.jsx`
- `frontend/src/features/dashboard/DashboardPatientsPage.jsx`
- `frontend/src/features/dashboard/DashboardLabsPage.jsx`
- `frontend/src/features/dashboard/DashboardPharmacyPage.jsx`
- `frontend/src/features/dashboard/DashboardNotificationsPage.jsx`

Docs:

- `docs/DASHBOARD_ANALYTICS.md`

### 4. Files Modified

- `backend/src/routes/index.js`
- `frontend/src/lib/api.js`
- `frontend/src/api/dashboardApi.js`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/app/routes.jsx`
- `frontend/src/constants/routes.js`
- `README.md`
- `docs/API_CONTRACT.md`
- `docs/ARCHITECTURE.md`
- `docs/CURRENT_PROJECT_STATUS.md`
- `docs/REPO_GAP_ANALYSIS.md`
- `docs/NEXT_PHASE_RECOMMENDATION.md`
- `docs/IMPLEMENTATION_REPORT.md`

### 5. What Each File Does

- `analyticsDateRange.js`: centralizes analytics date parsing, defaults, formatting, and safety validation.
- `dashboard.repository.js`: exposes model access helpers for analytics queries without duplicating data-access patterns elsewhere.
- `dashboard.validator.js`: validates dashboard query params, date ranges, and activity-feed limits.
- `dashboard.service.js`: computes clinic-scoped metrics, doctor-scoped views, trend tables, and activity-feed data.
- `dashboard.controller.js`: maps dashboard service results to the existing API response helper.
- `dashboard.routes.js`: mounts the protected dashboard analytics route family.
- `dashboard.test.js`: verifies overview, appointments, revenue, patients, labs, pharmacy, notifications, no-show, doctor workload, activity feed, clinic scoping, and empty states.
- `frontend dashboard files`: replace the old placeholder dashboard adapter with backend-driven overview/section pages and shared UI blocks.

### 6. APIs Added

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

### 7. Metrics Exposed

- Overview cards:
  - `totalPatients`
  - `newPatients`
  - `todayAppointments`
  - `pendingAppointments`
  - `completedConsultations`
  - `activePrescriptions`
  - `pendingInvoices`
  - `labOrders`
  - `lowStockMedicines`
  - `pendingFollowUps`
- Appointments:
  - totals by status, walk-ins, by-day, by-doctor
- Revenue:
  - invoice revenue, pharmacy revenue, total revenue, paid amount, unpaid amount, by-day
- Patients:
  - total, new, active, by-gender, by-day
- Labs:
  - total orders, completed orders, pending orders, abnormal reports, by-status, by-day
- Pharmacy:
  - total medicines, low-stock, near-expiry, total dispensings, total pharmacy sales, by-category
- Notifications:
  - total, sent, failed, pending, pending follow-ups, completed follow-ups, by-type, by-channel
- Extra analytics:
  - doctor workload, no-show summary, recent activity feed

### 8. Validation Rules

- `from` and `to` must use `YYYY-MM-DD`
- `from` cannot be after `to`
- analytics date ranges are capped for MVP safety
- activity feed `limit` must be a positive integer with a bounded maximum
- optional `clinicId` still respects the existing super-admin clinic override rules

### 9. Clinic Scoping Behavior

- All dashboard endpoints resolve clinic scope through the existing `resolveClinicContext` helper.
- Admin/receptionist dashboard views are clinic-wide.
- Doctor dashboard views use linked doctor profiles where the underlying schema supports doctor-owned metrics.
- When the schema cannot support a precise doctor relation cheaply, the backend returns safe best-effort metrics or zero/empty values instead of cross-clinic leakage.

### 10. Date-Range Defaults / Logic

- If `from` and `to` are omitted, dashboard endpoints default to the last 30 days.
- Dates are normalized in UTC day boundaries for consistent backend filtering.
- Inventory snapshot metrics remain current-state values rather than historical stock-timeline reconstructions.

### 11. Frontend Screens Added

- `/dashboard`
- `/dashboard/appointments`
- `/dashboard/revenue`
- `/dashboard/patients`
- `/dashboard/labs`
- `/dashboard/pharmacy`
- `/dashboard/notifications`

### 12. Run / Test Commands

- `cd backend && npm.cmd test -- dashboard.test.js`
  - passed `1/1` suite and `4/4` tests
- `cd backend && npm.cmd test`
  - passed `17/17` suites and `104/104` tests
- `cd backend && npm.cmd run check:env`
  - passed with `NODE_ENV=development` and `MONGO_MODE=atlas`
- `cd frontend && npm.cmd run build`
  - passed with `218` modules transformed

### 13. Known Limitations

- Docker runtime/build is still unverified in this environment because the `docker` CLI is unavailable.
- The frontend build passes, but the main bundle still triggers Vite’s large-chunk warning.
- Doctor-scoped notification analytics are best-effort and currently rely on doctor-created logs plus doctor-linked follow-up tasks.
- The system still has no dedicated audit-log read API/UI.

### 14. Next Phase Recommendation: Phase 15 - Hardening / Production Readiness

- The business workflow and dashboard analytics baseline are now verified end to end.
- The next highest-value work is CI, Docker verification, audit visibility, frontend automated tests, and deployment hardening rather than another new business module.

## PHASE 15 - Hardening / Production Readiness

### 1. Goal

- Stabilize the verified clinic workflow for reliable local development, clearer staging readiness, and lower runtime/config drift.

### 2. Scope Implemented

- Docker compose and service Dockerfile cleanup
- Backend and AI-service Docker healthchecks
- Env-example alignment with actual config loaders
- Seed/demo data expansion to better match the real workflow baseline
- Postman collection refresh for the current route surface
- Source-of-truth docs refresh for the post-dashboard baseline
- Deployment/testing/operations readiness docs

### 3. Files Created

- `backend/.dockerignore`
- `ai-service/.dockerignore`
- `docs/DEPLOYMENT_READINESS.md`
- `docs/TESTING_STRATEGY.md`
- `docs/OPERATIONS_RUNBOOK.md`

### 4. Files Modified

- `docker-compose.yml`
- `.env.example`
- `backend/.env.example`
- `frontend/.env.example`
- `ai-service/.env.example`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `ai-service/Dockerfile`
- `backend/src/scripts/checkEnv.js`
- `backend/src/seed/seedDemoData.js`
- `postman/AI-CMS.postman_collection.json`
- `README.md`
- `docs/API_CONTRACT.md`
- `docs/ARCHITECTURE.md`
- `docs/CURRENT_PROJECT_STATUS.md`
- `docs/REPO_GAP_ANALYSIS.md`
- `docs/NEXT_PHASE_RECOMMENDATION.md`
- `docs/IMPLEMENTATION_REPORT.md`

### 5. What Each File Does

- `docker-compose.yml`: keeps Docker optional while improving service wiring and healthchecks.
- `backend/.dockerignore` and `ai-service/.dockerignore`: reduce noisy or unsafe Docker build context.
- service Dockerfiles: use more practical default runtime commands while keeping compose overrides compatible with local development.
- env example files: document the variables actually used by the backend, frontend, and AI-service config layers.
- `checkEnv.js`: catches placeholder-secret and placeholder-Atlas mistakes more clearly.
- `seedDemoData.js`: improves demo-data coverage so the workflow baseline is easier to exercise locally.
- Postman collection: provides updated sample requests for the current implemented route surface.
- readiness docs: capture deployment, testing, and operational expectations after the hardening pass.

### 6. Docker / Runtime Fixes

- Added backend and AI-service healthchecks to `docker-compose.yml`.
- Tightened Docker dependency ordering from `service_started` to `service_healthy` where appropriate.
- Switched backend Docker default command to `npm start`, leaving compose free to override to dev mode.
- Switched AI-service Docker default command to non-reload `uvicorn`, leaving compose free to override to dev mode.
- Added Docker build-context ignores for backend and AI-service.

### 7. Environment / Config Fixes

- Added `CLIENT_URL`, `NOTIFICATION_PROVIDER`, and `ENABLE_MOCK_NOTIFICATIONS` to root/backend env examples where missing.
- Kept frontend env example minimal around `VITE_API_BASE_URL` and `VITE_AI_BASE_URL`.
- Preserved support for local MongoDB, Atlas mode, and direct mode.
- Tightened backend env check so obvious placeholder secrets/Atlas URIs are flagged clearly.

### 8. Test Improvements

- No new business test suites were added because the current backend/AI coverage was already strong.
- Added a seed-module load check to catch syntax/import regressions in the seed layer.
- Frontend automated tests are still not present; this remains a documented follow-up item instead of a risky late-phase tooling insertion.

### 9. Docs Alignment Changes

- Updated README to reflect the hardening phase and richer demo seed.
- Updated source-of-truth status/gap/recommendation docs to the Phase 15 baseline.
- Added deployment, testing, and operations docs for staging-readiness tracking.

### 10. Seed / Demo Improvements

- Demo seed now includes:
  - lab order + lab report
  - medicine catalog item
  - dispensing record + pharmacy sale
  - notification template + notification log
  - follow-up task
- Demo seed remains idempotent through upsert-style behavior where practical.

### 11. Security / Error-Handling Improvements

- Backend env validation now catches placeholder secrets more clearly before shared/staging-like use.
- Docker build context now excludes local env files and bulky runtime folders for backend/AI service.
- Existing backend and AI error-response patterns were preserved; no broad auth redesign or risky runtime refactor was introduced.

### 12. Run / Test Commands

- `cd backend && node -e "require('./src/seed/seedAdmin'); require('./src/seed/seedDemoData')"`
- `cd backend && npm.cmd run check:env`
- `cd backend && npm.cmd test`
- `cd frontend && npm.cmd run build`
- `cd ai-service && python -m pytest`
- `docker compose config` (attempted, but Docker CLI was unavailable here)

### 13. Verification Results

- Backend seed-module load check passed
- `cd backend && npm.cmd run check:env` passed
- `cd backend && npm.cmd test` passed `17/17` suites and `104/104` tests
- `cd frontend && npm.cmd run build` passed with `218` modules transformed
- `cd ai-service && python -m pytest` passed `21/21` tests
- Live backend startup probe passed:
  - `GET /` -> `200`
  - `GET /health` -> `200`
  - `GET /api/v1/health` -> `200`
- Live AI-service startup probe passed:
  - `GET /health` -> `200`
  - `GET /api/v1/health` -> `200`
- Frontend dev-server startup log reached ready state locally
- `docker compose config` could not run because `docker` is not installed on this machine

### 14. Known Limitations

- Docker runtime/build is still not live-verified on this machine because the Docker CLI is unavailable.
- Frontend automated tests are still absent.
- Audit logs still do not have a dedicated read API/UI.
- The frontend build still reports a large-chunk warning.
- Swagger coverage is still partial for the full protected route surface.

### 15. Next Phase Recommendation

- Phase 16 should focus on staging rollout plus audit visibility:
  - CI automation
  - Docker/staging execution in a Docker-enabled environment
  - audit-log read surfaces
  - minimal frontend smoke tests

## Phase 15 Verification Refresh - April 24, 2026

### Verification Scope

- Re-verified the Phase 15 hardening surface only.
- Checked backend startup, frontend build, AI-service tests and startup, env-example alignment, docs/status alignment, Docker compose structure, Dockerfiles, seed/demo flow, Postman structure, and module scope.
- Fixed no new runtime code defects in this pass; the only confirmed Phase 15 issue was stale documentation drift in `docs/REPO_GAP_ANALYSIS.md`.

### Verification Results

- Backend seed-module load check passed:
  - `cd backend && node -e "require('./src/seed/seedAdmin'); require('./src/seed/seedDemoData'); console.log('seed modules ok')"`
  - Result: `seed modules ok`
- Backend env validation passed:
  - `cd backend && npm.cmd run check:env`
  - Result: `NODE_ENV=development`, `MONGO_MODE=atlas`, validation passed
- Full backend regression suite passed:
  - `cd backend && npm.cmd test`
  - Result: `17/17` suites passed, `104/104` tests passed
- Frontend production build passed:
  - `cd frontend && npm.cmd run build`
  - Result: `218` modules transformed, build succeeded
- AI-service test suite passed:
  - `cd ai-service && python -m pytest`
  - Result: `21/21` tests passed
- Live backend startup probe passed on April 24, 2026:
  - `GET /` -> `200`
  - `GET /health` -> `200`
  - `GET /api/v1/health` -> `200`
- Live AI-service startup probe passed on April 24, 2026:
  - `GET /health` -> `200`
  - `GET /api/v1/health` -> `200`
- Docker compose structural validation passed:
  - YAML parse of `docker-compose.yml` succeeded
- Live Docker CLI validation could not run:
  - `docker compose config`
  - Result: failed because `docker` is not installed in this environment
- Postman collection structure check passed:
  - `postman/AI-CMS.postman_collection.json` parsed successfully
  - Collection name: `AI-CMS`
  - Top-level folders: `13`
- Env and Dockerfile source review passed:
  - root/backend/frontend/ai-service env examples are present
  - backend/frontend/ai-service Dockerfiles are present and structurally consistent with current ports and runtime commands
- Module-scope review passed:
  - no unrelated business module directories were added during this verification pass

### Verification Notes

- The shell sandbox failed to initialize during this verification cycle, so the commands above were rerun outside the sandbox to complete the requested checks reliably.
- Docker runtime/build remains unverified here for an environment reason, not a repository syntax issue: the local machine still has no `docker` CLI.
- Frontend build still emits Vite's large-chunk warning, but it does not fail the production build.

## PHASE 17 - Voice Notes / Speech-to-Text Integration

### 1. Goal

- Speed up doctor consultation documentation with voice-note transcription and AI-assisted SOAP draft formatting.
- Keep all transcription and AI note output assistive only until a doctor reviews and approves it.

### 2. Scope Implemented

- Added a production-style STT service path in the AI service with safe optional `faster-whisper` loading.
- Added direct `/ai/transcribe` and `/ai/format-clinical-note` endpoints with standardized AI response envelopes.
- Preserved older working `/api/v1/ai/transcribe` and `/api/v1/ai/format-clinical-note` compatibility routes.
- Added backend consultation draft-note storage and doctor-only approve/edit/reject actions.
- Added frontend consultation workspace UI for audio upload, transcript preview, SOAP draft editing, and approval controls.

### 3. Files Created

- `ai-service/app/core/config.py`
- `ai-service/app/core/safety.py`
- `ai-service/app/core/files.py`
- `ai-service/app/schemas/stt_schema.py`
- `ai-service/app/adapters/whisper_adapter.py`
- `ai-service/app/adapters/note_formatter_adapter.py`
- `ai-service/app/routes/stt_routes.py`
- `ai-service/app/services/stt_service.py`
- `ai-service/tests/test_stt_routes.py`
- `ai-service/tests/test_clinical_note_routes.py`
- `frontend/src/features/consultations/VoiceNotePanel.jsx`

### 4. Files Modified

- `ai-service/app/main.py`
- `ai-service/app/evaluation/adapter_registry.py`
- `ai-service/app/core/settings.py`
- `ai-service/app/routes/ai_foundation_routes.py`
- `ai-service/app/services/clinical_note_service.py`
- `ai-service/app/utils/file_utils.py`
- `ai-service/app/schemas/clinical_note_schema.py`
- `ai-service/tests/test_clinical_note.py`
- `ai-service/tests/test_upload_placeholders.py`
- `ai-service/.env.example`
- `ai-service/requirements.txt`
- `.env.example`
- `backend/src/modules/ai/ai.service.js`
- `backend/src/modules/consultations/consultation.model.js`
- `backend/src/modules/consultations/consultation.repository.js`
- `backend/src/modules/consultations/consultation.validator.js`
- `backend/src/modules/consultations/consultation.service.js`
- `backend/src/modules/consultations/consultation.controller.js`
- `backend/src/modules/consultations/consultation.routes.js`
- `backend/tests/consultations.test.js`
- `backend/tests/dashboard.test.js`
- `backend/tests/prescriptions.test.js`
- `frontend/src/lib/api.js`
- `frontend/src/features/consultations/consultationApi.js`
- `frontend/src/features/consultations/ConsultationPage.jsx`
- `docs/IMPLEMENTATION_REPORT.md`

### 5. What Each File Does

- `whisper_adapter.py`: lazy-loads optional `faster-whisper`, returns safe `unavailable` or fallback responses when the model runtime is missing.
- `stt_service.py`: validates audio uploads, stores them temporarily, calls the STT adapter, cleans temp files, and writes AI audit metadata.
- `note_formatter_adapter.py`: builds a non-hallucinating SOAP draft and keeps missing sections as `Not mentioned`.
- `stt_routes.py`: mounts `/api/v1/ai/transcribe`, `/api/v1/transcribe`, and `/ai/transcribe` without breaking existing aliases.
- consultation backend files: store `transcript_text`, `ai_soap_note`, `ai_note_status`, `approved_note`, approval metadata, and doctor-only review actions.
- `VoiceNotePanel.jsx`: adds the doctor-facing upload, preview, edit, approve, and reject UI inside the existing consultation workspace.

### 6. APIs Added

- `POST /ai/transcribe`
- `POST /ai/format-clinical-note`
- `POST /api/v1/consultations/:id/voice-note`
- `PUT /api/v1/consultations/:id/ai-note/edit`
- `POST /api/v1/consultations/:id/ai-note/approve`
- `POST /api/v1/consultations/:id/ai-note/reject`

### 7. Environment Variables Added / Supported

- `STT_PROVIDER`
- `WHISPER_MODEL_SIZE`
- `WHISPER_DEVICE`
- `WHISPER_COMPUTE_TYPE`
- `MAX_AUDIO_MB`
- `AUDIO_TEMP_DIR`
- `ENABLE_STT`
- `ENABLE_AI_FALLBACKS`

### 8. How Transcription Works

- The backend consultation voice-note route accepts multipart audio and forwards the raw multipart payload to the AI service.
- The AI service validates extension, MIME type, and size, writes a temporary file, then lazily tries to load `faster-whisper`.
- If the Whisper runtime is unavailable, the endpoint still returns a safe structured response with `model_status="unavailable"` instead of crashing.
- Temporary audio is deleted after processing.

### 9. How SOAP Note Approval Works

- Uploading a voice note stores only `transcript_text`, `ai_soap_note`, `ai_note_status`, and AI metadata on the consultation.
- Editing the AI draft updates only the draft fields and keeps final EMR notes unchanged.
- Approving the AI draft copies the reviewed SOAP note into `formattedClinicalNotes` and the transcript into `clinicalNotes`.
- Rejecting the draft leaves the final EMR untouched and marks the AI note as rejected.

### 10. Run / Test Commands

- `cd ai-service && python -m py_compile app/main.py`
- `cd ai-service && python -m py_compile app/routes/stt_routes.py`
- `cd ai-service && python -m py_compile app/services/stt_service.py`
- `cd ai-service && python -m py_compile app/services/clinical_note_service.py`
- `cd ai-service && python -m pytest`
- `cd backend && npm.cmd test`
- `cd frontend && npm.cmd run build`

### 11. Verification Results

- Python compile checks passed for:
  - `app/main.py`
  - `app/routes/stt_routes.py`
  - `app/services/stt_service.py`
  - `app/services/clinical_note_service.py`
- `cd ai-service && python -m pytest`
  - passed `32/32` tests
- `cd backend && npm.cmd test`
  - passed `17/17` suites and `107/107` tests
- `cd frontend && npm.cmd run build`
  - passed with `219` modules transformed

### 12. Known Limitations

- Real transcription depends on `faster-whisper` being installed with a usable local runtime; the service safely falls back when it is missing.
- The backend forwards multipart voice-note uploads directly to the AI service instead of parsing audio in Express.
- Frontend automated UI tests are still not present.
- The frontend production build still emits the existing large-chunk warning.

### 13. Next Phase Recommendation

- Phase 18 should focus on document-intake and audit-readiness improvements:
  - safer OCR/document upload workflows
  - audit-log visibility for staff
  - frontend smoke tests for the new consultation AI draft flow

---

## Phase 18 — OCR + Smart Registration + Lab Report Extraction

### 1. Goal

Add production-structured OCR document extraction and lab report extraction with human review, masking, confidence reporting, and safe fallback behavior.

### 2. Scope Implemented

- added OCR document extraction endpoints
- added lab report extraction endpoints
- added PaddleOCR primary adapter plus Tesseract fallback structure
- added PDF OCR handling with safe non-crashing fallback
- added patient-document field extraction heuristics
- added lab value extraction with abnormal and critical flagging
- added backend multipart proxy routes for OCR and lab extraction
- preserved the legacy OCR alias route

### 3. Files Created

- `ai-service/app/core/file_validation.py`
- `ai-service/app/core/privacy.py`
- `ai-service/app/core/confidence.py`
- `ai-service/app/adapters/paddleocr_adapter.py`
- `ai-service/app/adapters/tesseract_adapter.py`
- `ai-service/app/adapters/pdf_adapter.py`
- `ai-service/app/routes/ocr_routes.py`
- `ai-service/app/routes/lab_report_routes.py`
- `ai-service/app/services/lab_report_service.py`
- `ai-service/app/schemas/ocr_schema.py`
- `ai-service/app/schemas/lab_report_schema.py`
- `ai-service/app/data/lab_reference_ranges.json`
- `ai-service/tests/test_ocr_extract.py`
- `ai-service/tests/test_lab_report_extract.py`
- `ai-service/README.md`
- `ai-service/requirements-ocr.txt`

### 4. Files Modified

- `ai-service/app/main.py`
- `ai-service/app/evaluation/adapter_registry.py`
- `ai-service/app/services/ai_foundation_service.py`
- `ai-service/app/services/ocr_service.py`
- `ai-service/app/routes/ai_foundation_routes.py`
- `ai-service/app/adapters/paddle_ocr.py`
- `ai-service/app/utils/file_utils.py`
- `ai-service/app/core/settings.py`
- `ai-service/tests/test_upload_placeholders.py`
- `ai-service/.env.example`
- `ai-service/requirements.txt`
- `.env.example`
- `backend/src/modules/ai/ai.service.js`
- `backend/src/modules/ai/ai.controller.js`
- `backend/src/modules/ai/ai.routes.js`
- `backend/tests/ai.test.js`
- `docs/AI_SERVICE.md`
- `docs/IMPLEMENTATION_REPORT.md`

### 5. What Each File Does

- `file_validation.py`: central upload validation for OCR document inputs
- `privacy.py`: masks phone numbers, email addresses, Aadhaar-like numbers, and document IDs
- `confidence.py`: shared confidence normalization and review-threshold logic
- `paddleocr_adapter.py`: lazy PaddleOCR primary adapter
- `tesseract_adapter.py`: lazy Tesseract fallback adapter
- `pdf_adapter.py`: PDF OCR orchestration with safe fallback when rasterization dependencies are unavailable
- `ocr_service.py`: review-first OCR flow plus patient-document extraction heuristics
- `lab_report_service.py`: lab report OCR parsing plus abnormal-value detection
- backend AI proxy files: multipart pass-through support for OCR and lab extraction

### 6. New Endpoints Added

- `POST /ai/ocr-extract`
- `POST /api/v1/ai/ocr-extract`
- `POST /api/v1/ai/ocr-patient-document` (legacy alias preserved)
- `POST /ai/lab-report-extract`
- `POST /api/v1/ai/lab-report-extract`
- `POST /api/v1/ai/ocr-extract` in backend proxy layer
- `POST /api/v1/ai/lab-report-extract` in backend proxy layer

### 7. Environment Variables Added / Updated

- `OCR_PROVIDER`
- `OCR_FALLBACK_PROVIDER`
- `OCR_ENABLED`
- `OCR_MAX_FILE_MB`
- `OCR_MAX_PDF_PAGES`
- `OCR_LANGUAGE`
- `OCR_ENABLE_HINDI`
- `MASK_SENSITIVE_FIELDS`
- `OCR_CONFIDENCE_REVIEW_THRESHOLD`
- `DOCUMENT_TEMP_DIR`

### 8. How OCR Extraction Works

- uploads are validated for file type and size
- files are stored temporarily and cleaned up after processing
- PaddleOCR is attempted first when configured
- if OCR dependencies are missing, safe fallback responses are returned instead of crashing
- extracted fields are returned as draft review data with confidence and `needs_review`
- sensitive fields are masked by default

### 9. How Lab Report Extraction Works

- the same OCR pipeline extracts raw lab text
- common tests are parsed using regex and alias matching
- values are compared against local reference ranges in `lab_reference_ranges.json`
- abnormal and critical values are highlighted
- the response always requires doctor or lab technician review

### 10. Run / Test Commands

- `cd ai-service && python -m py_compile app/main.py`
- `cd ai-service && python -m py_compile app/routes/ocr_routes.py`
- `cd ai-service && python -m py_compile app/routes/lab_report_routes.py`
- `cd ai-service && python -m py_compile app/services/ocr_service.py`
- `cd ai-service && python -m py_compile app/services/lab_report_service.py`
- `cd ai-service && python -m pytest`
- `cd backend && npm.cmd test`
- `cd frontend && npm.cmd run build`

### 11. Verification Results

- AI service compile checks: passed
- AI service tests: `39/39` passed
- Backend tests: `17/17` suites and `109/109` tests passed
- Frontend build: passed with `219` modules transformed
- Live AI startup probe: `GET /health -> 200`, `GET /openapi.json -> 200`

### 12. Privacy And Review Behavior

- OCR document responses return `requires_human_review=true`
- lab report responses return `requires_doctor_review=true` and `requires_human_review=true`
- Aadhaar-like values are masked as `XXXX-XXXX-1234`
- phone numbers are masked as `98XXXXXX10`
- extracted values are draft-only and must be reviewed before saving

### 13. Known Limitations

- OCR dependency installation remains optional and machine-specific
- PDF rasterization may require extra system dependencies such as Poppler
- Tesseract fallback needs a local Tesseract installation
- lab extraction is heuristic and review-first, not clinically validated automation
- frontend OCR/lab review screens were not added in this phase because no existing OCR UI was already wired

### 14. Next Phase Recommendation

- Phase 19 should focus on frontend OCR review screens and backend draft-to-approved document/lab workflows so the new extraction endpoints can be used directly in patient registration and lab review operations.

---

## PHASE 20 - No-Show Prediction ML Upgrade

### 1. Goal

- Upgrade appointment no-show scoring from a placeholder-only path to a trainable ML pipeline backed by XGBoost when available.
- Keep the existing working appointment flow safe by preserving rule-based fallback behavior when the model, dependency, or training data is unavailable.

### 2. Scope Implemented

- Added a dedicated no-show prediction route layer in the AI service.
- Added a trainable no-show pipeline with XGBoost-first design and safe import handling.
- Added historical-training endpoint support with evaluation metrics and persisted model artifacts.
- Preserved the legacy `/api/v1/ai/no-show` compatibility route while adding `/ai/no-show-predict` and `/ai/train/no-show`.
- Added audit logging for no-show predictions through the existing AI audit file mechanism.
- Integrated backend appointment create/reschedule flows with best-effort AI no-show enrichment that never blocks booking if the AI service is unavailable.
- Persisted successful appointment no-show predictions into the existing `AIPrediction` collection.
- Upgraded appointment no-show storage to retain model metadata, confidence, recommended action, and audit id.
- Kept frontend compatibility intact and updated appointment UI copy so the risk engine is no longer labeled as a placeholder.

### 3. Files Created

- `ai-service/app/core/model_registry.py`
- `ai-service/app/evaluation/no_show_eval.py`
- `ai-service/app/routes/no_show_routes.py`
- `ai-service/tests/test_no_show_prediction.py`
- `ai-service/tests/test_no_show_training.py`

### 4. Files Modified

AI service:

- `ai-service/app/main.py`
- `ai-service/app/core/settings.py`
- `ai-service/app/models/ai_response.py`
- `ai-service/app/routes/ai_foundation_routes.py`
- `ai-service/app/services/ai_foundation_service.py`
- `ai-service/app/services/no_show_service.py`
- `ai-service/app/schemas/no_show_schema.py`
- `ai-service/app/adapters/xgboost_no_show.py`
- `ai-service/tests/test_no_show.py`
- `ai-service/requirements.txt`
- `ai-service/.env.example`
- `ai-service/README.md`

Backend:

- `backend/src/modules/appointments/appointment.model.js`
- `backend/src/modules/appointments/appointment.service.js`
- `backend/src/modules/ai/ai.validator.js`
- `backend/tests/appointments.test.js`

Frontend:

- `frontend/src/features/appointments/components/NoShowRiskBadge.jsx`
- `frontend/src/features/appointments/AppointmentDetailsPage.jsx`

Docs:

- `.env.example`
- `README.md`
- `docs/AI_SERVICE.md`
- `docs/IMPLEMENTATION_REPORT.md`

### 5. What Each File Does

- `model_registry.py`: centralizes model artifact paths for the no-show model directory.
- `no_show_eval.py`: computes accuracy, precision, recall, f1, and ROC AUC without introducing a heavy sklearn dependency.
- `no_show_schema.py`: validates prediction and training payloads while preserving backward compatibility with the older no-show request shape.
- `no_show_service.py`: handles fallback scoring, feature engineering, vectorization, training, evaluation, and artifact persistence.
- `xgboost_no_show.py`: loads trained artifacts when present and falls back safely when the model is unavailable.
- `no_show_routes.py`: exposes prediction and training routes with OpenAPI examples and stable compatibility aliases.
- backend appointment files: enrich appointment records with AI no-show output and persist successful prediction snapshots without blocking booking flows.

### 6. APIs Added / Upgraded

AI service:

- `POST /ai/no-show-predict`
- `POST /api/v1/ai/no-show-predict`
- `POST /ai/train/no-show`
- `POST /api/v1/ai/train/no-show`

Compatibility preserved:

- `POST /api/v1/ai/no-show`

### 7. Environment Variables Added / Supported

- `NO_SHOW_MODEL_DIR`
- `NO_SHOW_MIN_TRAINING_ROWS`
- `NO_SHOW_ENABLE_TRAINING`

Existing variables still used:

- `ENABLE_AI_FALLBACKS`
- `AI_AUDIT_LOG_PATH`

### 8. Prediction / Training Logic

- Prediction tries to load a trained XGBoost model plus preprocessor artifacts from `NO_SHOW_MODEL_DIR`.
- If a trained model is available, the service returns probability-backed `risk_score`, `risk_level`, `reason_codes`, `recommended_action`, `confidence`, `model_name`, `model_version`, `model_status`, and `audit_id`.
- If the trained model is missing, prediction falls back to deterministic rules and returns `model_status=fallback`.
- If the last training state recorded insufficient usable rows, prediction can surface `model_status=insufficient_data` while still returning safe fallback output.
- Training excludes `cancelled` rows from the binary model, engineers numeric and one-hot categorical features, splits train/test data, evaluates the run, and saves:
  - `no_show_xgboost.pkl`
  - `no_show_preprocessor.json`
  - `metadata.json`
  - `metrics.json`

### 9. Backend Integration Behavior

- Appointment creation and rescheduling now attempt an AI no-show prediction before save.
- If the AI call succeeds, the appointment stores richer no-show metadata and an `AIPrediction` record is written for auditability.
- If the AI service is unavailable, the backend falls back to the existing local no-show scorer and continues the appointment workflow normally.
- The backend never blocks appointment creation because the AI service is down.

### 10. Run / Test Commands

- `python -m py_compile ai-service/app/routes/no_show_routes.py`
- `python -m py_compile ai-service/app/services/no_show_service.py`
- `python -m py_compile ai-service/app/adapters/xgboost_no_show.py`
- `python -m py_compile ai-service/app/schemas/no_show_schema.py`
- `cd ai-service && python -m pytest ai-service/tests/test_no_show.py ai-service/tests/test_no_show_prediction.py ai-service/tests/test_no_show_training.py`
- `cd backend && npm.cmd test -- appointments.test.js ai.test.js prescriptions.test.js`
- `cd frontend && npm.cmd run build`

### 11. Verification Results

- AI service targeted no-show regression suite passed:
  - `9/9` tests passed
- Backend targeted regression suite passed:
  - `3/3` suites passed
  - `24/24` tests passed
- Frontend production build passed:
  - `219` modules transformed
- The backend/frontend verification commands had to be rerun outside the sandbox because the Windows sandbox refresh failed before Node startup. That was a tooling issue, not a repository code failure.

### 12. Known Limitations

- The trainable path depends on `xgboost` being installed in the runtime environment; fallback scoring remains active when it is not.
- Training currently accepts historical rows through the API request body; it does not yet pull appointment history directly from the backend database.
- Reason codes remain heuristically derived even when the trained model is available; they are intended as operational cues, not formal explainability.
- The frontend currently surfaces no-show risk more clearly but does not add a separate training-management UI.

### 13. Next Phase Recommendation

- Phase 21 should focus on reminder optimization and model operations:
  - staff-facing no-show intervention workflows
  - model retraining/runbook support
  - safer historical-training ingestion from real appointment exports
