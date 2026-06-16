# Database Design

## MVP Database

MongoDB is used for the MVP because it offers flexibility while the domain model is still evolving. Even in the MVP, the backend should consistently model:

- Timestamps on all persisted entities
- Clinic-level scoping where applicable
- Auditability for sensitive actions

## Expected Early Collections

- clinics
- users
- doctors
- patients
- appointments
- consultations
- prescriptions
- invoices
- audit_logs

Phase 0 does not create these collections yet. It only prepares the application structure and connection layer.

## Future Migration Path

If the platform later needs stronger relational guarantees or more complex reporting, PostgreSQL can be introduced for selected domains or as a migration target. The codebase should therefore keep data access isolated behind repository-style modules rather than coupling controllers directly to persistence logic.

## Phase 3 Collections

### Clinic

Purpose:
- anchors tenant scope for users, patients, and doctors

Core fields:
- `name`
- `code`
- `address`
- `isActive`
- `createdAt`
- `updatedAt`

Indexes:
- unique `code`

### Counter

Purpose:
- generates readable clinic-scoped sequence numbers for patient IDs and doctor codes

Core fields:
- `key`
- `seq`
- `createdAt`
- `updatedAt`

Examples:
- `patient:<clinicId>:20260421`
- `doctor:<clinicId>:20260421`

### Patient

Core fields:
- `clinicId`
- `patientId`
- `firstName`
- `lastName`
- `fullName`
- `gender`
- `dateOfBirth`
- `age`
- `phone`
- `email`
- `address`
- `bloodGroup`
- `allergies`
- `chronicConditions`
- `currentMedications`
- `emergencyContact`
- `documents`
- `isActive`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Indexes:
- unique compound index on `clinicId + patientId`
- index on `clinicId + phone`
- index on `clinicId + fullName`
- index on `clinicId + email`
- text-search support across `patientId`, `firstName`, `lastName`, `fullName`, `phone`, and `email`

### Doctor

Core fields:
- `clinicId`
- `userId`
- `doctorCode`
- `firstName`
- `lastName`
- `fullName`
- `gender`
- `phone`
- `email`
- `specialization`
- `qualification`
- `experienceYears`
- `consultationFee`
  - `availability`
  - `blockedSlots`
  - `isActive`
  - `createdBy`
  - `updatedBy`
  - `createdAt`

## Phase 6 Consultation Collections

### `consultations`

- `clinicId`
- `patientId`
- `doctorId`
- `appointmentId`
- `chiefComplaint`
- `symptoms`
  - `name`
  - `severity`
  - `duration`
  - `notes`
- `vitals`
  - `temperature`
  - `bloodPressure`
  - `pulse`
  - `respiratoryRate`
  - `oxygenSaturation`
  - `weight`
  - `height`
- `clinicalNotes`
- `formattedClinicalNotes`
  - `subjective`
  - `objective`
  - `assessment`
  - `plan`
- `diagnosis`
  - `primary`
  - `secondary`
  - `notes`
- `treatmentPlan`
- `followUp`
  - `required`
  - `date`
  - `notes`
- `aiSuggestions`
  - `requested`
  - `generatedAt`
  - `status`
  - `suggestions`
    - `condition`
    - `confidence`
    - `reasoning`
    - `recommendedSpecialization`
    - `redFlags`
    - `recommendedTests`
    - `safetyNote`
  - `rawResponse`
  - `errorMessage`
- `aiReview`
  - `decision`
  - `acceptedSuggestions`
  - `rejectedSuggestions`
  - `doctorComment`
  - `reviewedAt`
  - `reviewedBy`
- `status`
- `startedAt`
- `completedAt`
- `prescriptionCreated`
- `billingReady`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Indexes:

- compound index on `clinicId + patientId + createdAt`
- compound index on `clinicId + doctorId + createdAt`
- unique index on `appointmentId`
- index on `status`
- text index on `diagnosis.primary`

### `ai_predictions`

- `clinicId`
- `patientId`
- `appointmentId`
- `consultationId`
- `predictionType`
- `inputData`
- `outputData`
- `confidenceScore`
- `modelName`
- `modelVersion`
- `disclaimer`
- `createdBy`
- `createdAt`

Purpose:

