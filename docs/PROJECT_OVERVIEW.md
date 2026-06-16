# Project Overview

AI-CMS is a clinic management SaaS platform designed for operational workflows, clinician productivity, and AI-assisted healthcare support. The product vision is to give clinics a reliable system for patient flow, documentation, scheduling, billing, and assistive AI while preserving healthcare safety and clinician oversight.

The repository supports both Docker and non-Docker local development. Teams can run AI-CMS with Docker Compose, with local MongoDB and direct service processes, or with MongoDB Atlas when a local MongoDB server is unavailable.

## Product Vision

The platform aims to support:

- Operational workflows for clinics and administrators
- Doctor-facing tools for consultation and follow-up
- Patient-facing intake assistance and guided experiences
- AI-assisted drafting, summarization, and transcription
- A foundation that can scale into lab, pharmacy, analytics, telemedicine, and ABDM-aligned extensions

## Product Principles

- AI is assistive, not autonomous
- Doctor approval remains mandatory for clinical decisions
- Role-based security and clinic-level data isolation are mandatory
- Strong auditability is required across sensitive actions
- MVP architecture should stay simple without blocking future scale
- Local developer experience must not depend exclusively on Docker
