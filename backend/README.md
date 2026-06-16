# AI-CMS Backend

This backend supports all three foundation run modes:

1. Docker with `docker compose`
2. Non-Docker local development with local MongoDB
3. Non-Docker local development with MongoDB Atlas

Phase 0/1/2 includes the backend runtime, health checks, environment validation, auth, RBAC, admin seeding, audit logging, Swagger, and test coverage. It does not include Phase 3 business modules.

Phase 3 extends that foundation with clinic-scoped patient and doctor management, readable patient/doctor codes, search, pagination, soft delete, and patient history placeholders.

## Tech Stack

- Node.js
- Express.js
- JavaScript
- MongoDB + Mongoose
- Zod
- JWT + RBAC
- Jest + Supertest

## Key Commands

```bash
npm install
npm run check:env
npm run seed:admin
npm run dev
npm test
```

## Backend Env Modes

- `MONGO_MODE=local`: uses `MONGO_URI_LOCAL`
- `MONGO_MODE=atlas`: uses `MONGO_URI_ATLAS`
- `MONGO_MODE=direct`: uses `MONGO_URI`

The backend can still start in development if MongoDB is temporarily unavailable. In that case, health routes stay up and database-backed APIs return a database-unavailable error until MongoDB becomes reachable.

## Health Endpoint

`GET /health` and `GET /api/v1/health` return:

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

## API Endpoints

- `GET /health`
- `GET /api/v1/health`
- `GET /api-docs`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id/role`
- `PATCH /api/v1/users/:id/status`
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

## Notes

- The backend is JavaScript-only.
- Docker is optional, not required.
- Atlas placeholders in `MONGO_URI_ATLAS` are rejected with a clear error.
- Admin seeding is idempotent and safe to rerun.
- Phase 3 patient and doctor queries are clinic-scoped and require authenticated JWT access.