- keeps consultation AI inference outputs separately for auditability
- supports future model evaluation without changing doctor-controlled diagnosis fields
- `updatedAt`

Indexes:
- unique compound index on `clinicId + doctorCode`
- index on `clinicId + specialization`
- index on `clinicId + phone`
- text-search support across `doctorCode`, `firstName`, `lastName`, `fullName`, `phone`, `email`, and `specialization`

## Clinic Scoping

- Every patient, doctor, and appointment read/write query is scoped by `clinicId`
- Non-super-admin users always operate within `req.user.clinicId`
- Super admins may provide an explicit clinic context when needed
- Cross-clinic access returns a safe not-found or forbidden-style outcome instead of exposing other clinic data

## Readable Code Generation

- Patient IDs use `PAT-YYYYMMDD-XXXX`
- Doctor codes use `DOC-YYYYMMDD-XXXX`
- The sequence counter resets per clinic and per day via the `Counter` collection

## Phase 4 Collections

### Appointment

Core fields:
- `clinicId`
- `patientId`
- `doctorId`
- `createdBy`
- `appointmentDate`
- `startTime`
- `endTime`
- `durationMinutes`
- `appointmentType`
- `status`
- `reasonForVisit`
- `symptomsSummary`
- `source`
- `noShowRisk`
- `notes`
- `cancellationReason`
- `rescheduledFrom`
- `meta`
- `createdAt`
- `updatedAt`

Indexes:
- compound index on `doctorId + appointmentDate + startTime`
- index on `patientId + appointmentDate`
- index on `status`
- index on `clinicId`

Conflict prevention:
- overlapping intervals are rejected in the service layer for active statuses
- blocked doctor slots are checked before a booking is created
- unique indexes are not relied on for overlap prevention

### Doctor Availability Notes

- doctor weekly availability is stored on the `Doctor` document
- supported slot durations are `15`, `30`, `45`, and `60` minutes
- blocked slots are stored as doctor-scoped date/time ranges with a free-text reason
- appointment slot generation combines doctor availability, blocked slots, and active appointments

## Phase 7 Prescription Collections

### `prescriptions`

- `clinicId`
- `patientId`
- `doctorId`
- `consultationId`
- `appointmentId`
- `prescriptionNumber`
- `diagnosisSnapshot`
- `symptomsSnapshot`
- `notes`
- `medicines`
  - `medicineName`
  - `genericName`
  - `dosage`
  - `frequency`
  - `duration`
  - `route`
  - `timing`
  - `instructions`
  - `quantity`
  - `isSubstituteAllowed`
- `advice`
- `followUpDate`
- `status`
- `dispensingStatus`
- `dispensedAt`
- `pdfUrl`
- `finalizedAt`
- `cancellationReason`
- `createdBy`
- `updatedBy`
- `aiAssist`
  - `used`
  - `suggestionId`
  - `disclaimer`
  - `doctorReviewed`
- `createdAt`
- `updatedAt`

Indexes:

- compound index on `clinicId + patientId + createdAt`
- compound index on `clinicId + doctorId + createdAt`
- compound index on `clinicId + consultationId + createdAt`
- unique index on `prescriptionNumber`

Purpose:

- stores doctor-controlled prescription drafts and finalized prescriptions
- keeps medicine instructions immutable after finalization except through explicit future revision flows
- links prescription output back into patient history and future billing and dispensing workflows

Readable code generation:

- prescription numbers use `RX-YYYYMMDD-000001`
- the sequence is clinic-scoped and day-scoped through the shared `Counter` collection

## Phase 8 Billing Collections

### `invoices`

- `invoiceNumber`
- `clinicId`
- `patientId`
- `appointmentId`
- `consultationId`
- `createdBy`
- `updatedBy`
- `invoiceDate`
- `dueDate`
- `items`
  - `itemType`
  - `name`
  - `description`
  - `quantity`
  - `unitPrice`
  - `amount`
- `subtotal`
- `discountType`
- `discountValue`
- `discountAmount`
- `taxableAmount`
- `gstRate`
- `gstAmount`
- `totalAmount`
- `paidAmount`
- `dueAmount`
- `paymentStatus`
- `invoiceStatus`
- `payments`
  - `amount`
  - `paymentMode`
  - `transactionId`
  - `paidAt`
  - `receivedBy`
  - `notes`
