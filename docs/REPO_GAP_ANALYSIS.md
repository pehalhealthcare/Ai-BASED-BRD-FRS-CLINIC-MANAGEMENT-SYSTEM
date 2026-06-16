# Repo Gap Analysis

Audit date: April 24, 2026

This file compares claimed/documented capabilities against the actual repository state verified from source, tests, builds, and startup probes.

## Claimed Feature Vs Actual Code Status

| Claimed feature area | Actual status |
| --- | --- |
| React + Vite + JavaScript frontend | Confirmed. Active frontend uses `.js`/`.jsx`; no active `.ts`/`.tsx` files found. |
| Node/Express JavaScript backend | Confirmed. Active backend uses CommonJS JavaScript. |
| MongoDB + Mongoose | Confirmed. Mongoose models exist for users, clinics, patients, doctors, appointments, consultations, AI predictions, prescriptions, invoices, audit logs, and counters. |
| JWT + RBAC | Confirmed. Auth and role middlewares are wired into protected route modules. |
| Zod validation | Confirmed. Backend validators use Zod across auth and business modules. |
| Patient management | Confirmed implemented with tests. |
| Doctor management | Confirmed implemented with tests. |
| Appointment scheduling | Confirmed implemented with tests. |
| AI service MVP | Confirmed implemented with tests; safe assistive model-adapter structure exists, with real trainable no-show support and fallback-driven behavior where optional dependencies/models are missing. |
| Consultation / EMR | Confirmed implemented with tests. |
| Prescription workflow | Confirmed implemented with tests and PDF generation. |
| Billing workflow | Confirmed implemented with tests and PDF generation. |
| Patient history | Confirmed implemented through patient history, consultations, prescriptions, lab orders, invoices, and dispensing history. |
| Dashboard | Confirmed implemented with protected backend analytics endpoints, date-range-aware aggregations, and dedicated frontend dashboard pages. |
| Audit logs | Partial. Internal write path exists; no API, UI, reporting, or tests focused on audit log review. |
| Docker support | Partial. Compose and Dockerfiles exist; Docker runtime cannot be verified here because Docker is missing. |
| Lab module | Confirmed implemented with clinic-scoped catalog, orders, reports, abnormal flag logic, patient history integration, and frontend pages. |
| Pharmacy module | Confirmed implemented with clinic-scoped medicines, stock batches, FEFO dispensing, pharmacy sale records, prescription linkage, patient medicine history, and frontend pages. |
| Notifications | Confirmed implemented as a mock-first clinic-scoped module with templates, logs, follow-up tasks, patient notification history, and frontend pages. |
| Full patient portal | Partial. Patient role can access chatbot, but self-service portal is not built. |
| Phase 15 hardening | Confirmed implemented as a stabilization pass: env examples were aligned, Docker config was tightened structurally, demo seed coverage improved, Postman was refreshed, and source-of-truth docs were updated. |

## Missing Files Or Modules

Backend modules not found:

- Audit routes/controller/validator for browsing audit logs

Frontend feature/page areas not found:

- Audit log viewer pages
- Dedicated patient portal pages beyond chatbot access
- Dedicated automated frontend test files/config

Test coverage not found:

- Frontend unit/component tests
- Docker smoke tests
- Dedicated audit-log API/UI tests

CI/deployment files not found during source review:

- No GitHub Actions/GitLab CI workflow was identified in the audited source listings.
- No production deployment manifests beyond local Docker Compose were identified.

## Broken Imports

No confirmed broken imports surfaced in current verification:

- Backend Jest suite passed: 17/17 suites, 104/104 tests.
- Frontend Vite production build passed.
- AI pytest suite passed: 21/21 tests.

Residual risk:

- No dedicated static import/dead-code checker is configured.
- Some duplicate/compatibility files may hide unused code paths even though the active build passes.

## Inconsistent Docs

| File | Inconsistency |
| --- | --- |
| `docs/PHASE_ROADMAP.md` | Planned phase list no longer matches the actual implemented phase history. For example, prescriptions and billing are implemented before the roadmap's admin-dashboard/audit-log phase wording. |
| `docs/IMPLEMENTATION_REPORT.md` | Contains older TypeScript-era file lists and descriptions. Later JavaScript correction sections supersede them, but the old sections remain easy to misread. |
| `docs/AI_SERVICE.md` | Final backend-connection section lists only the older Phase 5 proxy routes and omits newer clinical and prescription AI proxy routes. |
| `docs/DATABASE_DESIGN.md` | Still contains some stale early-phase wording near the initial collection overview even though later sections reflect the active models. |
| `docs/SYSTEM_EXPLANATION_SIMPLE.md` | Needs a small baseline refresh so its workflow summary includes pharmacy and its Docker wording stays qualified as environment-dependent. |

