# AI-CMS — AI-Based Clinic Management System

> An industry-ready, full-stack clinic management platform combining clinic operations, patient care workflows, billing, laboratory, pharmacy, analytics, and assistive AI capabilities in a single system.

[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue)](#tech-stack)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)](#tech-stack)
[![Database](https://img.shields.io/badge/Database-MongoDB-brightgreen)](#tech-stack)
[![AI Service](https://img.shields.io/badge/AI-FastAPI%20%2B%20Python-orange)](#tech-stack)
[![API](https://img.shields.io/badge/API-REST-lightgrey)](#api-overview)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED)](#running-with-docker)

---

## Table of Contents

- [Overview](#overview)
- [What AI-CMS Solves](#what-ai-cms-solves)
- [Core Capabilities](#core-capabilities)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Application Modules](#application-modules)
- [AI Capabilities](#ai-capabilities)
- [AI Safety and Human Oversight](#ai-safety-and-human-oversight)
- [Business and Clinical Workflow](#business-and-clinical-workflow)
- [Phase-by-Phase Development](#phase-by-phase-development)
- [Services and Ports](#services-and-ports)
- [Project Structure](#project-structure)
- [Environment Configuration](#environment-configuration)
- [Getting Started](#getting-started)
- [Running with Docker](#running-with-docker)
- [Running Without Docker](#running-without-docker)
- [MongoDB Atlas Setup](#mongodb-atlas-setup)
- [Database Seeding](#database-seeding)
- [Demo Credentials](#demo-credentials)
- [API Overview](#api-overview)
- [Frontend Routes](#frontend-routes)
- [Health Checks](#health-checks)
- [Testing](#testing)
- [Forecasting Logic](#forecasting-logic)
- [Billing Anomaly Detection](#billing-anomaly-detection)
- [Security and Data Integrity](#security-and-data-integrity)
- [Error Handling and Troubleshooting](#error-handling-and-troubleshooting)
- [Documentation](#documentation)
- [VS Code Quick Start](#vs-code-quick-start)
- [Current Scope and Limitations](#current-scope-and-limitations)
- [Project Status](#project-status)

---

# Overview

**AI-CMS** is an AI-based Clinic Management System designed to provide an end-to-end digital workflow for modern clinics.

The current repository covers **Phase 0 through Phase 23**, including:

- Runtime infrastructure
- Health endpoints
- Docker support
- Non-Docker local development
- Authentication
- Role-Based Access Control (RBAC)
- Audit logging
- Patient management
- Doctor management
- Appointment scheduling
- Consultation and EMR workflows
- Doctor-approved digital prescriptions
- Billing and invoice management
- Clinic-scoped laboratory workflows
- Pharmacy dispensing and inventory tracking
- Notifications and follow-up tasks
- Backend-owned dashboard analytics
- AI-assisted pharmacy demand forecasting
- Admin-only billing anomaly screening

The system is intentionally designed so that important business and clinical rules remain **backend-owned** instead of relying on frontend calculations or client-side assumptions.

---

# What AI-CMS Solves

Traditional clinic operations often require separate systems for:

- Patient registration
- Appointment scheduling
- Doctor availability
- Consultation records
- Prescriptions
- Billing
- Laboratory management
- Pharmacy inventory
- Notifications
- Reporting and analytics

AI-CMS brings these workflows together into one connected platform.

### Key goals

1. **Centralize clinic operations**
2. **Maintain clinic-scoped data**
3. **Reduce repetitive administrative work**
4. **Improve appointment and consultation workflows**
5. **Digitize prescriptions and clinical records**
6. **Connect billing, laboratory, and pharmacy workflows**
7. **Provide actionable clinic analytics**
8. **Use AI as an assistive layer rather than an autonomous clinical decision-maker**
9. **Keep critical calculations and validations on the backend**
10. **Maintain auditability across important workflows**

---

# Core Capabilities

## Clinic Operations

- Authentication
- JWT-based sessions
- RBAC
- Clinic-scoped data access
- Audit logging
- Dashboard analytics
- Staff and workflow management

## Patient Management

- Patient registration
- Patient profiles
- Search and pagination
- Patient history
- Clinical history
- Consultation history
- Prescription history
- Lab history
- Medicine history
- Invoice history

## Doctor Management

- Doctor registration and management
- Doctor profiles
- Doctor codes
- Clinic-scoped doctor records
- Availability management
- Blocked slots
- Doctor workload analytics

## Appointment Management

- Scheduled appointments
- Walk-in appointments
- Follow-up appointments
- Teleconsultation appointment type
- Slot availability
- Conflict prevention
- Calendar views
- Rescheduling
- Cancellation
- Appointment status workflow
- AI-assisted no-show prediction

## Consultation and EMR

- Appointment-linked consultation
- Symptoms
- Vitals
- Diagnosis notes
- Treatment plans
- Follow-up instructions
- SOAP note formatting
- AI-assisted diagnosis suggestions
- Doctor review and approval
- Consultation history

## Digital Prescriptions

- Prescription drafts
- Medicine items
- Dosage
- Frequency
- Route
- Duration
- Timing
- Instructions
- Doctor confirmation
- Prescription finalization lock
- PDF generation
- Authenticated PDF download
- Patient prescription history
- AI-assisted advice formatting

## Billing

- Invoice creation
- Backend-owned calculations
- Subtotal
- Discounts
- GST
- Total
- Paid amount
- Due amount
- Payment status
- Partial payments
- Invoice cancellation
- Invoice PDFs
- Patient billing history
- Revenue analytics
- Billing anomaly screening

## Laboratory

- Clinic-scoped test catalog
- Test codes
- Categories
- Specimen information
- Units
- Reference ranges
- Pricing
- Consultation-linked lab orders
- Order numbers
- Sample collection workflow
- Processing workflow
- Result entry
- Abnormal flag detection
- Report finalization
- Patient lab history
- Audit events

## Pharmacy

- Medicine catalog
- Searchable medicine metadata
- Stock batches
- Stock recalculation
- Reorder levels
- Low-stock detection
- Near-expiry detection
- Expired-stock blocking
- Prescription-linked dispensing
- FEFO-style batch allocation
- Pharmacy sales
- Patient medicine history
- Demand forecasting
- Stockout-risk analysis
- Reorder recommendations

## Notifications and Follow-Ups

- Notification templates
- Variable rendering
- Notification logs
- Pending/sent/failed/cancelled states
- Mock-first provider abstraction
- Follow-up tasks
- Reminder logs
- Patient notification history
- Workflow-triggered notifications

## Analytics

Backend-owned dashboard analytics include:

- Overview metrics
- Appointment analytics
- Revenue analytics
- Patient analytics
- Laboratory analytics
- Pharmacy analytics
- Notification analytics
- Doctor workload
- No-show summaries
- Recent activity

---

# System Architecture

AI-CMS uses a service-oriented full-stack architecture.

```text
                         ┌──────────────────────┐
                         │      End User        │
                         │  Admin / Doctor /    │
                         │ Patient / Staff      │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ React + Vite         │
                         │ Frontend             │
                         │ JavaScript           │
                         └──────────┬───────────┘
                                    │ REST / Axios
                                    ▼
                         ┌──────────────────────┐
                         │ Node.js + Express    │
                         │ Backend API          │
                         │ JWT + RBAC + Zod     │
                         └───────┬────────┬─────┘
                                 │        │
                    ┌────────────┘        └─────────────┐
                    ▼                                  ▼
          ┌──────────────────┐               ┌──────────────────┐
          │ MongoDB          │               │ Python FastAPI   │
          │ + Mongoose       │               │ AI Service       │
          └──────────────────┘               └──────────────────┘
                                                       │
                                                       ▼
                                           ┌──────────────────────┐
                                           │ Assistive AI / ML     │
                                           │ Services              │
                                           └──────────────────────┘
```

### Architectural principles

- Backend owns business rules.
- Frontend consumes backend APIs.
- AI functionality is isolated in a dedicated FastAPI service.
- MongoDB stores application data.
- AI failures should degrade safely.
- Clinical AI outputs require appropriate human review.
- Sensitive administrative review features are role-restricted.
- Client-side inventory and billing calculations are not trusted.

---

# Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| React | UI framework |
| Vite | Frontend tooling and development server |
| JavaScript | Application language |
| Tailwind CSS | UI styling |
| React Router | Client-side routing |
| Axios | API communication |

## Backend

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express.js | REST API |
| JavaScript | Application language |
| MongoDB | Database |
| Mongoose | MongoDB ODM |
| JWT | Authentication |
| RBAC | Authorization |
| Zod | Validation |

## AI Service

| Technology | Purpose |
|---|---|
| Python | AI/ML service language |
| FastAPI | AI REST service |
| StatsForecast | Pharmacy demand forecasting |
| AutoARIMA | Time-series forecasting |
| AutoETS | Time-series forecasting |
| XGBoost | Trainable no-show prediction path |
| IsolationForest | Optional billing anomaly scoring |

## Infrastructure

- Docker
- Docker Compose
- MongoDB local development
- MongoDB Atlas
- VS Code tasks

---

# Application Modules

## 1. Authentication and Authorization

The backend provides:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

Authentication uses JWT sessions.

Authorization is implemented using RBAC and clinic-scoped access.

---

## 2. Patient Management

Patients can be:

- Registered
- Searched
- Viewed
- Updated
- Removed
- Linked to appointments
- Linked to consultations
- Linked to prescriptions
- Linked to invoices
- Linked to laboratory orders/results
- Linked to pharmacy records

Readable patient IDs are backed by per-clinic counters.

---

## 3. Doctor Management

Doctor management includes:

- Doctor creation
- Doctor listing
- Doctor profile
- Doctor updates
- Doctor deletion
- Availability
- Blocked slots
- Workload analytics

Doctor records are clinic-scoped.

---

## 4. Appointment Scheduling

Appointment scheduling supports:

- Doctor-wise booking
- Slot conflict prevention
- Available slot lookup
- Day/week/month calendar views
- Walk-ins
- Scheduled visits
- Follow-ups
- Teleconsultation appointments
- Status transitions
- Rescheduling history
- Cancellation history
- No-show prediction

---

## 5. Consultation and EMR

A consultation can be linked directly to an appointment.

The consultation workspace supports:

```text
Patient
   │
   ▼
Appointment
   │
   ▼
Consultation
   ├── Symptoms
   ├── Vitals
   ├── Diagnosis
   ├── Clinical Notes
   ├── Treatment Plan
   ├── Follow-up
   └── AI Suggestions
             │
             ▼
       Doctor Review
```

AI suggestions are persisted for auditability and future evaluation.

---

## 6. Prescription Management

Prescription creation captures doctor-controlled medicine information:

- Medicine
- Dosage
- Frequency
- Route
- Duration
- Timing
- Instructions

A prescription cannot be finalized without explicit doctor confirmation.

The system can generate a PDF and provide an authenticated download endpoint.

---

## 7. Billing and Invoices

Billing calculations are performed by the backend.

The invoice flow supports:

```text
Invoice
 ├── Line Items
 ├── Subtotal
 ├── Discount
 ├── GST
 ├── Total
 ├── Paid
 └── Due
```

Payment statuses:

- `unpaid`
- `partial`
- `paid`
- `cancelled`

The system also supports invoice PDFs and patient-linked invoice history.

---

## 8. Laboratory Management

The laboratory module provides:

```text
Test Catalog
     │
     ▼
Lab Order
     │
     ├── ordered
     ├── sample_collected
     ├── processing
     ├── completed
     └── cancelled
             │
             ▼
        Lab Report
             │
             ▼
         Finalized
```

The backend performs rule-based abnormal result detection.

---

## 9. Pharmacy Management

The pharmacy module tracks:

- Medicine catalog
- Stock
- Batches
- Reorder levels
- Expiry
- Dispensing
- Sales
- Prescription linkage

Expired stock is blocked from dispensing.

Stock allocation and expiry checks are backend-owned.

---

# AI Capabilities

AI-CMS uses AI/ML as an **assistive layer** around clinic workflows.

## Current AI/ML areas

### Symptom Checking

```http
POST /api/v1/ai/symptom-check
```

Provides assistive symptom analysis with safety guardrails and output sanitization.

### No-Show Prediction

```http
POST /api/v1/ai/no-show
POST /api/v1/ai/no-show-predict
```

The system supports a rule-based fallback and a trainable XGBoost path when historical data and dependencies are available.

### Clinical Note Formatting

```http
POST /api/v1/ai/format-clinical-note
```

Formats clinical information into structured notes.

### Diagnosis Suggestions

```http
POST /api/v1/ai/clinical/diagnosis-suggestions
```

Provides assistive diagnosis suggestions for doctor review.

### Prescription Advice Formatting

```http
POST /api/v1/ai/prescription/format-advice
```

Formats doctor-provided advice text.

It does **not** autonomously prescribe medication.

### OCR / Document Intake

```http
POST /api/v1/ai/ocr-patient-document
```

The repository includes the intake endpoint and validation structure; it does not claim a production OCR engine by default.

### Transcription

```http
POST /api/v1/ai/transcribe
```

The repository includes the transcription intake path; it does not claim production Whisper/transcription infrastructure by default.

### Pharmacy Demand Forecasting

```http
POST /api/v1/ai/pharmacy-demand
POST /api/v1/ai/train/pharmacy-demand
```

Forecasts:

- Next 7-day demand
- Next 30-day demand
- Stockout risk
- Reorder quantity
- Expiry risk
- Reason codes
- Model status

### Billing Anomaly Screening

```http
POST /api/v1/ai/billing-anomaly
POST /api/v1/ai/train/billing-anomaly
```

Screens billing records for possible anomalies and revenue leakage using explainable rules first, with optional IsolationForest scoring when sufficient historical data and dependencies exist.

---

# AI Safety and Human Oversight

AI-CMS intentionally does not treat AI output as an autonomous medical decision.

### Clinical AI

- Diagnosis suggestions require doctor review.
- AI suggestions must be accepted, rejected, or partially accepted by the doctor.
- Prescription assistance only formats doctor-provided advice.
- AI does not automatically prescribe medication.
- Medical outputs include safety guardrails and sanitization.

### Pharmacy AI

Pharmacy forecasting is assistive.

Forecasts:

- Do not block dispensing.
- Do not represent validated production accuracy.
- Do not automatically become procurement decisions.
- Must be reviewed by an admin or pharmacist.

### Billing AI

Billing anomaly detection:

- Is admin-facing.
- Is not shown to patients, doctors, receptionists, or pharmacists.
- Is an assistive review signal.
- Is not a final fraud judgment.
- Uses safe fallback behavior when ML artifacts/dependencies are unavailable.

---

# Business and Clinical Workflow

A typical clinic workflow can be represented as:

```text
Patient Registration
        │
        ▼
Appointment Booking
        │
        ▼
Doctor Consultation
        │
        ├───────────────┐
        ▼               ▼
Diagnosis          Lab Orders
        │               │
        ▼               ▼
Prescription       Lab Results
        │               │
        └───────┬───────┘
                ▼
             Billing
                │
                ▼
       Pharmacy / Dispensing
                │
                ▼
      Notifications / Follow-up
                │
                ▼
        Dashboard Analytics
```

This creates a connected patient journey instead of isolated modules.

---

# Phase-by-Phase Development

## Phase 0–2 — Foundation

Established:

- Runtime infrastructure
- Health endpoints
- Docker support
- Non-Docker development
- Authentication
- RBAC
- Audit logging

## Phase 3 — Patient and Doctor Management

Added:

- Clinic-scoped patients
- Patient search and pagination
- Patient history foundation
- Clinic-scoped doctors
- Doctor availability
- Readable patient IDs
- Readable doctor codes

## Phase 4 — Appointment Scheduling

Added:

- Doctor-wise booking
- Conflict prevention
- Appointment types
- Calendar APIs
- Available slots
- Status workflow
- Rescheduling
- Cancellation
- No-show prediction
- Appointment UI

## Phase 5 — AI Service Foundation

Added:

- FastAPI service
- AI health endpoints
- Symptom checking
- No-show prediction
- OCR intake placeholder
- Transcription intake placeholder
- Clinical note formatting
- AI safety guardrails
- Upload validation

## Phase 6 — Consultation and EMR

Added:

- Consultation workflows
- Structured EMR
- Symptoms
- Vitals
- Diagnosis
- Treatment plan
- Follow-up
- SOAP formatting
- AI diagnosis suggestions
- Doctor review flow
- AI prediction persistence

## Phase 7 — Digital Prescriptions

Added:

- Prescription drafts
- Medicine items
- Doctor-controlled instructions
- Doctor confirmation
- Finalization lock
- PDF generation
- Authenticated PDF downloads
- Patient prescription history
- AI advice formatting

## Phase 8 — Billing

Added:

- Invoice creation
- Backend-owned calculations
- Payment recording
- Payment status
- Billing summaries
- Invoice PDFs
- Patient invoice history
- Frontend billing screens

## Phase 9 — Frontend Application Shell

Added:

- React + Vite application shell
- Login
- JWT handling
- Sidebar
- Topbar
- Shared loading/error/empty states
- Live backend API integration
- Dashboard
- Patient
- Appointment
- Consultation
- Chatbot
- Prescription
- Billing screens

The frontend does not replace missing backend business logic with fake mock data.

## Phase 11 — Laboratory

Added:

- Test catalog
- Lab orders
- Order status workflow
- Reports
- Result editing
- Abnormal flags
- Report finalization
- Patient lab history
- Audit events

## Phase 12 — Pharmacy

Added:

- Medicine catalog
- Stock batches
- Reorder levels
- Low-stock detection
- Expiry checks
- FEFO-style dispensing
- Pharmacy sales
- Medicine history
- Dispensing workflows

## Phase 13 — Notifications and Follow-Ups

Added:

- Notification templates
- Notification logs
- Provider abstraction
- Follow-up tasks
- Reminder logs
- Patient notification history
- Workflow notification hooks
- Audit events

## Phase 14 — Dashboard Analytics

Added:

- Overview
- Appointment analytics
- Revenue analytics
- Patient analytics
- Lab analytics
- Pharmacy analytics
- Notification analytics
- Doctor workload
- No-show analytics
- Activity feed

## Phase 15 — Stabilization

Added:

- Docker/runtime hardening
- Container health checks
- Environment alignment
- Refreshed demo seed data
- Postman collection cleanup
- Documentation refresh
- Deployment-readiness documentation
- Testing strategy
- Operations documentation

## Phase 22 — Pharmacy Demand Forecasting

Added:

- Pharmacy demand forecasting
- StatsForecast integration
- AutoARIMA / AutoETS preference
- Moving-average fallback
- Forecast persistence
- Stockout risk
- Reorder intelligence
- Expiry risk
- Forecast status visibility

## Phase 23 — Billing Anomaly Review

Added:

- Billing anomaly screening
- Explainable billing rules
- Optional IsolationForest scoring
- Anomaly persistence
- Admin-only review APIs
- Review/dismiss/confirm actions
- Dashboard visibility
- Safe fallback behavior

---

# Services and Ports

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend | `http://localhost:5000` |
| Backend Health | `http://localhost:5000/health` |
| Backend API Docs | `http://localhost:5000/api-docs` |
| AI Service | `http://localhost:8000` |
| AI Health | `http://localhost:8000/health` |

---

# Project Structure

A typical repository structure is:

```text
AI-CMS/
├── backend/
│   ├── app/
│   ├── storage/
│   │   └── invoices/
│   ├── .env.example
│   ├── package.json
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── ...
│
├── ai-service/
│   ├── app/
│   ├── requirements.txt
│   ├── .env.example
│   └── ...
│
├── docs/
│   ├── IMPLEMENTATION_REPORT.md
│   ├── DASHBOARD_ANALYTICS.md
│   ├── DEPLOYMENT_READINESS.md
│   ├── TESTING_STRATEGY.md
│   └── OPERATIONS_RUNBOOK.md
│
├── .vscode/
│   └── tasks.json
│
├── docker-compose.yml
└── README.md
```

---

# Environment Configuration

## Backend

Copy the example environment:

```bash
cd backend
cp .env.example .env
```

Validate the environment:

```bash
npm run check:env
```

The backend supports:

```text
MONGO_MODE=local
```

or:

```text
MONGO_MODE=atlas
MONGO_URI_ATLAS=mongodb+srv://username:password@cluster-url/ai-cms?retryWrites=true&w=majority
```

---

# Getting Started

## Prerequisites

Install:

- Node.js
- npm
- Python
- MongoDB for local database mode, or MongoDB Atlas
- Docker and Docker Compose if using Docker

---

# Running with Docker

From the repository root:

```bash
cp .env.example .env
docker compose up --build
```

Then open:

```text
Frontend:
http://localhost:5173

Backend:
http://localhost:5000

Backend Health:
http://localhost:5000/health

API Docs:
http://localhost:5000/api-docs

AI Service:
http://localhost:8000

AI Health:
http://localhost:8000/health
```

---

# Running Without Docker

## Terminal 1 — MongoDB

Start MongoDB locally.

---

## Terminal 2 — Backend

```bash
cd backend

cp .env.example .env

npm install

npm run check:env

npm run seed:admin

npm run dev
```

---

## Terminal 3 — AI Service

### Windows

```bash
cd ai-service

python -m venv .venv

.venv\Scripts\activate

pip install -r requirements.txt

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### macOS/Linux

```bash
cd ai-service

python -m venv .venv

source .venv/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Terminal 4 — Frontend

```bash
cd frontend

cp .env.example .env

npm install

npm run dev
```

The frontend should then be available at:

```text
http://localhost:5173
```

---

# MongoDB Atlas Setup

1. Create a MongoDB Atlas cluster.
2. Create a database user.
3. Add your current public IP address to Atlas Network Access.
4. Copy the SRV connection string.
5. Replace the username, password, and cluster URL.
6. Use `ai-cms` as the database name unless you intentionally choose another name.

Example:

```env
MONGO_MODE=atlas
MONGO_URI_ATLAS=mongodb+srv://username:password@cluster-url/ai-cms?retryWrites=true&w=majority
```

Then:

```bash
cd backend

npm run check:env
npm run seed:admin
npm run dev
```

---

# Database Seeding

## Seed Super Admin

```bash
cd backend

npm install
npm run check:env
npm run seed:admin
```

The seed script creates a `SUPER_ADMIN` only when the configured email does not already exist.

## Seed Demo Data

```bash
cd backend

npm install
npm run seed
```

The demo seed is idempotent.

It creates:

- 1 demo clinic
- 1 super admin user
- 1 receptionist user
- 1 doctor user
- 1 patient user
- 2 doctor records with availability
- 3 patient records
- 2 appointments
- 1 completed consultation
- 1 finalized prescription
- 1 issued invoice with partial payment history
- 1 completed lab order
- 1 finalized lab report
- 1 medicine catalog item
- 1 dispensing record
- 1 pharmacy sale
- 1 notification template
- 1 sent notification log
- 1 follow-up task

---

# Demo Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@aicms.local` | `Admin123!` |
| Receptionist | `receptionist@aicms.local` | `Reception@12345` |
| Doctor | `doctor@aicms.local` | `Doctor@12345` |
| Patient | `patient@aicms.local` | `Patient@12345` |

> These credentials are intended for local/demo environments. Do not use them in production.

---

# API Overview

The backend API is versioned under:

```text
/api/v1
```

## Foundation

```http
GET  /health
GET  /api/v1/health
GET  /api-docs

POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

## Patients

```http
POST   /api/v1/patients
GET    /api/v1/patients
GET    /api/v1/patients/:id
PATCH  /api/v1/patients/:id
DELETE /api/v1/patients/:id
GET    /api/v1/patients/:id/history
GET    /api/v1/patients/:patientId/labs
GET    /api/v1/patients/:patientId/medicines
```

## Doctors

```http
POST   /api/v1/doctors
GET    /api/v1/doctors
GET    /api/v1/doctors/:id
PATCH  /api/v1/doctors/:id
DELETE /api/v1/doctors/:id
PATCH  /api/v1/doctors/:id/availability
```

## Appointments

```http
POST   /api/v1/appointments
GET    /api/v1/appointments
GET    /api/v1/appointments/calendar
GET    /api/v1/appointments/available-slots
GET    /api/v1/appointments/:id
PATCH  /api/v1/appointments/:id/status
PATCH  /api/v1/appointments/:id/reschedule
PATCH  /api/v1/appointments/:id/cancel
GET    /api/v1/doctors/:doctorId/availability
PUT    /api/v1/doctors/:doctorId/availability
POST   /api/v1/doctors/:doctorId/blocked-slots
```

## AI

```http
POST /api/v1/ai/symptom-check
POST /api/v1/ai/no-show
POST /api/v1/ai/format-clinical-note

POST /api/v1/ai/clinical/diagnosis-suggestions
POST /api/v1/ai/clinical/format-note

POST /api/v1/ai/prescription/format-advice

POST /api/v1/ai/pharmacy-demand
POST /api/v1/ai/train/pharmacy-demand

POST /api/v1/ai/billing-anomaly
POST /api/v1/ai/train/billing-anomaly
```

## Consultations

```http
POST /api/v1/consultations
GET  /api/v1/consultations
GET  /api/v1/consultations/:id
PATCH /api/v1/consultations/:id
POST /api/v1/consultations/:id/ai-suggestions
POST /api/v1/consultations/:id/ai-review
POST /api/v1/consultations/:id/format-note
POST /api/v1/consultations/:id/complete
GET  /api/v1/consultations/appointment/:appointmentId
GET  /api/v1/consultations/patient/:patientId/history
GET  /api/v1/patients/:patientId/clinical-history
```

## Prescriptions

```http
POST /api/v1/prescriptions
GET  /api/v1/prescriptions/:id
GET  /api/v1/prescriptions/patient/:patientId
GET  /api/v1/prescriptions/consultation/:consultationId
PATCH /api/v1/prescriptions/:id
POST /api/v1/prescriptions/:id/finalize
POST /api/v1/prescriptions/:id/cancel
GET  /api/v1/prescriptions/:id/download
```

## Billing

```http
POST  /api/v1/billing/invoices
GET   /api/v1/billing/invoices
GET   /api/v1/billing/invoices/:id
PUT   /api/v1/billing/invoices/:id
POST  /api/v1/billing/invoices/:id/payments
POST  /api/v1/billing/invoices/:id/generate-pdf
GET   /api/v1/billing/invoices/:id/pdf
PATCH /api/v1/billing/invoices/:id/cancel
POST  /api/v1/billing/invoices/:id/refund
GET   /api/v1/billing/patient/:patientId/invoices
GET   /api/v1/billing/summary
```

## Laboratory

```http
POST  /api/v1/labs/tests
GET   /api/v1/labs/tests
POST  /api/v1/labs/orders
GET   /api/v1/labs/orders
GET   /api/v1/labs/orders/:id
PATCH /api/v1/labs/orders/:id/status
POST  /api/v1/labs/reports
GET   /api/v1/labs/reports/:id
PATCH /api/v1/labs/reports/:id
PATCH /api/v1/labs/reports/:id/finalize
```

## Pharmacy

```http
POST  /api/v1/pharmacy/medicines
GET   /api/v1/pharmacy/medicines
GET   /api/v1/pharmacy/medicines/:id
GET   /api/v1/pharmacy/medicines/:id/forecast
PATCH /api/v1/pharmacy/medicines/:id
POST  /api/v1/pharmacy/medicines/:id/batches
POST  /api/v1/pharmacy/dispense
GET   /api/v1/pharmacy/dispensings
GET   /api/v1/pharmacy/dispensings/:id
PATCH /api/v1/pharmacy/dispensings/:id/cancel
```

## Admin Billing Anomaly Review

```http
GET   /api/v1/admin/billing-anomalies
GET   /api/v1/admin/billing-anomalies/:id
PATCH /api/v1/admin/billing-anomalies/:id/review
```

## Dashboard Analytics

```http
GET /api/v1/dashboard/overview
GET /api/v1/dashboard/appointments
GET /api/v1/dashboard/revenue
GET /api/v1/dashboard/patients
GET /api/v1/dashboard/labs
GET /api/v1/dashboard/pharmacy
GET /api/v1/dashboard/notifications
GET /api/v1/dashboard/doctor-workload
GET /api/v1/dashboard/no-show
GET /api/v1/dashboard/activity-feed
```

---

# Frontend Routes

## Dashboard

```text
/dashboard
/dashboard/appointments
/dashboard/revenue
/dashboard/patients
/dashboard/labs
/dashboard/pharmacy
/dashboard/billing-fraud
/dashboard/notifications
```

## Appointments

```text
/appointments
/appointments/new
/appointments/:id
/appointments/:appointmentId/consultation
```

## Consultations

```text
/consultations/:consultationId
```

## Prescriptions

```text
/prescriptions
/prescriptions/new
/prescriptions/:id
/prescriptions/:prescriptionId/dispense
```

## Billing

```text
/billing
/billing/create
/billing/:id
```

## Patients

```text
/patients
/patients/new
/patients/:id
/patients/:id/edit
/patients/:patientId/history
/patients/:patientId/labs
/patients/:patientId/medicines
/patients/:patientId/consultations
```

## Doctors

```text
/doctors
/doctors/new
/doctors/:id
/doctors/:id/edit
/doctors/:id/availability
```

## Laboratory

```text
/consultations/:consultationId/labs/new
/labs/tests
/labs/orders
/labs/orders/:id
/labs/reports/:id
```

## Pharmacy

```text
/pharmacy/medicines
/pharmacy/medicines/new
/pharmacy/medicines/:id
/pharmacy/dispensings
/pharmacy/dispensings/:id
```

---

# Health Checks

## Backend

```http
GET /health
```

Expected response:

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
    }
  }
}
```

## AI Service

```http
GET /health
```

Expected response:

```json
{
  "success": true,
  "message": "AI service is healthy",
  "data": {
    "service": "ai-service",
    "status": "ok",
    "version": "1.0.0"
  }
}
```

---

# Testing

## Backend

```bash
cd backend
npm test
```

## AI Service

```bash
cd ai-service

pytest
python -m pytest
python -m py_compile app/main.py
```

## Frontend

```bash
cd frontend
npm run build
```

## Full Phase 23 Verification

```bash
cd ai-service
pytest

cd ../backend
npm test

cd ../frontend
npm run build
```

---

# Pharmacy Forecasting Logic

The pharmacy forecasting service uses the following data:

```text
medicine_id
medicine_name
current_stock
reorder_level
supplier_lead_time_days
sales_history
```

## Model selection

| Sales history | Behavior |
|---|---|
| `< 14` daily records | `insufficient_data` |
| `14–29` records | Moving-average fallback |
| `30+` records | Try StatsForecast AutoARIMA, then AutoETS |

## Fallback behavior

The fallback estimates:

- Average daily sales
- Next 7-day demand
- Next 30-day demand
- Reorder quantity
- Stockout risk

Forecasting never blocks pharmacy dispensing.

When forecasting is unavailable, the UI should communicate:

```text
Forecast unavailable. Showing rule-based reorder status.
```

## Environment flags

```env
ENABLE_PHARMACY_FORECAST=true
PHARMACY_FORECAST_MIN_RECORDS=30
MODEL_DIR=app/models
ENABLE_AI_FALLBACKS=true
```

Forecast confidence represents data sufficiency and model availability. It does **not** represent validated production accuracy.

---

# Billing Anomaly Detection

Billing anomaly screening uses invoice and payment context such as:

- Invoice totals
- Payment state
- Line items
- Duplicate invoice count
- Refund count
- Historical invoice values

## Training threshold

Fewer than `300` billing records should produce:

```text
model_status: insufficient_data
```

The system must not pretend that a trained IsolationForest model is ready.

If the model artifact or required dependencies are unavailable, the service continues using explainable rule-based scoring.

## Environment flag

```env
BILLING_ANOMALY_MIN_TRAINING_RECORDS=300
```

Anomaly confidence is not validated fraud-detection accuracy.

The result is a review signal, not a final fraud determination.

---

# Security and Data Integrity

AI-CMS follows several backend-first integrity principles.

## Authentication

- JWT-based authentication
- Protected API routes
- Session handling
- Authenticated file downloads

## Authorization

- RBAC
- Clinic-scoped access
- Admin-only billing anomaly review
- Restricted clinical workflow actions

## Validation

- Zod validation in the backend
- Upload validation
- Environment validation
- AI output sanitization

## Billing Integrity

Invoice totals are recalculated by the backend.

Client-side totals are not trusted.

## Pharmacy Integrity

Stock allocation and expiry validation are backend-owned.

Client-side inventory calculations are not trusted.

## Auditability

Audit events are generated for important operations across:

- Patient workflows
- Lab workflows
- Pharmacy workflows
- Notifications
- Follow-ups
- Prescriptions
- Other administrative actions

---

# Error Handling and Troubleshooting

## Local MongoDB connection failed

```text
Local MongoDB connection failed...
```

### Fix

Start MongoDB locally or switch to Atlas:

```env
MONGO_MODE=atlas
```

and configure:

```env
MONGO_URI_ATLAS=...
```

---

## Atlas placeholder error

```text
MONGO_URI_ATLAS contains placeholder values...
```

### Fix

Replace:

```text
<username>
<password>
<cluster-url>
```

with real Atlas values.

---

## MongoDB Atlas connection failed

Check:

- Atlas username
- Password
- IP allowlist
- Cluster URL
- Database connection string

---

## Environment validation failed

Run:

```bash
cd backend
npm run check:env
```

Then fill all required variables in `.env`.

---

## Frontend API requests fail

Check:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Also confirm that the backend is running on:

```text
http://localhost:5000
```

---

# Documentation

Additional repository documentation includes:

```text
docs/IMPLEMENTATION_REPORT.md
docs/DASHBOARD_ANALYTICS.md
docs/DEPLOYMENT_READINESS.md
docs/TESTING_STRATEGY.md
docs/OPERATIONS_RUNBOOK.md
```

### Implementation Report

Contains detailed phase verification and implementation information.

### Dashboard Analytics

Documents backend-owned dashboard analytics.

### Deployment Readiness

Contains staging/deployment-readiness information.

### Testing Strategy

Documents the testing approach.

### Operations Runbook

Contains operational and runtime guidance.

---

# VS Code Quick Start

The repository supports starting the frontend, backend, and AI service together using a VS Code task.

Configure a keyboard shortcut in:

```text
Preferences → Open Keyboard Shortcuts (JSON)
```

Add:

```json
{
  "key": "ctrl+alt+s",
  "command": "workbench.action.tasks.runTask",
  "args": "Start All Servers"
}
```

Then press:

```text
Ctrl + Alt + S
```

and select:

```text
Start All Servers
```

The configured VS Code task can start:

- Frontend
- Backend
- AI service

in parallel.

---

# Current Scope and Limitations

AI-CMS is an MVP-oriented clinic management platform with progressively implemented AI/ML capabilities.

The following limitations are intentionally documented:

- Docker is supported but optional.
- Local MongoDB and MongoDB Atlas are supported.
- Backend is JavaScript-only.
- The AI service is Python/FastAPI.
- AI functionality remains fallback-safe for local development.
- OCR and transcription endpoints do not by themselves claim production-grade OCR/transcription engines.
- No-show prediction has a trainable XGBoost path when historical data and dependencies are available.
- Pharmacy forecasting requires sufficient history for statistical models.
- Pharmacy fallback forecasting is rule-based.
- Forecast confidence is not validated production accuracy.
- Billing anomaly screening is assistive and admin-only.
- Billing anomaly confidence is not validated fraud-detection accuracy.
- Clinical AI suggestions require doctor approval.
- Prescription AI assistance does not autonomously prescribe medication.
- Lab abnormal detection is rule-based.
- External LIS integrations are not part of the documented Phase 11 implementation.
- Paid SMS/WhatsApp delivery infrastructure is not part of the documented Phase 13 implementation.
- External BI tooling is not part of the documented dashboard implementation.
- Telemedicine messaging infrastructure is not part of the documented notification implementation.

---

# Important Design Principles

## 1. Backend Owns Business Logic

Critical calculations and workflow rules should remain on the backend.

Examples:

- Invoice totals
- Pharmacy stock allocation
- Expiry checks
- Appointment conflicts
- Authorization
- AI safety rules

## 2. AI Is Assistive

AI should help users make better decisions, not silently replace clinical or administrative responsibility.

## 3. Graceful Degradation

When AI models, dependencies, or historical data are unavailable, the system should provide a safe fallback instead of pretending that a model is working.

## 4. Auditability

Important AI and business decisions should remain traceable.

## 5. Clinic-Scoped Data

Clinic data is designed to remain scoped to the appropriate clinic context.

## 6. No Fake Accuracy

The system explicitly reports statuses such as:

```text
fallback
insufficient_data
unavailable
```

instead of presenting unsupported model accuracy claims.

---

# Project Status

**AI-CMS currently covers Phase 0 through Phase 23.**

The repository has evolved from its initial infrastructure and authentication foundation into a full clinic workflow platform covering:

```text
Authentication
      ↓
RBAC + Audit Logging
      ↓
Patients + Doctors
      ↓
Appointments
      ↓
Consultations + EMR
      ↓
Digital Prescriptions
      ↓
Billing
      ↓
Laboratory
      ↓
Pharmacy
      ↓
Notifications + Follow-ups
      ↓
Dashboard Analytics
      ↓
AI Pharmacy Forecasting
      ↓
AI Billing Anomaly Review
```

The project is designed around a **backend-first, clinic-scoped, API-driven architecture with assistive AI/ML capabilities and explicit human oversight**.

---

## Quick Start

For the fastest local setup:

```bash
# 1. Start MongoDB

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run check:env
npm run seed
npm run dev

# 3. AI service
cd ../ai-service
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 4. Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

For the complete API surface:

```text
http://localhost:5000/api-docs
```

---

## AI-CMS

**AI-Based Clinic Management System**

A full-stack platform for connecting clinic operations, clinical workflows, billing, laboratory, pharmacy, analytics, and assistive AI in one system.
