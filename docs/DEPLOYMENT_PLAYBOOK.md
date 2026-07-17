# pehalhealthcare Clinic Management System (AICMS)
## Architecture Analysis & Hostinger Production Deployment Guide

This artifact contains the end-to-end operational analysis of the AICMS codebase and a step-by-step production deployment playbook tailored for Hostinger VPS (Ubuntu).

---

## Part 1: End-to-End System Architecture

AICMS is a multi-tenant clinic management system with decoupled microservices:

```mermaid
graph TD
    Client[Browser Frontend - React/Vite] -->|https| Nginx{Nginx Reverse Proxy}
    Nginx -->|/api/v1| NodeServer[Backend Server - Node.js/Express]
    Nginx -->|/ai/v1| PyServer[AI Service - FastAPI/Uvicorn]
    NodeServer -->|Mongoose| MongoDB[(MongoDB Database)]
    PyServer -->|API Queries| NodeServer
    PyServer -->|LangChain/OpenAI| Gemini[External LLM Providers]
```

### 1. Frontend Client (`frontend/`)
* **Framework**: React 18, Vite.
* **Styling**: TailwindCSS & Custom Vanilla CSS styles for premium layouts.
* **State & Routing**: React Router v6, Axios with JWT interceptor (`axiosClient.js`).
* **Main Entry**: Compiled to static html/css/js bundles.

### 2. Node.js Backend Server (`backend/`)
* **Runtime**: Node.js & Express.
* **Database Driver**: Mongoose ORM for schema validation, models (`modules/`), and query isolation.
* **Authentication**: JSON Web Token (JWT) with Role-Based Access Control (RBAC) (Super Admin, Clinic Admin, Doctor, Receptionist, Pharmacist, Lab Technician, Patient).
* **Validation**: Zod schema middleware.

### 3. AI Service (`ai-service/`)
* **Framework**: FastAPI (Python 3.10+).
* **Services**: Symptoms Analysis, AI SOAP notes formatting, warning signs extraction.
* **Integrations**: LangChain, OpenAI API key interface, Axios callbacks to Node.js backend to update consultation objects.

---

## Part 2: Production Setup on Hostinger VPS (Ubuntu)

Hostinger VPS provides root-level SSH access on Ubuntu. This guide describes deploying the system natively using **PM2**, **Nginx**, and **MongoDB Atlas** for high performance and minimal memory footprint.

### Step 1: Pre-requisites installation
Connect to your Hostinger VPS via SSH and install the system dependencies:
```bash
sudo apt update && sudo apt upgrade -y

# Install Node.js v20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.10+, pip, venv & Nginx
sudo apt install -y python3-pip python3-venv nginx git curl

# Install PM2 (Node process manager) globally
sudo npm install -y -g pm2
```

### Step 2: Code Retrieval & Folder Setup
Clone your repository to `/var/www/` directory:
```bash
cd /var/www
git clone https://github.com/pehalhealthcare/Ai-BASED-BRD-FRS-CLINIC-MANAGEMENT-SYSTEM.git cms
cd cms
```

### Step 3: MongoDB Atlas Integration
Since MongoDB Atlas is hosting the database, retrieve your Connection String from the Atlas Dashboard:
* Standard Connection String: `mongodb+srv://<username>:<password>@cluster.mongodb.net/ai-cms?retryWrites=true&w=majority`
* Ensure the Hostinger VPS IP address is added to the MongoDB Atlas Network Access IP Whitelist.

### Step 4: Backend Configuration & Start
1. Create a production `.env` file inside `/var/www/cms/backend/`:
```env
NODE_ENV=production
PORT=5001
MONGO_MODE=atlas
MONGO_URI_ATLAS=mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority
JWT_SECRET=production_secret_key_change_me
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-domain.com
FRONTEND_URL=https://your-domain.com
AI_SERVICE_URL=http://localhost:8000
API_PREFIX=/api/v1
```
2. Build and run the server using PM2:
```bash
cd /var/www/cms/backend
npm install --omit=dev
# Seed initial administrator record (if new database)
npm run seed:admin
# Start server process via PM2
pm2 start src/app.js --name "cms-backend"
```

### Step 5: AI Service Configuration & Start
1. Configure dependencies and virtual environment:
```bash
cd /var/www/cms/ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
2. Create `.env` file:
```env
APP_ENV=production
AI_SERVICE_HOST=127.0.0.1
AI_SERVICE_PORT=8000
BACKEND_URL=http://localhost:5001
LLM_API_KEY=your-openai-api-key
```
3. Run FastAPI using PM2 under the Python virtual environment:
```bash
pm2 start "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000" --name "cms-ai-service"
```

### Step 6: Frontend Build & Compile
1. Configure environment variables for production build inside `/var/www/cms/frontend/.env`:
```env
VITE_API_BASE_URL=https://your-domain.com/api/v1
VITE_AI_BASE_URL=https://your-domain.com/ai/v1
```
2. Install dependencies and compile the static bundle:
```bash
cd /var/www/cms/frontend
npm install
npm run build
```
This outputs a ready-to-serve production folder at `/var/www/cms/frontend/dist`.

---

## Step 7: Nginx Routing Configuration
Configure Nginx as a reverse proxy to route `/` requests to the compiled React App, `/api` requests to Node.js backend, and `/ai` requests to the FastAPI Python service.

1. Create Nginx site configuration:
```bash
sudo nano /etc/nginx/sites-available/cms
```
2. Paste the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Static React build serving
    location / {
        root /var/www/cms/frontend/dist;
        try_files $uri /index.html;
    }

    # API Backend Proxy Routing
    location /api/v1/ {
        proxy_pass http://127.0.0.1:5001/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # AI FastAPI Proxy Routing
    location /ai/v1/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
3. Enable configuration and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/cms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 8: SSL (HTTPS) Configuration
Protect customer patient database transactions by enabling SSL using Certbot:
```bash
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Request Certificate (replace with actual domain name)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```
Accept default prompts to redirect all HTTP traffic to HTTPS.

---

## Part 3: Operational Commands Reference
Save these commands for maintaining your VPS services:

| Command | Action |
|---|---|
| `pm2 status` | Check running state of CMS backend and AI services |
| `pm2 logs` | View unified output logs |
| `pm2 restart all` | Reload all services after code updates |
| `sudo systemctl status nginx` | Check Nginx web server state |
| `git pull && pm2 restart all` | Deploy latest codebase changes |
