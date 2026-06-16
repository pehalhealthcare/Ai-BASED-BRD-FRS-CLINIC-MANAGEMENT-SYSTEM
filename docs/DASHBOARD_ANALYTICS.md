# Dashboard Analytics

Phase 14 adds a protected backend analytics layer under `/api/v1/dashboard`.

## Implemented Endpoints

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

## Date Range Rules

- `from` and `to` use `YYYY-MM-DD`.
- If omitted, the backend defaults to the last 30 days.
- `from` must not be after `to`.
- Very large ranges are capped in the backend for MVP safety.

## Clinic Scoping

- All analytics are clinic-scoped through the existing clinic-context helper.
- Super-admin clinic override uses the same safe override pattern as the rest of the backend.
- Doctor-facing endpoints use linked doctor profiles where the current data model supports doctor-owned analytics.

## Notes

- Revenue is best-effort from invoices plus pharmacy sales already stored in the main backend.
- Inventory snapshot metrics such as low-stock or near-expiry are current-state metrics rather than historical stock timelines.
- Doctor-scoped notification analytics are currently based on doctor-created notification logs plus doctor-linked follow-up tasks.
- The MVP frontend intentionally stays chart-light and uses cards, tables, and trend lists instead of heavy charting dependencies.
