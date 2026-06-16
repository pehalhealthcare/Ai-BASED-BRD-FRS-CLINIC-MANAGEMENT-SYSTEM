# Pharmacy Module

## Scope

Phase 12 adds a clinic-scoped pharmacy and dispensing MVP connected to finalized prescriptions, patient history, and audit logging.

Implemented in this phase:

- medicine catalog management
- stock batches with expiry and pricing metadata
- backend-owned stock recalculation
- low-stock and near-expiry flags
- dispensing against finalized prescriptions
- FEFO-style batch allocation from valid stock
- pharmacy sale record creation
- prescription dispensing status updates
- patient medicine history

Not implemented in this phase:

- supplier procurement
- insurance claims
- advanced drug interaction engines
- external pharmacy integrations
- patient ordering/e-commerce

## Backend Routes

- `POST /api/v1/pharmacy/medicines`
- `GET /api/v1/pharmacy/medicines`
- `GET /api/v1/pharmacy/medicines/:id`
- `PATCH /api/v1/pharmacy/medicines/:id`
- `POST /api/v1/pharmacy/medicines/:id/batches`
- `POST /api/v1/pharmacy/dispense`
- `GET /api/v1/pharmacy/dispensings`
- `GET /api/v1/pharmacy/dispensings/:id`
- `PATCH /api/v1/pharmacy/dispensings/:id/cancel`
- `GET /api/v1/patients/:patientId/medicines`

## Core Rules

- all reads and writes are clinic-scoped
- expired stock is visible but blocked from dispensing
- total stock is recalculated from valid batch quantities
- dispensing is allowed only against clinic-owned finalized prescriptions
- one main dispensing record per prescription in the current MVP
- insufficient stock returns a clean business error
- backend computes stock flags and batch allocation; the client does not own inventory math

## Stock Flags

- `lowStock`: `totalStock <= reorderLevel`
- `nearExpiry`: any non-expired batch is within the next 30 days
- `expired`: one or more batches are already expired

## Batch Allocation

Phase 12 uses FEFO-style allocation:

1. ignore expired batches
2. sort valid batches by earliest expiry first
3. allocate quantity from the earliest-expiring valid batches
4. reject dispense if the requested quantity cannot be fulfilled

## Audit Events

- `MEDICINE_CREATED`
- `MEDICINE_UPDATED`
- `BATCH_ADDED`
- `DISPENSING_CREATED`
- `PHARMACY_SALE_CREATED`
- `DISPENSING_CANCELLED`

## Known Limitations

- no multi-document transaction is used yet for stock deduction plus record creation
- cancel is intentionally restricted to `draft` dispensing records only
- no supplier or purchase-order module exists yet
- no notification workflow is included in this phase
