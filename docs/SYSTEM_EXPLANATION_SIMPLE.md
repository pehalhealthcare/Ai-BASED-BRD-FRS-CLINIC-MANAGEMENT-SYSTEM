# AI-CMS Simple System Explanation

## What This Project Is

AI-CMS is a clinic management system with AI-assisted features.

In simple words, it helps a clinic do this full flow:

Patient -> Appointment -> Consultation -> Prescription -> Billing -> History

It is called "AI-CMS" because AI is used as a helper, not as a replacement for the doctor.

The AI can:

- analyze symptoms
- suggest possible conditions
- format clinical notes
- give warning signs

But the AI does **not** make the final diagnosis, final prescription, or final treatment decision.

---

## What Technology Is Used

### Frontend

The frontend is built with:

- React
- Vite
- JavaScript
- Tailwind CSS
- React Router
- Axios

This is the part you open in the browser.

### Backend

The backend is built with:

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT authentication
- RBAC (role-based access control)
- Zod validation

This is the main server that handles business logic.

### AI Service

The AI service is built with:

- Python
- FastAPI

This service gives safe AI assistance.

### Database

The system uses MongoDB to store:

- users
- clinics
- doctors
- patients
- appointments
- consultations
- prescriptions
- invoices

---

## Main Parts of the System

### 1. Frontend

This is the main web app.

Open it at:

- `http://localhost:5173`

This is where users log in and use the system.

### 2. Backend

This is the main API server.

Open health pages at:

- `http://localhost:5000/`
- `http://localhost:5000/health`
- `http://localhost:5000/api/v1/health`

Swagger API docs:

- `http://localhost:5000/api-docs`

### 3. AI Service

This is the AI helper server.

Open health pages at:

- `http://localhost:8000/health`
- `http://localhost:8000/api/v1/health`

### 4. MongoDB

This is the database where all records are saved.

---

## How The Whole System Works

### Step 1. User logs in

The user opens the login page in the frontend.

The frontend sends email and password to the backend.

The backend checks the user in MongoDB.

If the login is correct:

- backend returns a JWT token
- backend returns user details
- frontend stores the token in local storage

After that, Axios automatically sends the token with protected API requests.

### Step 2. Role decides what the user can access

The app checks the user role and shows allowed pages only.

Example:

- admin can see almost everything
- receptionist can manage patients, appointments, and billing
- doctor can manage consultations and prescriptions
- patient has limited access right now

### Step 3. Clinic workflow starts

Typical flow is:

1. receptionist/admin creates patient
2. receptionist/admin books appointment
3. doctor opens consultation
4. doctor writes notes and reviews AI suggestions
5. doctor creates prescription
6. receptionist/admin creates invoice and records payment

### Step 4. History is visible later

Patient history can then show:

- appointments
- consultations
- prescriptions
- invoices

---

## Is This One App Or Separate Admin And Patient Apps?

Right now, this is mainly **one frontend application** with different access based on role.

That means:

- admin uses the same React app
- receptionist uses the same React app
- doctor uses the same React app
- patient also uses the same React app

The difference is not a separate codebase.

The difference is:

- which routes are visible
- which actions are allowed

### Current reality

- Clinic/admin side: yes
- Receptionist side: yes
- Doctor side: yes
- Full separate patient portal: not fully built yet

So the best explanation is:

> It is one main web application with role-based access, not two completely separate apps.

---

## Current Roles In The Project

In the current frontend role constants, these are the active main roles:

- `SUPER_ADMIN`
- `ADMIN`
- `RECEPTIONIST`
- `DOCTOR`
- `PATIENT`

### What each role does

#### SUPER_ADMIN

This is the highest access user.

This user can usually:

- manage the overall clinic system
- access dashboard
- access patients
- access appointments
- access consultations
- access chatbot
- access prescriptions
- access billing

#### ADMIN

This is also an admin role, but right now the seeded system is mainly using `SUPER_ADMIN`.

Admin-level access is treated as a high-privilege management role.

#### RECEPTIONIST

This role mainly handles clinic front-desk work:

- patient registration
- patient search
- appointment creation
- appointment coordination
- billing support

#### DOCTOR

This role mainly handles medical workflow:

- view patient information
- review appointments
- open consultation / EMR
- write clinical notes
- review AI suggestions
- create prescriptions

#### PATIENT

This role is limited right now.

At the moment, the clearest patient-side use is:

- AI chatbot access

The full patient self-service portal is not fully built yet.

---

## How Many Admin, Doctor, Patient, Receptionist Users Are There Right Now?

From the seeded demo data, these login users are available:

### Login users

#### 1. Super Admin

- Email: `admin@aicms.local`
- Password: `Admin123!`
- Role: `SUPER_ADMIN`

Confirmed seeded count:

- 1 super admin login

#### 2. Receptionist

- Email: `receptionist@aicms.local`
- Password: `Reception@12345`
- Role: `RECEPTIONIST`

Confirmed seeded count:

- 1 receptionist login

#### 3. Doctor

- Email: `doctor@aicms.local`
- Password: `Doctor@12345`
- Role: `DOCTOR`

Confirmed seeded count:

