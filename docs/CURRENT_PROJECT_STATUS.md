# Current Project Status

Audit date: April 26, 2026

This status was verified from the current repository code and local command output, not from older phase prompts.

## Executive Summary

AI-CMS currently has a working JavaScript/Node backend, JavaScript/React frontend, MongoDB/Mongoose persistence layer, and FastAPI AI service. The verified full MVP workflow is:

Patient -> Doctor -> Appointment -> Consultation/EMR -> Prescription -> Billing -> Lab order/result -> Pharmacy dispense -> Notifications/follow-up -> Patient history

The strongest true baseline is now the Phase 20 workflow: the hardened clinic platform plus AI-service upgrades for drug safety, voice-note transcription/clinical-note drafting, OCR/lab extraction, and trainable no-show prediction with safe fallbacks. Docker runtime still cannot be called fully verified in this environment because the `docker` CLI is not installed.

## Stack Confirmation

| Area | Verified status |
| --- | --- |
| Frontend | React + Vite + JavaScript + Tailwind CSS + React Router + Axios |
| Backend | Node.js + Express.js + JavaScript + MongoDB/Mongoose + JWT/RBAC + Zod |
| AI service | Python FastAPI with assistive endpoints, model adapters, safe fallbacks, OCR/STT hooks, drug safety rules, and trainable no-show prediction |
| TypeScript scan | No `.ts` or `.tsx` files found outside ignored dependency/build/cache folders |

Verified command:

```powershell
rg --files -g "*.ts" -g "*.tsx" -g "!**/node_modules/**" -g "!**/dist/**" -g "!**/__pycache__/**"
```

Result: no matches.

## Confirmed Completed Modules

| Module | Actual code status |
| --- | --- |
| Foundation / env | Implemented. Root/backend/frontend/AI env examples exist. Backend env validation passes. |
| Backend health/docs | Implemented. `/`, `/health`, `/api/v1/health`, and `/api-docs` respond during live startup. |
| Auth + RBAC | Implemented with JWT, role middleware, user model, register/login/me/logout, and protected routes. |
| Patient module | Implemented with CRUD, search/listing, soft delete, history, clinical history, and consultation history integration. |
| Doctor module | Implemented with CRUD, availability, blocked slots, and doctor lookup. |
| Appointment module | Implemented with booking, list, detail, calendar, available slots, status update, reschedule, cancel, and AI-backed no-show risk enrichment with safe local fallback. |
| AI service MVP | Implemented with safe symptom, diagnosis-assist, drug-safety, STT, OCR, lab extraction, clinical-note, prescription-advice, and trainable no-show flows with fallback behavior. |
| Consultation / EMR | Implemented with consultation create/list/detail/update, appointment lookup, patient history, SOAP note formatting, AI suggestions, AI review, and completion. |
| Prescription | Implemented with draft/create/update, finalize lock, cancel, patient/consultation lists, PDF generation/download, and AI advice formatting helper. |
| Billing | Implemented with invoices, item totals, GST/discount calculation, payments, cancel, summary, patient invoice history, and PDF generation/download. |
| Lab | Implemented with clinic-scoped test catalog, consultation-linked lab orders, readable order numbering, status transitions, lab reports, abnormal flag calculation, patient lab history, and frontend pages. |
| Pharmacy | Implemented with clinic-scoped medicine catalog, batch stock tracking, FEFO dispensing, expired-stock blocking, pharmacy sales, prescription dispensing status, patient medicine history, and frontend pages. |
| Notifications + follow-up | Implemented with clinic-scoped notification templates, logs, mock-first delivery, scheduled pending notifications, follow-up tasks, patient notification history, and frontend pages. |
| Dashboard / analytics | Implemented with protected backend `/api/v1/dashboard` analytics endpoints, clinic-scoped date-range filtering, overview cards, appointment analytics, revenue summary, patient analytics, lab analytics, pharmacy analytics, notification/follow-up analytics, doctor workload, no-show analytics, activity feed, and frontend dashboard pages. |
| Runtime / config hardening | Implemented with Docker compose cleanup, backend/AI healthchecks, aligned env examples, Postman cleanup, richer readiness docs, and improved demo seeding coverage. |
| Audit logging core | Implemented internally as model/repository/service and called by auth, users, patients, doctors, appointments, consultations, prescriptions, billing, and seed flows. |
| Frontend shell | Implemented with login/register, auth context, role-protected routes, dashboard shell, patients, doctors, appointments, consultations, labs, pharmacy, chatbot, prescriptions, and billing screens. |

