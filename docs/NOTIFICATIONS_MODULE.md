# Phase 13 Notifications Module

## Scope

Phase 13 adds a clinic-scoped, mock-first notifications and follow-up workflow to AI-CMS without introducing paid provider dependencies or heavy background infrastructure.

## Backend Surfaces

Models:

- `notification_templates`
- `notification_logs`
- `follow_up_tasks`

Routes:

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

## Provider Strategy

- Default provider: `mock`
- Supported provider names in Phase 13: `mock`, `console`, `email`
- Local development is safe even when no external provider credentials exist
- Provider selection is environment-aware through:
  - `NOTIFICATION_PROVIDER`
  - `ENABLE_MOCK_NOTIFICATIONS`

## Template Rendering

- Templates use `{{variableName}}` placeholders.
- Rendering happens in the backend.
- Missing variables do not crash the request.
- Missing values render as empty strings for MVP safety.

## Workflow Hooks

The notification service now exposes best-effort helper hooks for:

- appointment booking -> reminder intent
- consultation completion with `followUp.date` -> follow-up task creation
- prescription finalization -> prescription-ready notification
- invoice creation with due amount -> billing-due notification
- lab report finalization -> lab-report-ready notification

These hooks are intentionally non-blocking so notification failures do not break core clinical workflows.

## Patient History Integration

Patient history now includes:

- notification summary counts
- follow-up summary counts
- recent notification entries
- recent follow-up tasks

Dedicated patient notification history is also available at `/patients/:patientId/notifications`.

## Known Limitations

- No paid SMS, WhatsApp Business API, or production email provider integration
- No cron or queue worker for automatic dispatch
- `dispatch-pending` is manual for MVP operation
- Frontend exposes logs, templates, sending, and follow-up pages, but not a dedicated notification-log detail page yet
- Content remains administrative and assistive only; no autonomous clinical advice is generated