- 1 doctor login

#### 4. Patient

- Email: `patient@aicms.local`
- Password: `Patient@12345`
- Role: `PATIENT`

Confirmed seeded count:

- 1 patient login

### Seeded records in the database

The demo seed creates:

- 1 clinic
- 4 login users
- 2 doctor records
- 3 patient records
- 2 appointments
- 1 consultation
- 1 prescription
- 1 invoice

Important:

- There is **1 doctor login user**
- but **2 doctor records**

That means one extra doctor record exists in the clinic data for testing appointments and listings, even though there is only one actual doctor login account seeded.

---

## What The Seeded Demo Data Contains

### Clinic

- `AI-CMS Demo Clinic`

### Doctors

1. Dr Aarav Mehta
   - General Physician
   - has a real seeded doctor login

2. Dr Priya Sharma
   - Internal Medicine
   - exists as a doctor record for scheduling/demo purposes

### Patients

1. Riya Patel
2. Mohan Verma
3. Sana Khan

### Appointments

- 1 completed appointment
- 1 booked appointment

### Consultation

- 1 completed consultation for Riya Patel
- includes symptoms, vitals, notes, diagnosis, treatment plan, and AI suggestion review

### Prescription

- 1 finalized prescription linked to that consultation

### Invoice

- 1 issued invoice linked to that consultation
- includes partial payment

---

## What Pages Exist In The Frontend

The main frontend routes are:

- `/login`
- `/register`
- `/dashboard`
- `/patients`
- `/patients/new`
- `/appointments`
- `/consultations`
- `/chatbot`
- `/prescriptions`
- `/billing`

### What each page does

#### `/login`

- sign in page
- stores token
- redirects user after login

#### `/dashboard`

- main summary page
- shows overall clinic information
- shows cards and recent data where available

#### `/patients`

- patient listing
- search and browse patients

#### `/patients/new`

- create a new patient

#### `/appointments`

- appointment list and scheduling flow

#### `/consultations`

- doctor consultation / EMR area
- add symptoms, vitals, notes, diagnosis, treatment plan
- review AI suggestions

#### `/chatbot`

- symptom checker / AI chat assistant page

#### `/prescriptions`

- prescription builder and prescription history flow

#### `/billing`

- invoice creation, payment tracking, and billing overview

---

## Which Roles See Which Frontend Pages

Based on current frontend navigation rules:

### Dashboard

Visible to:

- SUPER_ADMIN
- ADMIN
- RECEPTIONIST
- DOCTOR

### Patients

Visible to:

- SUPER_ADMIN
- ADMIN
- RECEPTIONIST
- DOCTOR

### Appointments

Visible to:

- SUPER_ADMIN
- ADMIN
- RECEPTIONIST
- DOCTOR

### Consultations

Visible to:

- SUPER_ADMIN
- ADMIN
- DOCTOR

### AI Chatbot

Visible to:

- SUPER_ADMIN
- ADMIN
- DOCTOR
- PATIENT

### Prescriptions

Visible to:

- SUPER_ADMIN
- ADMIN
- DOCTOR

### Billing

Visible to:

- SUPER_ADMIN
- ADMIN
- RECEPTIONIST

So if you log in as patient, the patient is mostly directed to the chatbot side for now.

---

## How The AI Works In Simple Words

This is one of the most important parts to explain correctly.

### The short version

The AI does **not** confirm disease.

The AI gives:

- possible conditions
- warning signs
- recommended specialization
- note formatting help

Then the doctor reviews it.

### What AI is used for right now

#### 1. Symptom checking

The user enters symptoms like:

- fever
- cough
- headache
- chest pain

The AI service returns:

- possible conditions
- urgency
- red flags
- suggested doctor type
- disclaimer

Example idea:

If symptoms are "fever and cough", the AI may suggest:

- viral infection pattern
- general physician
- medium urgency

But this is only a suggestion.

#### 2. Clinical note formatting

Doctor writes rough notes.

AI helps convert the note into a cleaner structure, such as:

- subjective
- objective
- assessment
- plan

#### 3. No-show risk

The system can return a rule-based no-show risk level for appointments.

#### 4. Transcription and OCR

These are placeholder-safe endpoints for MVP use.

That means the project structure supports them, but they are not yet a heavy real production model workflow.

### What AI is **not** doing

The AI is not:

- making final diagnosis
- prescribing medicine automatically
- replacing doctor review
- acting like a real medical authority

The correct simple sentence is:

> AI-CMS uses AI to assist the clinic with symptom analysis and note formatting, but all final medical decisions stay with the doctor.

---

## Is The AI Really Predicting Disease?

The honest answer is:

**It gives possible disease or condition suggestions, not confirmed disease prediction.**

So if someone asks:

"Is your system predicting disease?"

The best explanation is:

> It analyzes symptoms and gives possible condition suggestions using safe AI logic, but it does not confirm the disease. The doctor reviews everything before any medical decision is made.

---

## What Happens During A Consultation

The consultation module is the EMR part.

Doctor can:

- open an appointment
- view patient details
- view previous history
- add symptoms
- add vitals
- write clinical notes
- add diagnosis
- add treatment plan
- set follow-up
- request AI suggestions
- review or reject AI suggestions