## Confirmed Partial Modules

| Module | Partial status |
| --- | --- |
| Docker flow | Compose and Dockerfiles are present and structurally reviewed. Runtime/build verification is blocked because Docker is not installed locally. |
| Audit logs | Partial. Logs are written internally, but there is no audit log API, frontend screen, search/export, or retention policy. |
| Frontend automated tests | Partial. Frontend build verification is strong, but no dedicated automated frontend test suite exists yet. |
| Patient portal | Partial. Patient role can access the chatbot, but a full patient self-service portal is not implemented. |
| OCR/transcription | Partial. Review-first OCR/STT routes and adapter structure exist, but runtime quality still depends on optional local model dependencies. |

## Missing Modules

- Audit log API and UI.
- Payment gateway integration/refunds.
- Full patient portal.
- Dedicated frontend automated test suite.
- CI pipeline and automated Docker smoke tests.
- Production deployment configuration.

## Tests That Actually Exist

Backend Jest tests:

- `backend/tests/auth.test.js`
- `backend/tests/ai.test.js`
- `backend/tests/appointments.test.js`
- `backend/tests/billing.routes.test.js`
- `backend/tests/billingCalculator.test.js`
- `backend/tests/consultations.test.js`
- `backend/tests/doctors.test.js`
- `backend/tests/health.test.js`
- `backend/tests/noShowRisk.test.js`
- `backend/tests/notifications.test.js`
- `backend/tests/dashboard.test.js`
- `backend/tests/patients.test.js`
- `backend/tests/pdfGenerator.test.js`
- `backend/tests/prescriptions.test.js`
- `backend/tests/labs.test.js`
- `backend/tests/pharmacy.test.js`
- `backend/tests/slotUtils.test.js`

AI pytest tests:

- `ai-service/tests/test_ai_foundation.py`
- `ai-service/tests/test_clinical_note.py`
- `ai-service/tests/test_clinical_note_routes.py`
- `ai-service/tests/test_clinical_suggestions.py`
- `ai-service/tests/test_drug_safety.py`
- `ai-service/tests/test_guardrails.py`
- `ai-service/tests/test_health.py`
- `ai-service/tests/test_lab_report_extract.py`
- `ai-service/tests/test_no_show.py`
- `ai-service/tests/test_no_show_prediction.py`
- `ai-service/tests/test_no_show_training.py`
- `ai-service/tests/test_ocr_extract.py`
- `ai-service/tests/test_prescription_advice.py`
- `ai-service/tests/test_stt_routes.py`
- `ai-service/tests/test_symptom_checker.py`
- `ai-service/tests/test_upload_placeholders.py`

Frontend tests: none found. The frontend is currently verified by production build and live Vite route probes.

## Verified Commands That Pass

| Command | Result |
| --- | --- |
| `cd backend; npm.cmd test` | Passed: 17/17 suites, 112/112 tests |
| `cd frontend; npm.cmd run build` | Passed: Vite build, 219 modules transformed |
| `cd ai-service; python -m pytest` | Passed: 51/51 tests |
| `cd backend; npm.cmd run check:env` | Passed with `NODE_ENV=development`, `MONGO_MODE=atlas` |
| `cd backend; node -e "require('./src/seed/seedAdmin'); require('./src/seed/seedDemoData')"` | Passed: seed modules loaded without syntax/import errors |
| Backend live startup probe on port `5000` | Passed: `/`, `/health`, `/api/v1/health`, `/api-docs` returned HTTP 200 |
| AI live startup probe on port `8035` | Passed: `/health`, `/api/v1/health` returned HTTP 200 |
| Frontend live Vite startup log probe | Passed: Vite dev server reached ready state locally after startup |
| TypeScript leftover scan | Passed: no `.ts`/`.tsx` matches outside ignored folders |

Docker command attempted:

```powershell
docker compose config
```

Result: failed because `docker` is not installed on this machine. Docker runtime/build is therefore unverified in this audit.

## Verified Backend Routes That Exist

Base:

- `GET /`
- `GET /health`
- `GET /api/v1/health`
- `GET /api-docs`

Auth:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

Users:

- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id/role`
- `PATCH /api/v1/users/:id/status`

Patients:

- `POST /api/v1/patients`
- `GET /api/v1/patients`
- `GET /api/v1/patients/:id`
- `PATCH /api/v1/patients/:id`
- `DELETE /api/v1/patients/:id`
- `GET /api/v1/patients/:id/history`
- `GET /api/v1/patients/:patientId/labs`
- `GET /api/v1/patients/:patientId/medicines`
- `GET /api/v1/patients/:patientId/notifications`
- `GET /api/v1/patients/:patientId/consultations`
- `GET /api/v1/patients/:patientId/clinical-history`

Doctors:

- `POST /api/v1/doctors`
- `GET /api/v1/doctors`
- `GET /api/v1/doctors/:id`
- `PATCH /api/v1/doctors/:id`
- `DELETE /api/v1/doctors/:id`
- `GET /api/v1/doctors/:doctorId/availability`
- `PUT /api/v1/doctors/:doctorId/availability`
- `PATCH /api/v1/doctors/:id/availability`
- `POST /api/v1/doctors/:doctorId/blocked-slots`

Appointments:

- `POST /api/v1/appointments`
- `GET /api/v1/appointments`
- `GET /api/v1/appointments/calendar`
- `GET /api/v1/appointments/available-slots`
- `GET /api/v1/appointments/:id`
- `PATCH /api/v1/appointments/:id/status`
- `PATCH /api/v1/appointments/:id/reschedule`
- `PATCH /api/v1/appointments/:id/cancel`

AI proxy:

- `POST /api/v1/ai/symptom-check`
- `POST /api/v1/ai/no-show`
- `POST /api/v1/ai/no-show-predict`
- `POST /api/v1/ai/format-clinical-note`
- `POST /api/v1/ai/clinical/diagnosis-suggestions`
- `POST /api/v1/ai/clinical/format-note`
- `POST /api/v1/ai/clinical/consultation-suggestions`
- `POST /api/v1/ai/prescription/format-advice`

Consultations:

- `POST /api/v1/consultations`
- `GET /api/v1/consultations`
- `GET /api/v1/consultations/appointment/:appointmentId`
- `GET /api/v1/consultations/patient/:patientId/history`
- `GET /api/v1/consultations/:id`
- `PATCH /api/v1/consultations/:id`
- `POST /api/v1/consultations/:id/ai-suggestions`
- `POST /api/v1/consultations/:id/ai-review`
- `POST /api/v1/consultations/:id/format-note`
- `POST /api/v1/consultations/:id/complete`
- `PATCH /api/v1/consultations/:id/complete`

Prescriptions:

- `POST /api/v1/prescriptions`
- `GET /api/v1/prescriptions/patient/:patientId`
- `GET /api/v1/prescriptions/consultation/:consultationId`
- `GET /api/v1/prescriptions/:id/download`
- `POST /api/v1/prescriptions/:id/finalize`
- `POST /api/v1/prescriptions/:id/cancel`
- `GET /api/v1/prescriptions/:id`
- `PATCH /api/v1/prescriptions/:id`

Billing:

- `POST /api/v1/billing/invoices`
- `GET /api/v1/billing/invoices`
- `GET /api/v1/billing/summary`
- `GET /api/v1/billing/patient/:patientId/invoices`
- `POST /api/v1/billing/invoices/:id/payments`
- `POST /api/v1/billing/invoices/:id/generate-pdf`
- `GET /api/v1/billing/invoices/:id/pdf`
- `PATCH /api/v1/billing/invoices/:id/cancel`
- `GET /api/v1/billing/invoices/:id`
- `PUT /api/v1/billing/invoices/:id`

Labs:

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

Pharmacy:

- `POST /api/v1/pharmacy/medicines`
- `GET /api/v1/pharmacy/medicines`
- `GET /api/v1/pharmacy/medicines/:id`
- `PATCH /api/v1/pharmacy/medicines/:id`
- `POST /api/v1/pharmacy/medicines/:id/batches`
- `POST /api/v1/pharmacy/dispense`
- `GET /api/v1/pharmacy/dispensings`
- `GET /api/v1/pharmacy/dispensings/:id`
- `PATCH /api/v1/pharmacy/dispensings/:id/cancel`

Notifications:

- `POST /api/v1/notifications/templates`
- `GET /api/v1/notifications/templates`
- `POST /api/v1/notifications/send`
- `POST /api/v1/notifications/appointment-reminder`
- `POST /api/v1/notifications/follow-up`
- `GET /api/v1/notifications/logs`
- `GET /api/v1/notifications/logs/:id`
- `PATCH /api/v1/notifications/logs/:id/cancel`
- `POST /api/v1/notifications/dispatch-pending`

Follow-ups:

- `GET /api/v1/follow-ups`
- `PATCH /api/v1/follow-ups/:id/status`

Dashboard:

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

## Verified AI Service Routes That Exist

- `GET /health`
- `GET /api/v1/health`
- `POST /api/v1/ai/symptom-check`
- `POST /api/v1/symptom-check`
- `POST /api/v1/ai/no-show`
- `POST /api/v1/ai/ocr-patient-document`
- `POST /api/v1/ai/transcribe`
- `POST /api/v1/transcribe`
- `POST /api/v1/ai/format-clinical-note`
- `POST /api/v1/format-clinical-note`
- `POST /api/v1/clinical/diagnosis-suggestions`
- `POST /api/v1/clinical/consultation-suggestions`
- `POST /api/v1/clinical/format-note`
- `POST /api/v1/prescription/format-advice`

## Verified Frontend Routes That Exist

- `/login`
- `/register`
- `/`
- `/dashboard`
- `/dashboard/appointments`
- `/dashboard/revenue`
- `/dashboard/patients`
- `/dashboard/labs`
- `/dashboard/pharmacy`
- `/dashboard/notifications`
- `/patients`
- `/patients/new`
- `/patients/:id`
- `/patients/:id/edit`
- `/patients/:patientId/history`
- `/patients/:patientId/labs`
- `/patients/:patientId/medicines`
- `/patients/:patientId/notifications`
- `/patients/:patientId/consultations`
- `/appointments`
- `/appointments/new`
- `/appointments/:id`
- `/appointments/:appointmentId/consultation`
- `/consultations`
- `/consultations/:consultationId`
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
- `/notifications/templates`
- `/notifications/logs`
- `/notifications/send`
- `/follow-ups`
- `/chatbot`
- `/prescriptions`
- `/prescriptions/new`
- `/prescriptions/:id`
- `/billing`
- `/billing/create`
- `/billing/:id`
- `/doctors`
- `/doctors/new`
- `/doctors/:id`
- `/doctors/:id/edit`
- `/doctors/:id/availability`

Note: `/appointments/calendar` is documented in README but is not an active frontend route. The active route is `/appointments`, which renders the appointment calendar page.

## Docker And Non-Docker Status

Non-Docker local flow:

- Backend tests pass.
- Backend env validation passes.
- Backend starts and responds to health/docs probes.
- AI service tests pass.
- AI service starts and responds to health/symptom probes.
- Frontend production build passes.
- Frontend dev server starts and responds to route probes.

Docker flow:

- `docker-compose.yml` defines `mongo`, `backend`, `ai-service`, and `frontend`.
- All three Dockerfiles exist.
- Docker runtime/build commands could not be verified because the local environment does not have Docker installed.

## Docs Match Status

Mostly accurate:

- `README.md` broadly matches the current hardened workflow after the Phase 15 update.
- `docs/API_CONTRACT.md` mostly lists the implemented backend and AI route families.
- AI safety language matches the code intent: assistive only, not final diagnosis.

Known mismatches:

- `docs/PHASE_ROADMAP.md` is outdated versus the actual phase history in `docs/IMPLEMENTATION_REPORT.md`.
- `docs/IMPLEMENTATION_REPORT.md` contains historical TypeScript-era sections. Later sections explain the JavaScript correction, but the old references are still present.
- `docs/AI_SERVICE.md` omits some newer backend AI proxy routes in its final backend-connection summary.
- `docs/SYSTEM_EXPLANATION_SIMPLE.md` still needs a small refresh to reflect the current hardened baseline wording.

## True Phase Completion

Confirmed complete enough to baseline:

- Foundation/auth/RBAC/patient/doctor/appointment/AI MVP/consultation/prescription/billing/lab/pharmacy/notifications/frontend integration are implemented and verified by tests/build/live probes.

Not fully complete:

- Phase 15 hardening is implemented, but full production rollout verification is still incomplete because Docker runtime/build and CI were not executable on this machine.
- Audit log UI/API, CI, and deployment rollout work are not implemented.

## Current Recommended Baseline Tag

Recommended tag name:

```text
baseline/phase-15-hardening-2026-04-23
```

This tag was not created during the audit because the `git` CLI is not available in this environment.