- `pdfUrl`
- `cancellationReason`
- `notes`
- `metadata`
- `createdAt`
- `updatedAt`

Indexes:

- unique index on `invoiceNumber`
- compound index on `clinicId + patientId + createdAt`
- compound index on `clinicId + consultationId + createdAt`
- compound index on `clinicId + appointmentId + createdAt`
- index on `paymentStatus`
- index on `invoiceStatus`
- text index on `invoiceNumber` and `notes`

Purpose:

- stores clinic-scoped invoices for consultations and future lab/pharmacy/procedure billing line items
- keeps payment history embedded with the invoice for MVP simplicity
- supports patient invoice history, dashboard summaries, and downloadable PDF invoices

Calculation notes:

- item `amount` is always derived from `quantity * unitPrice`
- `subtotal`, discount, GST, total, paid, and due values are computed on the backend only
- payment status is inferred from `paidAmount` vs `totalAmount`

Readable code generation:

- invoice numbers use `INV-YYYYMMDD-0001`
- the sequence resets per day by querying the latest invoice created on that date

## Phase 11 Lab Collections

### `lab_tests`

- `clinicId`
- `code`
- `name`
- `category`
- `specimenType`
- `unit`
- `normalRange`
  - `min`
  - `max`
  - `text`
- `price`
- `isActive`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Indexes:

- unique compound index on `clinicId + code`
- index on `clinicId + name`
- index on `clinicId + category`
- text index across `code`, `name`, `category`, and `specimenType`

Purpose:

- stores clinic-scoped reusable lab catalog items
- lets lab orders snapshot reference metadata at order time so historical orders remain stable

### `lab_orders`

- `clinicId`
- `consultationId`
- `patientId`
- `doctorId`
- `appointmentId`
- `orderNumber`
- `tests`
  - `labTestId`
  - `code`
  - `name`
  - `category`
  - `specimenType`
  - `unit`
  - `normalRange`
    - `min`
    - `max`
    - `text`
  - `status`
- `priority`
- `notes`
- `status`
- `orderedAt`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Indexes:

- unique compound index on `clinicId + orderNumber`
- compound index on `clinicId + patientId + orderedAt`
- compound index on `clinicId + doctorId + orderedAt`
- compound index on `clinicId + consultationId + orderedAt`
- index on `status`

Purpose:

- stores consultation-linked lab requests with clinic scoping and auditability
- snapshots selected test definitions so historical result interpretation is stable even if the catalog changes later

Readable code generation:

- lab order numbers use `LAB-YYYYMMDD-XXXX`
- the sequence is clinic-scoped and day-scoped through the shared `Counter` collection via the existing sequence helper pattern

### `lab_reports`

- `clinicId`
- `labOrderId`
- `patientId`
- `consultationId`
- `uploadedBy`
- `reportUrl`
- `reportFileName`
- `resultEntries`
  - `code`
  - `name`
  - `value`
  - `numericValue`
  - `unit`
  - `normalRange`
    - `min`
    - `max`
    - `text`
  - `isAbnormal`
  - `abnormalFlag`
  - `interpretationNote`
- `aiAnalysis`
  - `summary`
  - `abnormalHighlights`
  - `disclaimer`
- `status`
- `reviewedBy`
- `reviewedAt`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Indexes:

- unique index on `labOrderId` for the MVP one-report-per-order rule
- compound index on `clinicId + patientId + createdAt`
- compound index on `clinicId + consultationId + createdAt`
- index on `status`

Purpose:

- stores structured result data, report metadata, and backend-generated assistive abnormal summaries
- supports patient lab history and future downstream billing/report workflows without requiring heavy AI services

### Consultation Update

The `consultations` collection now also includes:

- `labOrdered`

Purpose:

- records whether a consultation has already produced at least one lab order
- provides a safe workflow hook for future billing, dashboard, and downstream clinical modules

## Phase 12 Pharmacy Collections

### `medicines`

- `clinicId`
- `code`
- `name`
- `genericName`
- `brandName`
- `category`
- `form`
- `strength`
- `manufacturer`
- `unitPrice`
- `reorderLevel`
- `isActive`
- `requiresPrescription`
- `batches`
  - `batchNumber`
  - `quantity`
  - `expiryDate`
  - `purchasePrice`
  - `sellingPrice`
  - `receivedAt`