Important:

- diagnosis is doctor-controlled
- AI suggestions are stored separately
- AI does not overwrite doctor diagnosis automatically

---

## How Prescription Works

After consultation, doctor can create a prescription.

The prescription can contain:

- medicine name
- generic name
- dosage
- frequency
- duration
- route
- timing
- instructions
- quantity
- substitute allowed or not

Prescription flow:

1. doctor creates draft prescription
2. doctor reviews medicine items
3. doctor finalizes prescription
4. prescription PDF can be generated

Important:

- AI does not auto-prescribe medicine
- doctor must approve the prescription
- finalized prescription is locked

---

## How Billing Works

Billing is the invoice module.

It supports:

- invoice creation
- item-based billing
- GST calculation
- discount calculation
- payment recording
- due amount tracking
- invoice PDF generation

The backend calculates totals, not the frontend.

So the frontend can show a preview, but the backend is the final source of truth.

---

## What Is Stored In The Database

### Users

Stores:

- login email
- password hash
- role
- clinic link

### Clinics

Stores clinic information.

### Doctors

Stores:

- doctor code
- doctor profile
- specialization
- experience
- availability

### Patients

Stores:

- patient ID
- name
- contact details
- gender
- date of birth
- allergies
- chronic conditions
- emergency contact

### Appointments

Stores:

- patient
- doctor
- date
- time
- appointment type
- status
- reason for visit

### Consultations

Stores:

- chief complaint
- symptoms
- vitals
- clinical notes
- diagnosis
- treatment plan
- follow-up
- AI suggestions
- AI review

### Prescriptions

Stores:

- consultation link
- doctor link
- patient link
- medicine items
- advice
- follow-up
- finalized status

### Invoices

Stores:

- invoice number
- items
- GST
- discount
- total
- payments
- paid amount
- due amount
- status

---

## What Frontend, Backend, And AI Service Each Do

### Frontend responsibility

Frontend is mainly for:

- pages
- forms
- tables
- navigation
- token storage
- sending API requests
- showing results

### Backend responsibility

Backend is mainly for:

- authentication
- authorization
- validation
- saving data
- business logic
- PDF generation
- billing calculations
- protecting routes

### AI service responsibility

AI service is mainly for:

- symptom assistance
- note formatting
- no-show risk support
- placeholders for OCR/transcription
- safety disclaimers

---

## How The Frontend Talks To The Backend

Frontend uses Axios.

Axios does this:

- reads API base URL from `.env`
- sends token automatically
- handles 401 unauthorized
- logs user out if needed

That is why login stays active across pages.

---

## Why Some Pages May Look Empty

A page can look empty if:

- there is no data yet
- the role is not allowed to see that data
- the backend route returns an empty list

This is normal.

The frontend is designed to show:

- loading state
- empty state
- error state

instead of crashing.

---

## Why Wi-Fi Change Caused Problems Before

The issue was not mainly the app logic.

The main problem was local environment networking.

When Wi-Fi changes:

- LAN IP can change
- CORS can mismatch
- Atlas DB whitelist can mismatch
- frontend may call wrong URL if using old IP

### Best local setup

For the same machine, always prefer:

- frontend: `http://localhost:5173`
- backend: `http://localhost:5000`
- ai-service: `http://localhost:8000`

This is more stable than using changing local IP addresses.

---

## Best Way To Explain This Project In An Interview Or Demo

You can say:

> AI-CMS is a full-stack clinic management system built with React, Node.js, MongoDB, and a FastAPI AI service. It manages patient registration, doctor management, appointments, consultations, prescriptions, billing, and history. The AI helps with symptom analysis and clinical note formatting, but it is assistive only and all final medical decisions remain with the doctor.

If they ask about admin/patient separation, you can say:

> Right now the system uses one frontend application with role-based access. Admin, receptionist, doctor, and patient use the same main app, but they see different pages based on their role.

If they ask about disease prediction, you can say:

> The AI suggests possible conditions based on symptoms, but it does not confirm disease. It is a support tool for the doctor, not a replacement for the doctor.

---

## What Is Working Now

Working MVP areas:

- login with JWT
- role-based access
- patient management
- doctor management
- appointment scheduling
- consultation / EMR
- AI symptom assistance
- prescription workflow
- billing workflow
- history view
- Docker-based local setup

---

## What Is Not Fully Complete Yet

Still limited or intentionally simplified:

- full patient self-service portal
- advanced AI medical models
- real production transcription/OCR pipeline
- pharmacy stock module
- lab workflow module
- payment gateway integration
- deployment to production cloud

---

## Very Short Final Summary

AI-CMS is one clinic system with:

- React frontend
- Node/Express backend
- MongoDB database
- FastAPI AI service

Current demo setup includes:

- 1 super admin login
- 1 receptionist login
- 1 doctor login
- 1 patient login
- 2 doctor records
- 3 patient records
- 2 appointments
- 1 consultation
- 1 prescription
- 1 invoice

The AI helps with symptom analysis and note formatting, but the doctor stays in control of diagnosis, prescription, and treatment.
