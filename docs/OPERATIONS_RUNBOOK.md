# Operations Runbook

Audit date: April 23, 2026

## Local Non-Docker Startup

Backend:

```bash
cd backend
npm run check:env
npm run dev
```

AI service:

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm run dev
```

## Docker Startup

```bash
cp .env.example .env
docker compose up --build
```

## Quick Health Checks

- Backend: `http://localhost:5000/health`
- Backend API: `http://localhost:5000/api/v1/health`
- AI service: `http://localhost:8000/health`
- AI service API: `http://localhost:8000/api/v1/health`
- Frontend: `http://localhost:5173`

## Seed Commands

```bash
cd backend
npm run seed:admin
npm run seed
```

## Common Troubleshooting Notes

- If backend env validation fails, check `JWT_SECRET`, seed admin vars, and MongoDB mode/URI fields.
- If MongoDB is unavailable in local mode, either start MongoDB locally or switch to Atlas/direct mode in backend env.
- If Docker is unavailable on the machine, use the non-Docker startup flow and treat Docker verification as pending.
- If the frontend build warns about large chunks, treat it as a performance follow-up, not a compile failure.
