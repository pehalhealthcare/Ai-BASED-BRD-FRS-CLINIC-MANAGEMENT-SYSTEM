# Next Phase Recommendation

Audit date: April 26, 2026

## Exact Next Implementation Target

Recommended next phase:

```text
Phase 21 - Reminder Optimization + Model Operations
```

Move from a feature-complete local baseline into operational AI follow-through: better staff intervention on no-show risk, safer model lifecycle handling, and more practical appointment-reminder optimization.

## Why This Is Next

The verified workflow now covers patient registration, doctor management, appointment scheduling, consultation/EMR, prescriptions, billing, lab results, pharmacy dispensing, notifications, follow-up tasks, backend-owned dashboard analytics, drug safety, OCR/STT assistive flows, and trainable no-show prediction. The next missing layer is operationalizing those AI-assisted appointment workflows:

Verified clinic workflow -> trainable no-show scoring -> reminder intervention workflows -> model runbooks / retraining -> safer production usage

## Dependencies Already Satisfied

- Auth and RBAC are implemented.
- Clinic scoping exists across all major business modules.
- Backend dashboard analytics and date-range filtering now exist.
- Trainable no-show prediction with fallback behavior now exists.
- Backend appointment flow already stores no-show enrichment without blocking booking.
- Appointment, consultation, prescription, lab, pharmacy, and notification data are now stored in the main backend.
- Patient history and dashboard analytics already aggregate multiple business records.
- Audit logging exists for most write actions, even if read visibility is still incomplete.
- Frontend route guards, loading states, dashboard shell, and dashboard section pages already exist.
- Backend test patterns are established across all major modules.
- Phase 15 aligned env examples, Docker structure, Postman requests, and demo seed coverage with the current codebase.

## Risks Before Proceeding

- Docker runtime is still unverified in the current environment.
- CI is still missing, so the strong local baseline is not yet mirrored in automated pipelines.
- Notification dispatch is still mock-first/manual, so no-show intervention loops are not yet operationally strong.
- No-show training currently accepts uploaded historical rows rather than a first-class backend export/import workflow.
- Frontend automated tests are still absent.

## Proposed Scope

Backend:

- Add appointment reminder / confirmation workflow hooks that can consume no-show risk bands safely.
- Add model artifact/retraining runbook support and safer training-data ingestion from backend exports.
- Expand audit visibility for AI no-show predictions and interventions.

Frontend:

- Surface no-show intervention actions and staff follow-up workflow beyond passive risk badges.
- Add at least a minimal automated frontend smoke suite around appointment flows and AI warning states.

Ops / Verification:

- Add CI automation for backend tests, frontend build, and AI-service tests.
- Verify Docker Compose build/start in a Docker-enabled environment.
- Document how and when the no-show model should be retrained, rolled back, or left in fallback mode.

## Acceptance Criteria

1. Staff can act on no-show risk with a clearer reminder / confirmation workflow.
2. Model training, fallback, and rollback expectations are documented operationally.
3. Backend, frontend, and AI-service checks are automated in CI or clearly staged for CI adoption.
4. Frontend has at least a minimal automated test baseline in addition to `npm run build`.
5. The current 17-suite backend test baseline, frontend build, and 51-test AI pytest suite remain green.

## Not In Scope For This Next Phase

- New business modules unrelated to appointment reliability or AI operations.
- Heavy infrastructure such as distributed queues or data warehouses.
- Advanced cross-clinic forecasting or BI beyond the no-show intervention workflow.
- Any use of predictive scores to deny care or silently alter clinical scheduling policy.

## Recommended Baseline Before Starting

Use the verified baseline:

```text
baseline/phase-20-no-show-ml-2026-04-26
```

Create this tag only after confirming Git is available and the workspace contains only intended files.
