# Deployment Playbook: Clinic Management System (CMS)

This playbook outlines the steps required to deploy the complete Clinic Management System (Frontend, Backend, and AI Service) to a staging or production environment.

---

## 1. System Architecture & Ports

The system is split into three main deployable components:
- **Frontend App (React + Vite):** Serves the user interface.
- **Backend Core API (Node.js + Express):** Processes clinical operations, billing, user access, and operational unit mappings.
- **AI Service (Python FastAPI):** Handles OCR document scanning, Whisper Speech-to-Text translation, and clinical/demand forecasts.

### Port Mappings
| Service | External Port | Internal Port | Environment Key |
|---|---|---|---|
| Frontend | `5173` | `5173` | `FRONTEND_PORT` |
| Backend | `5001` | `5001` | `BACKEND_PORT` / `PORT` |
| AI Service | `8000` | `8000` | `AI_SERVICE_PORT` |

---

## 2. Environment Configuration (`.env`)

The project uses a **single unified `.env` file** at the project root directory. Do not maintain separate `.env` files inside child subdirectories (e.g. `frontend/`, `backend/`, `ai-service/`).

Create a `.env` file at the root folder with the following variables configured:

```ini
# Core Ports
BACKEND_PORT=5001
PORT=5001
FRONTEND_PORT=5173
AI_SERVICE_PORT=8000
AI_SERVICE_HOST=0.0.0.0

# General
NODE_ENV=production
APP_ENV=production

# Database
MONGO_MODE=atlas
MONGO_URI_ATLAS=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ai-cms?retryWrites=true&w=majority

# JWT Credentials
JWT_SECRET=your-secure-production-secret-key
JWT_EXPIRES_IN=7d

# Integration API Keys
LLM_API_KEY=your-openai-api-key
EMAIL_USER=your-smtp-email
EMAIL_PASS=your-smtp-password
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
RAZORPAY_API_KEY=your-razorpay-api-key
RAZORPAY_KEY_SECRET=your-razorpay-secret-key
VITE_RAZORPAY_KEY_ID=your-razorpay-api-key
```

---

## 3. Docker Deployment Setup

A `docker-compose.yml` file is provided at the project root for containerized deployment.

### Build and Run Containers
To build and launch all services in detached mode, execute:
```bash
docker compose up --build -d
```

### Seeding Initial Data
Once database containers are active, run the seeding commands to populate categories, initial admins, and pharmacy/lab catalogues:

```bash
# Seed initial Super Admin
docker compose exec backend npm run seed:admin

# Seed laboratory & pharmacy V1 structures
docker compose exec backend npm run seed:pharmacy-labs
```

---

## 4. Verification Checklists

Verify deployment health using the following checklist:

### A. Health Check Endpoints
- **Backend API Health:** `GET http://localhost:5001/api/v1/health` (should return `{ status: "UP" }`)
- **AI Service Health:** `GET http://localhost:8000/health` (should return `{ status: "UP" }`)

### B. Dynamic Subscriptions Check
- Log in to the Clinic Workspace and navigate to `/admin/subscription`.
- Verify that features (`pharmacy` or `labs`) enable or completely hide sidebar tabs.
