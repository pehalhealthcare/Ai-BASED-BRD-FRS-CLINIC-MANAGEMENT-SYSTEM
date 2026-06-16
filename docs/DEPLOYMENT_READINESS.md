# Deployment Readiness

Audit date: April 23, 2026

## 1. Required Environment Variables

Root / Docker-oriented:

- `BACKEND_PORT`
- `FRONTEND_PORT`
- `AI_SERVICE_PORT`
- `MONGO_PORT`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `FRONTEND_URL`
- `BACKEND_URL`
- `BACKEND_API_URL`
- `AI_SERVICE_URL`
- `NOTIFICATION_PROVIDER`
- `ENABLE_MOCK_NOTIFICATIONS`

Backend:

- `NODE_ENV`
- `PORT`
- `MONGO_MODE`
- `MONGO_URI` or `MONGO_URI_LOCAL` or `MONGO_URI_ATLAS`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `AI_SERVICE_URL`
- `SEED_ADMIN_NAME`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

Frontend:

- `VITE_API_BASE_URL`
- `VITE_AI_BASE_URL`

AI service:

- `APP_ENV`
- `AI_SERVICE_HOST`
- `AI_SERVICE_PORT`
- `BACKEND_URL`
- `BACKEND_API_URL`
- `FRONTEND_URL`
- `CORS_ORIGINS`

## 2. Services And Ports

- MongoDB: `27017`
- Backend: `5000`
- AI service: `8000`
- Frontend: `5173`

## 3. Startup Order

Non-Docker:

1. MongoDB
2. Backend
3. AI service
4. Frontend

Docker Compose:

1. `mongo`
2. `ai-service`
3. `backend`
4. `frontend`

## 4. Health Endpoints

- Backend: `GET /health`
- Backend API: `GET /api/v1/health`
- AI service: `GET /health`
- AI service API: `GET /api/v1/health`

## 5. Seed Steps

Admin seed:

```bash
cd backend
npm run seed:admin
```

Demo seed:

```bash
cd backend
npm run seed
```

The current demo seed is idempotent and now covers clinic, users, doctors, patients, appointments, consultation, prescription, invoice, lab, pharmacy, and notification/follow-up sample records.

## 6. Smoke-Test Steps

1. Run `cd backend && npm test`
2. Run `cd frontend && npm run build`
3. Run `cd ai-service && python -m pytest`
4. Run `cd backend && npm run check:env`
5. Start backend and confirm `/`, `/health`, `/api/v1/health`
6. Start AI service and confirm `/health`, `/api/v1/health`
7. Start frontend and confirm the dashboard shell loads
8. If Docker is available, run `docker compose config` and `docker compose up --build`

## 7. Known Production Gaps

- Docker runtime/build is not verified on this machine because the `docker` CLI is unavailable here.
- CI is not configured yet.
- Audit logs still do not have a dedicated read API/UI.
- Frontend automated tests are still absent.
- Notification delivery is still mock-first/manual-dispatch for MVP operation.

## 8. Rollback Basics

- Keep tagged baselines before rollout.
- Revert to the previous known-good image/build if health endpoints fail after deployment.
- Restore environment variables from the last known-good deployment config.

## 9. Backup / Restore TODO Notes

- Define MongoDB backup cadence and restore drill procedure before production rollout.
- Define storage backup rules for generated prescription and invoice PDFs.

## 10. Monitoring / Logging TODO Notes

- Add centralized log aggregation before production rollout.
- Add uptime checks for backend and AI health endpoints.
- Add alerting for database disconnects and repeated 5xx responses.