## Duplicate Or Legacy Files

Generated/local artifacts present in the workspace:

- `backend/node_modules`
- `frontend/node_modules`
- `backend/dist`
- `frontend/dist`
- `ai-service/.venv`
- `ai-service/.pytest_cache`
- `ai-service/**/__pycache__`
- `backend/uploads/prescriptions/*.pdf`
- `backend/storage/invoices/*.pdf`
- Root probe output files such as `backend_phase10_start.out`, `ai_phase10_start.err`, and similar logs

These are ignored by `.gitignore`, but they are present in the local workspace and can confuse repository audits if not explicitly ignored.

Compatibility or duplicate source paths:

- `frontend/src/routes/AppRoutes.jsx` is a compatibility export for `frontend/src/app/routes.jsx`.
- `frontend/src/pages/*` wrappers and `frontend/src/features/*` modules coexist. This appears intentional but should be documented as wrapper-vs-feature layering.
- `frontend/src/api/prescriptionApi.js` and `frontend/src/features/prescriptions/prescriptionApi.js` both exist; verify whether both are still needed.
- `frontend/src/features/consultations/consultationApi.js` and `frontend/src/features/consultations/consultations.api.js` both exist; verify whether both are still needed.
- `ai-service/app/api/clinical_note_routes.py` only re-exports `clinical_routes.router`; it looks like a legacy compatibility alias.

## Technical Debt Found

- Docker runtime is not part of the current local verification because Docker is missing from the machine.
- Frontend has no automated tests beyond build verification.
- Dashboard backend exists now, but the main frontend bundle still triggers a Vite large-chunk warning and can benefit from route-level code-splitting.
- Audit logging has no read/review workflow, making audit data difficult to use operationally.
- Notification delivery is mock/provider-placeholder based and uses manual pending dispatch rather than a background worker.
- AI OCR and transcription are safe placeholders, not real production model integrations.
- Dispensing uses service-layer rollback safeguards but not a multi-document MongoDB transaction yet.
- Doctor-scoped notification analytics are best-effort and currently use doctor-created notification logs plus doctor-linked follow-up tasks rather than deeper relation tracing across every notification type.
- Swagger coverage exists, but only part of the current route surface is documented inline.
- Backend logout is stateless; JWT revocation/refresh-token rotation is not implemented.
- Demo/local `.env` files exist in the workspace. Do not commit real secrets or production credentials.
- Generated PDFs, build outputs, dependency folders, and historical probe logs are present locally and should stay ignored.
- Swagger/OpenAPI documentation exists, but route documentation is not guaranteed to be complete for all current modules.

## Suggested Cleanup Tasks

1. Update remaining docs so `PHASE_ROADMAP.md`, `AI_SERVICE.md`, and `SYSTEM_EXPLANATION_SIMPLE.md` reflect the current Phase 15 hardened baseline.
2. Add a short "historical sections below" warning near the TypeScript-era parts of `docs/IMPLEMENTATION_REPORT.md`.
3. Remove or quarantine local generated artifacts before packaging or sharing the repo: `dist`, `node_modules`, `__pycache__`, `.pytest_cache`, `.venv`, probe `.out/.err`, and generated PDFs.
4. Decide whether duplicate frontend API wrappers and route shims are intentional compatibility layers; delete only after import review.
5. Add frontend tests for auth route guards, dashboard loading/error states, and lab/pharmacy/notification workflow forms.
6. Add Docker verification in a Docker-enabled environment: `docker compose config`, `docker compose build`, and service health probes.
7. Add a dedicated audit-log read API and admin UI before claiming audit logs as a complete module.
8. Add route-level frontend code-splitting or manual chunks for the dashboard-heavy bundle before production deployment.
9. Decide whether notification dispatch should stay manual or move to a lightweight worker before the next operational release.
10. Expand Swagger/OpenAPI coverage for the most-used protected modules.
11. Keep AI placeholder status explicit until real OCR/transcription/ML integrations are implemented and validated.
