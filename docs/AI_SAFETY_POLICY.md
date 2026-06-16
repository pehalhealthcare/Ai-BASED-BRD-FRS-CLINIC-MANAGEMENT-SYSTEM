# AI Safety Policy

## Core Rule

AI outputs in AI-CMS are assistive suggestions only. They must never be presented as a final diagnosis, final prescription, or autonomous clinical decision.

## Safety Requirements

- Doctor approval is mandatory before any AI-generated content is treated as actionable
- Doctor approval is mandatory before any AI diagnosis suggestion is accepted into a consultation record
- AI diagnosis suggestions must be stored separately from the doctor-controlled diagnosis fields until the doctor explicitly reviews them
- Accepting or partially accepting AI suggestions must never silently overwrite `diagnosis.primary`
- Symptom pre-consultation must be framed as informational intake support
- Voice-to-text outputs must be treated as editable drafts
- Prescription suggestions must require clinician review and confirmation
- Safety disclaimers must be attached to AI-generated clinical content where relevant
- AI consultation suggestions must remain assistive only and must never replace doctor judgment
- AI-generated consultation suggestions must never be presented as a final diagnosis
- Emergency red flags must prompt urgent clinical review rather than automated treatment advice

## Phase 0 Scope

Phase 0 includes only health endpoints, guardrail placeholders, and policy documentation. No clinical inference logic is implemented.