- `totalStock`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Indexes:

- unique partial compound index on `clinicId + code` for non-empty codes
- compound index on `clinicId + name`
- compound index on `clinicId + genericName`
- text index across `name`, `genericName`, `brandName`, and `category`

Purpose:

- stores clinic-scoped medicine catalog entries and inventory batches
- keeps stock, expiry, and reorder metadata close to dispensing workflows for MVP simplicity

Stock notes:

- `totalStock` is recomputed from non-expired batch quantities
- expired batch stock remains visible for audit/history but is not considered available for dispensing
- low-stock and near-expiry flags are derived in backend service logic rather than persisted

### `dispensing_records`

- `clinicId`
- `prescriptionId`
- `patientId`
- `doctorId`
- `dispensedBy`
- `items`
  - `medicineId`
  - `medicineName`
  - `batchNumber`
  - `quantity`
  - `unitPrice`
  - `totalPrice`
  - `instructions`
- `subtotal`
- `notes`
- `status`
- `dispensedAt`
- `createdAt`
- `updatedAt`

Indexes:

- unique compound index on `clinicId + prescriptionId` for the MVP one-dispensing-per-prescription rule
- compound index on `clinicId + patientId + createdAt`
- compound index on `clinicId + prescriptionId + createdAt`
- index on `status`

Purpose:

- stores prescription-linked dispensing events and the exact medicine batch allocation used at dispense time
- preserves a stable audit trail even if medicine catalog or stock changes later

### `pharmacy_sales`

- `clinicId`
- `dispensingRecordId`
- `patientId`
- `invoiceId`
- `amount`
- `paymentStatus`
- `paymentMethod`
- `notes`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Indexes:

- unique compound index on `clinicId + dispensingRecordId`
- compound index on `clinicId + patientId + createdAt`
- index on `paymentStatus`

Purpose:

- stores MVP pharmacy sale records created from dispensing activity
- keeps a safe invoice hook without forcing full billing synchronization in Phase 12

### Prescription Update

The `prescriptions` collection now also includes:

- `dispensingStatus`
- `dispensedAt`

Purpose:

- records whether a finalized prescription has already been dispensed
- exposes a safe workflow hook for patient history, pharmacy UI, and later billing or notification steps

## Phase 13 Notification Collections

### `notification_templates`

- `clinicId`
- `name`
- `type`
- `channel`
- `subject`
- `body`
- `variables`
- `isActive`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Indexes:

- compound index on `clinicId + name`
- compound index on `clinicId + type + channel + isActive`

Purpose:

- stores clinic-scoped reusable template definitions for reminders and operational alerts
- keeps message structure editable without requiring any external provider dependency

### `notification_logs`

- `clinicId`
- `patientId`
- `appointmentId`
- `consultationId`
- `prescriptionId`
- `invoiceId`
- `labOrderId`
- `templateId`
- `type`
- `channel`
- `recipient`
  - `name`
  - `phone`
  - `email`
- `subject`
- `body`
- `renderedVariables`
- `status`
- `provider`
- `providerMessageId`
- `scheduledFor`
- `sentAt`
- `failureReason`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Indexes:

- compound index on `clinicId + patientId + createdAt`
- compound index on `clinicId + type + status + createdAt`
- compound index on `clinicId + status + scheduledFor`
- compound index on `clinicId + appointmentId + type + createdAt`

Purpose:

- stores auditable delivery attempts and scheduled notification intents
- links operational communication back to appointments, prescriptions, invoices, lab orders, and patient history

### `follow_up_tasks`

- `clinicId`
- `patientId`
- `consultationId`
- `doctorId`
- `title`
- `description`
- `dueDate`
- `type`
- `status`
- `reminderSent`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Indexes:

- compound index on `clinicId + patientId + dueDate`
- compound index on `clinicId + doctorId + dueDate`
- compound index on `clinicId + status + dueDate`

Purpose:

- stores clinic-scoped follow-up work independently from appointment booking
- supports reminder scheduling and patient-history visibility without requiring a separate workflow engine
