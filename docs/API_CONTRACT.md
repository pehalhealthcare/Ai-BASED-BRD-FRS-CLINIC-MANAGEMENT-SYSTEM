# API Contract

## Response Format

All backend and AI service APIs should return one of the following shapes.

Success:

```json
{
  "success": true,
  "message": "Request completed successfully.",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "name",
      "message": "Name is required."
    }
  ]
}
```

## Initial Health APIs

Backend:

- `GET /health`
- `GET /api/v1/health`
- `GET /api-docs`

AI service:

- `GET /health`
- `GET /api/v1/health`

### Backend Health Response

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

`database.status` can be either `connected` or `disconnected`.

### AI Service Health Response

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

## API Versioning

- Business APIs will use the `/api/v1` prefix
- Top-level `/health` endpoints stay available for infrastructure and local diagnostics

## Phase 3 Patient APIs

- `POST /api/v1/patients`
- `GET /api/v1/patients`
- `GET /api/v1/patients/:id`
- `PATCH /api/v1/patients/:id`
- `DELETE /api/v1/patients/:id`
- `GET /api/v1/patients/:id/history`

Patient list success example:

```json
{
  "success": true,
  "message": "Patients retrieved successfully",
  "data": {
    "patients": [
      {
        "_id": "661111111111111111111111",
        "clinicId": "662222222222222222222222",
        "patientId": "PAT-20260421-0001",
        "firstName": "Anita",
        "lastName": "Sharma",
        "fullName": "Anita Sharma",
        "gender": "female",
        "phone": "9876543210",
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

Patient history success example:

```json
{
  "success": true,
  "message": "Patient history retrieved successfully",
  "data": {
    "patient": {
      "_id": "661111111111111111111111",
      "patientId": "PAT-20260421-0001",
      "fullName": "Anita Sharma"
    },
    "summary": {
      "totalAppointments": 0,
      "totalConsultations": 0,
      "totalPrescriptions": 0,
      "totalLabOrders": 0,
      "totalInvoices": 0,
      "totalDispensings": 0
    },
    "appointments": [],
    "consultations": [],
    "prescriptions": [],
    "labs": [],
    "invoices": [],
    "dispensings": []
  }
}
```

## Phase 3 Doctor APIs

- `POST /api/v1/doctors`
- `GET /api/v1/doctors`
- `GET /api/v1/doctors/:id`
- `PATCH /api/v1/doctors/:id`
- `DELETE /api/v1/doctors/:id`
- `PATCH /api/v1/doctors/:id/availability`

Doctor list success example:

```json
{
  "success": true,
  "message": "Doctors retrieved successfully",
  "data": {
    "doctors": [
      {
        "_id": "663333333333333333333333",
        "clinicId": "662222222222222222222222",
        "doctorCode": "DOC-20260421-0001",
        "fullName": "Meera Singh",
        "specialization": "Cardiology",
        "phone": "9666666666",
        "consultationFee": 800,
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

Doctor availability update success example:

```json
{
  "success": true,
  "message": "Doctor availability updated successfully",
  "data": {
    "doctor": {
      "_id": "663333333333333333333333",
      "doctorCode": "DOC-20260421-0001",
      "availability": [
        {
          "dayOfWeek": "monday",
          "isAvailable": true,
          "startTime": "09:00",
          "endTime": "13:00",
          "slotDurationMinutes": 20
        }
      ]
    }
  }
}
```

## Phase 4 Appointment APIs

- `POST /api/v1/appointments`
- `GET /api/v1/appointments`
- `GET /api/v1/appointments/calendar`
- `GET /api/v1/appointments/available-slots`
- `GET /api/v1/appointments/:id`
- `PATCH /api/v1/appointments/:id/status`
- `PATCH /api/v1/appointments/:id/reschedule`
- `PATCH /api/v1/appointments/:id/cancel`
- `GET /api/v1/doctors/:doctorId/availability`
- `PUT /api/v1/doctors/:doctorId/availability`
- `POST /api/v1/doctors/:doctorId/blocked-slots`

Appointment create request example:

```json
{
  "patientId": "661111111111111111111111",
  "doctorId": "663333333333333333333333",
  "appointmentDate": "2026-04-21",
  "startTime": "10:00",
  "durationMinutes": 30,
  "appointmentType": "scheduled",
  "reasonForVisit": "Fever and headache",
  "symptomsSummary": "Fever for 2 days"
}
```

Appointment create success example:

```json
{
  "success": true,
  "message": "Appointment booked successfully",
  "data": {
    "appointment": {
      "_id": "664444444444444444444444",
      "clinicId": "662222222222222222222222",
      "patientId": {
        "_id": "661111111111111111111111",
        "patientId": "PAT-20260421-0001",
        "fullName": "Anita Sharma"
      },
      "doctorId": {
        "_id": "663333333333333333333333",
        "doctorCode": "DOC-20260421-0001",
        "fullName": "Meera Singh"
      },
      "appointmentDate": "2026-04-21T00:00:00.000Z",
      "startTime": "10:00",
      "endTime": "10:30",
      "durationMinutes": 30,
      "appointmentType": "scheduled",
      "status": "booked",
      "noShowRisk": {
        "score": 0.2,
        "level": "low",
        "reasons": [
          "Same-day booking"
        ]
      }
    }
  }
}
```

Available slots success example:

```json
{
  "success": true,
  "message": "Available slots fetched successfully",
  "data": {
    "doctorId": "663333333333333333333333",
    "date": "2026-04-21",
    "slots": [
      {
        "startTime": "09:00",
        "endTime": "09:30",
        "available": true,
        "reason": null
      },
      {
        "startTime": "09:30",
        "endTime": "10:00",
        "available": false,
        "reason": "Booked"
      }
    ]
  }
}
```

Calendar success example:

```json
{
  "success": true,
  "message": "Calendar appointments retrieved successfully",
  "data": {
    "view": "day",
    "date": "2026-04-21",
    "range": {
      "from": "2026-04-21",
      "to": "2026-04-21"
    },
    "groupedAppointments": [
      {
        "date": "2026-04-21",
        "appointments": [
          {
            "_id": "664444444444444444444444",
            "startTime": "10:00",
            "endTime": "10:30",
            "status": "confirmed"
          }
        ]
      }
    ]
  }
}
```

Status update request example:

```json
{
  "status": "confirmed",
  "note": "Patient confirmed by phone"
}
```

Doctor blocked slot request example:

```json
{
  "date": "2026-04-21",
  "startTime": "13:00",
  "endTime": "14:00",
  "reason": "Lunch break"
}
```

## Phase 5 AI APIs

Backend proxy endpoints:

- `POST /api/v1/ai/symptom-check`
- `POST /api/v1/ai/no-show`
- `POST /api/v1/ai/format-clinical-note`

AI service endpoints:

- `POST /api/v1/ai/symptom-check`
- `POST /api/v1/ai/no-show`
- `POST /api/v1/ai/ocr-patient-document`
- `POST /api/v1/ai/transcribe`
- `POST /api/v1/ai/format-clinical-note`

Symptom check request example:

```json
{
  "symptoms": "fever, cough and body pain for 2 days",
  "age": 28,
  "gender": "male",
  "duration": "2 days",
  "known_conditions": ["diabetes"],
  "language": "en"
}
```

Symptom check success example:

```json
{
  "success": true,
  "message": "Symptom analysis generated successfully",
  "data": {
    "possible_conditions": [
      {
        "name": "Viral Fever",
        "confidence": 0.72,
        "reason": "Fever, cough, body pain, and fatigue commonly appear in viral infections."
      }
    ],
    "recommended_specialization": "General Physician",
    "urgency": "medium",
    "red_flags": [],
    "doctor_note_summary": "Patient reports fever, cough and body pain for 2 days.",
    "safety_disclaimer": "This AI output is for clinical assistance only and is not a final diagnosis. A qualified doctor must review and confirm."
  }
}
```

No-show success example:

```json
{
  "success": true,
  "message": "No-show risk generated successfully",
  "data": {
    "risk_level": "medium",
    "score": 0.4,
    "factors": [
      "Patient has missed previous appointments"
    ],
    "recommendations": [
      "Send reminder 24 hours before appointment",
      "Send same-day confirmation message"
    ]
  }
}
```

Clinical note formatting success example:

```json
{
  "success": true,
  "message": "Clinical note formatted successfully",
  "data": {
    "format": "SOAP",
    "formatted_note": {
      "subjective": "Patient has fever and cough for two days no chest pain appetite low.",
      "objective": "Not provided.",
      "assessment": "Possible acute febrile illness. Doctor review required.",
      "plan": "Doctor to evaluate, confirm diagnosis, and decide treatment plan."
    },
    "safety_disclaimer": "This AI-generated note is a draft and must be reviewed and edited by a qualified doctor."
  }
}
```

OCR placeholder success example:

```json
{
  "success": true,
  "message": "OCR extraction completed with MVP placeholder",
  "data": {
    "document_type": "patient_id",
    "extracted_fields": {
      "name": null,
      "age": null,
      "gender": null,
      "phone": null,
      "address": null
    },
    "raw_text": "",
    "confidence": 0.0,
    "requires_manual_review": true,
    "safety_note": "OCR result must be verified by clinic staff before saving."
  }
}
```

Transcribe placeholder success example:

```json
{
  "success": true,
  "message": "Transcription completed with MVP placeholder",
  "data": {
    "transcript": "",
    "language": "en",
    "confidence": 0.0,
    "engine": "placeholder",
    "requires_manual_review": true
  }
}
```

Backend AI service downtime error:

```json
{
  "success": false,
  "message": "AI service is temporarily unavailable",
  "errors": ["Unable to connect to AI service"]
}
```

## Phase 6 Consultation APIs

- `POST /api/v1/consultations`
- `GET /api/v1/consultations/:id`
- `PATCH /api/v1/consultations/:id`
- `POST /api/v1/consultations/:id/ai-suggestions`
- `PATCH /api/v1/consultations/:id/ai-suggestions/:suggestionId/decision`
- `PATCH /api/v1/consultations/:id/complete`
- `GET /api/v1/patients/:patientId/consultations`

Create consultation request example:

```json
{
  "appointmentId": "665555555555555555555555",
  "patientId": "661111111111111111111111",
  "doctorId": "663333333333333333333333",
  "chiefComplaint": "Fever and cough",
  "symptoms": ["fever", "cough", "body ache"],
  "vitals": {
    "temperature": 101,
    "bloodPressure": "120/80",
    "pulse": 88,
    "spo2": 98,
    "weight": 70
  },
  "clinicalNotes": "Patient reports fever for 2 days"
}
```

Consultation detail success example:

```json
{
  "success": true,
  "message": "Consultation retrieved successfully",
  "data": {
    "consultation": {
      "_id": "666666666666666666666666",
      "status": "draft",
      "chiefComplaint": "Fever and cough",
      "symptoms": ["fever", "cough"],
      "diagnosis": {
        "primary": "",
        "secondary": []
      },
      "aiSuggestions": []
    },
    "patient": {
      "_id": "661111111111111111111111",
      "patientId": "PAT-20260421-0001",
      "fullName": "Anita Sharma"
    },
    "doctor": {
      "_id": "663333333333333333333333",
      "doctorCode": "DOC-20260421-0001",
      "fullName": "Meera Singh"
    },
    "appointment": {
      "_id": "665555555555555555555555",
      "status": "in_consultation"
    },
    "aiSuggestions": []
  }
}
```

AI suggestion request success example:

```json
{
  "success": true,
  "message": "AI suggestions generated successfully",
  "data": {
    "consultationId": "666666666666666666666666",
    "aiSuggestions": [
      {
        "_id": "667777777777777777777777",
        "suggestionType": "diagnosis",
        "title": "Possible viral upper respiratory infection",
        "content": "Fever and cough can be seen in common viral respiratory illnesses. Clinical examination and doctor review are required.",
        "confidence": 0.72,
        "reasoning": "The symptom combination of fever and cough commonly appears in upper respiratory viral patterns.",
        "redFlags": [],
        "disclaimer": "AI suggestions are not a final diagnosis. Doctor review is mandatory.",
        "status": "pending"
      }
    ]
  }
}
```

AI suggestion decision request example:

```json
{
  "status": "edited",
  "doctorEditedContent": "Possible viral respiratory illness. Continue doctor-led evaluation."
}
```

Patient consultation history success example:

```json
{
  "success": true,
  "message": "Patient consultations retrieved successfully",
  "data": {
    "consultations": [
      {
        "_id": "666666666666666666666666",
        "date": "2026-04-21T10:00:00.000Z",
        "doctor": {
          "_id": "663333333333333333333333",
          "fullName": "Meera Singh",
          "doctorCode": "DOC-20260421-0001",
          "specialization": "General Medicine"
        },
        "chiefComplaint": "Fever and cough",
        "diagnosis": {
          "primary": "Acute febrile illness",
          "secondary": []
        },
        "status": "completed",
        "followUpDate": "2026-04-28T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

## Phase 6 AI Clinical APIs

Backend proxy helper routes:

- `POST /api/v1/ai/clinical/consultation-suggestions`
- `POST /api/v1/ai/clinical/format-note`

AI service routes:

- `POST /api/v1/clinical/consultation-suggestions`
- `POST /api/v1/clinical/format-note`

## Error Handling Expectations

- Validation errors return a consistent error shape
- Unexpected errors are handled centrally
- Healthcare-facing AI endpoints must clearly communicate assistive-only usage

## Phase 6 Contract Refresh

### Consultation Endpoints

- `POST /api/v1/consultations`
- `GET /api/v1/consultations`
- `GET /api/v1/consultations/:id`
- `PATCH /api/v1/consultations/:id`
- `POST /api/v1/consultations/:id/complete`
- `GET /api/v1/consultations/appointment/:appointmentId`
- `GET /api/v1/consultations/patient/:patientId/history`
- `POST /api/v1/consultations/:id/ai-suggestions`
- `POST /api/v1/consultations/:id/ai-review`
- `POST /api/v1/consultations/:id/format-note`

Create consultation request example:

```json
{
  "appointmentId": "665555555555555555555555",
  "patientId": "664444444444444444444444",
  "doctorId": "663333333333333333333333",
  "chiefComplaint": "Fever and cough for 2 days",
  "symptoms": [
    {
      "name": "fever",
      "severity": "moderate",
      "duration": "2 days",
      "notes": "More in evening"
    },
    {
      "name": "cough",
      "severity": "mild",
      "duration": "2 days",
      "notes": "Dry cough"
    }
  ],
  "vitals": {
    "temperature": 101.2,
    "bloodPressure": "120/80",
    "pulse": 88,
    "oxygenSaturation": 98,
    "weight": 70
  },
  "clinicalNotes": "Patient reports fever and cough for two days. No chest pain."
}
```

Complete consultation request example:

```json
{
  "diagnosis": {
    "primary": "Viral fever",
    "secondary": [],
    "notes": "Patient stable. No emergency signs."
  },
  "treatmentPlan": "Hydration, rest, and follow-up if fever persists.",
  "followUp": {
    "required": true,
    "date": "2026-04-25",
    "notes": "Follow-up if symptoms persist."
  }
}
```

AI review request example:

```json
{
  "decision": "partially_accepted",
  "acceptedSuggestions": ["Viral fever"],
  "rejectedSuggestions": ["Influenza"],
  "doctorComment": "Symptoms align with viral fever. Will monitor and advise CBC if fever persists."
}
```

### AI Clinical Endpoints

Backend proxy endpoints:

- `POST /api/v1/ai/clinical/diagnosis-suggestions`
- `POST /api/v1/ai/clinical/format-note`

AI service endpoints:

- `POST /api/v1/clinical/diagnosis-suggestions`
- `POST /api/v1/clinical/consultation-suggestions` (backward-compatible alias)
- `POST /api/v1/clinical/format-note`

Diagnosis suggestion response example:

```json
{
  "success": true,
  "message": "AI diagnosis suggestions generated successfully.",
  "data": {
    "suggestions": [
      {
        "condition": "Possible viral fever or upper respiratory infection",
        "confidence": 0.72,
        "reasoning": "Fever and cough commonly appear together in viral febrile and upper respiratory presentations.",
        "recommendedSpecialization": "General Physician",
        "redFlags": [],
        "recommendedTests": ["CBC"],
        "safetyNote": "AI-generated suggestion. Doctor validation required."
      }
    ],
    "disclaimer": "This is not a diagnosis. Doctor validation is mandatory."
  }
}
```

## Foundation Implementation Note

The current backend and frontend foundations are implemented in JavaScript. The response contract remains unchanged after the stack correction.

## Phase 7 Prescription APIs

Backend prescription endpoints:

- `POST /api/v1/prescriptions`
- `GET /api/v1/prescriptions/:id`
- `GET /api/v1/prescriptions/patient/:patientId`
- `GET /api/v1/prescriptions/consultation/:consultationId`
- `PATCH /api/v1/prescriptions/:id`
- `POST /api/v1/prescriptions/:id/finalize`
- `POST /api/v1/prescriptions/:id/cancel`
- `GET /api/v1/prescriptions/:id/download`

Backend AI helper endpoint:

- `POST /api/v1/ai/prescription/format-advice`

AI service endpoint:

- `POST /api/v1/prescription/format-advice`

Create prescription request example:

```json
{
  "patientId": "661111111111111111111111",
  "consultationId": "666666666666666666666666",
  "appointmentId": "665555555555555555555555",
  "medicines": [
    {
      "medicineName": "Demo tablet",
      "genericName": "Paracetamol",
      "dosage": "500 mg",
      "frequency": "Twice daily",
      "duration": "5 days",
      "route": "oral",
      "timing": "After food",
      "instructions": "Demo medicine only",
      "quantity": 10,
      "isSubstituteAllowed": false
    }
  ],
  "advice": "Hydration and rest",
  "followUpDate": "2026-04-25"
}
```

Create prescription success example:

```json
{
  "success": true,
  "message": "Prescription created successfully",
  "data": {
    "prescription": {
      "_id": "677777777777777777777777",
      "prescriptionNumber": "RX-20260422-000001",
      "status": "draft",
      "diagnosisSnapshot": "Viral fever",
      "symptomsSnapshot": "fever, cough",
      "medicines": [
        {
          "medicineName": "Demo tablet",
          "dosage": "500 mg",
          "frequency": "Twice daily",
          "duration": "5 days",
          "route": "oral"
        }
      ],
      "advice": "Hydration and rest",
      "pdfUrl": ""
    }
  }
}
```

Finalize prescription request example:

```json
{
  "doctorConfirmation": true,
  "finalAdvice": "Hydration, rest, and review if fever persists.",
  "followUpDate": "2026-04-25"
}
```

Finalize prescription success example:

```json
{
  "success": true,
  "message": "Prescription finalized successfully",
  "data": {
    "prescription": {
      "_id": "677777777777777777777777",
      "prescriptionNumber": "RX-20260422-000001",
      "status": "finalized",
      "pdfUrl": "/api/v1/prescriptions/677777777777777777777777/download",
      "finalizedAt": "2026-04-22T11:30:00.000Z"
    }
  }
}
```

Patient prescription list success example:

```json
{
  "success": true,
  "message": "Patient prescriptions retrieved successfully",
  "data": {
    "patient": {
      "_id": "661111111111111111111111",
      "patientId": "PAT-20260421-0001",
      "fullName": "Anita Sharma"
    },
    "prescriptions": [
      {
        "_id": "677777777777777777777777",
        "prescriptionNumber": "RX-20260422-000001",
        "status": "finalized"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

Prescription advice formatting request example:

```json
{
  "diagnosis": "Viral fever",
  "doctorNotes": "Patient is stable and can recover with supportive care.",
  "rawAdvice": "Hydration and rest for three days"
}
```

Prescription advice formatting success example:

```json
{
  "success": true,
  "message": "Advice formatted successfully",
  "data": {
    "formattedAdvice": "Diagnosis context: Viral fever. Doctor notes: Patient is stable and can recover with supportive care. Advice: Hydration and rest for three days.",
    "disclaimer": "AI assistance is not a final diagnosis or prescription. Doctor approval is mandatory.",
    "doctor_review_required": true
  }
}
```

Prescription safety expectations:

- AI does not prescribe automatically.
- Doctor confirmation is required to finalize.
- Finalized prescriptions are locked from normal edits.
- PDF download is only available after finalization.

## Phase 8 Billing APIs

Billing endpoints:

- `POST /api/v1/billing/invoices`
- `GET /api/v1/billing/invoices`
- `GET /api/v1/billing/invoices/:id`
- `PUT /api/v1/billing/invoices/:id`
- `POST /api/v1/billing/invoices/:id/payments`
- `POST /api/v1/billing/invoices/:id/generate-pdf`
- `GET /api/v1/billing/invoices/:id/pdf`
- `PATCH /api/v1/billing/invoices/:id/cancel`
- `GET /api/v1/billing/patient/:patientId/invoices`
- `GET /api/v1/billing/summary`

Create invoice request example:

```json
{
  "patientId": "661111111111111111111111",
  "appointmentId": "665555555555555555555555",
  "consultationId": "666666666666666666666666",
  "items": [
    {
      "itemType": "consultation",
      "name": "General Consultation",
      "description": "Doctor consultation fee",
      "quantity": 1,
      "unitPrice": 500
    }
  ],
  "discountType": "percentage",
  "discountValue": 10,
  "gstRate": 18,
  "notes": "Front desk invoice"
}
```

Create invoice success example:

```json
{
  "success": true,
  "message": "Invoice created successfully",
  "data": {
    "invoice": {
      "_id": "688888888888888888888888",
      "invoiceNumber": "INV-20260422-0001",
      "invoiceStatus": "draft",
      "paymentStatus": "unpaid",
      "subtotal": 500,
      "discountAmount": 50,
      "taxableAmount": 450,
      "gstRate": 18,
      "gstAmount": 81,
      "totalAmount": 531,
      "paidAmount": 0,
      "dueAmount": 531
    }
  }
}
```

Record payment request example:

```json
{
  "amount": 500,
  "paymentMode": "upi",
  "transactionId": "UPI123",
  "notes": "Paid via UPI"
}
```

Record payment success example:

```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "invoice": {
      "_id": "688888888888888888888888",
      "invoiceNumber": "INV-20260422-0001",
      "invoiceStatus": "issued",
      "paymentStatus": "partial",
      "totalAmount": 531,
      "paidAmount": 500,
      "dueAmount": 31,
      "payments": [
        {
          "amount": 500,
          "paymentMode": "upi",
          "transactionId": "UPI123"
        }
      ]
    }
  }
}
```

Billing summary success example:

```json
{
  "success": true,
  "message": "Billing summary retrieved successfully",
  "data": {
    "totalInvoices": 25,
    "totalRevenue": 120000,
    "pendingAmount": 15000,
    "paidInvoices": 20,
    "partialInvoices": 3,
    "unpaidInvoices": 2,
    "todayRevenue": 8000,
    "monthRevenue": 50000
  }
}
```

Billing response guarantees:

- Invoice line item `amount` is always computed by the backend as `quantity * unitPrice`.
- Backend ignores any client-provided `subtotal`, `discountAmount`, `taxableAmount`, `gstAmount`, `totalAmount`, `paidAmount`, or `dueAmount`.
- Payment status is derived from backend totals and recorded payments only.
- Invoice PDFs are downloaded through `GET /api/v1/billing/invoices/:id/pdf`.

## Phase 11 Lab APIs

Lab endpoints:

- `POST /api/v1/labs/tests`
- `GET /api/v1/labs/tests`
- `POST /api/v1/labs/orders`
- `GET /api/v1/labs/orders`
- `GET /api/v1/labs/orders/:id`
- `PATCH /api/v1/labs/orders/:id/status`
- `POST /api/v1/labs/reports`
- `GET /api/v1/labs/reports/:id`
- `PATCH /api/v1/labs/reports/:id`
- `PATCH /api/v1/labs/reports/:id/finalize`
- `GET /api/v1/patients/:patientId/labs`

Create lab test request example:

```json
{
  "code": "CBC",
  "name": "Complete Blood Count",
  "category": "Hematology",
  "specimenType": "Blood",
  "unit": "",
  "normalRange": {
    "text": "Varies by parameter"
  },
  "price": 350
}
```

Create lab order request example:

```json
{
  "consultationId": "699999999999999999999991",
  "patientId": "699999999999999999999992",
  "doctorId": "699999999999999999999993",
  "appointmentId": "699999999999999999999994",
  "priority": "routine",
  "notes": "Rule out infection",
  "tests": [
    {
      "labTestId": "699999999999999999999995"
    }
  ]
}
```

Create lab order success example:

```json
{
  "success": true,
  "message": "Lab order created successfully",
  "data": {
    "labOrder": {
      "_id": "699999999999999999999996",
      "orderNumber": "LAB-20260423-0001",
      "priority": "routine",
      "status": "ordered",
      "orderedAt": "2026-04-23T09:30:00.000Z",
      "tests": [
        {
          "code": "CBC",
          "name": "Complete Blood Count",
          "category": "Hematology",
          "specimenType": "Blood",
          "status": "ordered"
        }
      ]
    }
  }
}
```

Update lab order status request example:

```json
{
  "status": "sample_collected"
}
```

Create lab report request example:

```json
{
  "labOrderId": "699999999999999999999996",
  "reportFileName": "cbc_report.pdf",
  "reportUrl": "/uploads/reports/cbc_report.pdf",
  "resultEntries": [
    {
      "code": "HB",
      "name": "Hemoglobin",
      "value": "10.2",
      "numericValue": 10.2,
      "unit": "g/dL",
      "normalRange": {
        "min": 12,
        "max": 16
      }
    }
  ]
}
```

Create lab report success example:

```json
{
  "success": true,
  "message": "Lab report created successfully",
  "data": {
    "labReport": {
      "_id": "699999999999999999999997",
      "status": "draft",
      "resultEntries": [
        {
          "code": "HB",
          "name": "Hemoglobin",
          "value": "10.2",
          "numericValue": 10.2,
          "unit": "g/dL",
          "isAbnormal": true,
          "abnormalFlag": "low"
        }
      ],
      "aiAnalysis": {
        "summary": "1 abnormal parameter detected. Doctor review required.",
        "abnormalHighlights": ["Hemoglobin is below reference range"],
        "disclaimer": "AI output is assistive only and must be reviewed by a qualified doctor."
      }
    }
  }
}
```

Patient lab history success example:

```json
{
  "success": true,
  "message": "Patient lab history retrieved successfully",
  "data": {
    "patient": {
      "_id": "699999999999999999999992",
      "patientId": "PAT-20260423-0001",
      "fullName": "Anita Sharma"
    },
    "labOrders": [
      {
        "_id": "699999999999999999999996",
        "orderNumber": "LAB-20260423-0001",
        "status": "completed",
        "priority": "routine",
        "tests": [
          {
            "code": "CBC",
            "name": "Complete Blood Count",
            "status": "completed"
          }
        ],
        "report": {
          "_id": "699999999999999999999997",
          "status": "finalized",
          "abnormalCount": 1
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

Lab workflow guarantees:

- Lab order numbers are generated by the backend in `LAB-YYYYMMDD-XXXX` format and are clinic-scoped.
- The backend validates consultation, patient, doctor, and clinic ownership before creating a lab order.
- Client-provided abnormal flags are ignored; the backend computes `isAbnormal` and `abnormalFlag` from `numericValue` and `normalRange`.
- Finalized reports are locked from normal edits in the current backend workflow.
- Phase 11 keeps lab analysis rule-based in the backend; there is no required direct dependency on a separate AI endpoint for lab interpretation.

## Phase 12 Pharmacy APIs

Pharmacy endpoints:

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

Create medicine request example:

```json
{
  "code": "PCM500",
  "name": "Paracetamol 500",
  "genericName": "Paracetamol",
  "brandName": "PCM",
  "category": "Analgesic",
  "form": "Tablet",
  "strength": "500 mg",
  "manufacturer": "ABC Pharma",
  "unitPrice": 2.5,
  "reorderLevel": 20,
  "requiresPrescription": true,
  "batches": [
    {
      "batchNumber": "PCM-APR-01",
      "quantity": 100,
      "expiryDate": "2027-04-30",
      "purchasePrice": 1.8,
      "sellingPrice": 2.5
    }
  ]
}
```

Create medicine success example:

```json
{
  "success": true,
  "message": "Medicine created successfully",
  "data": {
    "medicine": {
      "_id": "700000000000000000000001",
      "name": "Paracetamol 500",
      "genericName": "Paracetamol",
      "totalStock": 100,
      "stockFlags": {
        "lowStock": false,
        "nearExpiry": false,
        "expired": false
      }
    }
  }
}
```

Dispense request example:

```json
{
  "prescriptionId": "700000000000000000000010",
  "patientId": "700000000000000000000011",
  "doctorId": "700000000000000000000012",
  "items": [
    {
      "medicineId": "700000000000000000000001",
      "quantity": 10,
      "instructions": "After meals"
    }
  ],
  "notes": "Dispensed from front desk pharmacy"
}
```

Dispense success example:

```json
{
  "success": true,
  "message": "Medicines dispensed successfully",
  "data": {
    "dispensingRecord": {
      "_id": "700000000000000000000020",
      "status": "dispensed",
      "subtotal": 25,
      "items": [
        {
          "medicineName": "Paracetamol 500",
          "batchNumber": "PCM-APR-01",
          "quantity": 10,
          "unitPrice": 2.5,
          "totalPrice": 25
        }
      ]
    },
    "pharmacySale": {
      "_id": "700000000000000000000021",
      "amount": 25,
      "paymentStatus": "pending"
    }
  }
}
```

Patient medicine history success example:

```json
{
  "success": true,
  "message": "Patient medicine history retrieved successfully",
  "data": {
    "patient": {
      "_id": "700000000000000000000011",
      "patientId": "PAT-20260423-0001",
      "fullName": "Anita Sharma"
    },
    "dispensings": [
      {
        "_id": "700000000000000000000020",
        "status": "dispensed",
        "dispensedAt": "2026-04-23T11:30:00.000Z",
        "subtotal": 25,
        "prescription": {
          "_id": "700000000000000000000010",
          "prescriptionNumber": "RX-20260423-000001"
        },
        "pharmacySale": {
          "_id": "700000000000000000000021",
          "paymentStatus": "pending",
          "amount": 25
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

Pharmacy workflow guarantees:

- Medicine and dispensing reads/writes are clinic-scoped in the backend.
- The backend computes `totalStock` and stock flags; client-provided stock flags are ignored.
- Expired batches are blocked from dispensing in Phase 12.
- FEFO-style batch allocation is performed by the backend when dispensing from available stock.
- The backend rejects insufficient stock before any dispensing record is finalized.
- Prescription dispensing status is updated by the backend after successful dispense.
- Phase 12 keeps pharmacy insights rule-based in the main backend and does not require a separate AI service dependency.

## Phase 13 Notification APIs

Notification endpoints:

- `POST /api/v1/notifications/templates`
- `GET /api/v1/notifications/templates`
- `POST /api/v1/notifications/send`
- `POST /api/v1/notifications/appointment-reminder`
- `POST /api/v1/notifications/follow-up`
- `GET /api/v1/notifications/logs`
- `GET /api/v1/notifications/logs/:id`
- `PATCH /api/v1/notifications/logs/:id/cancel`
- `POST /api/v1/notifications/dispatch-pending`
- `GET /api/v1/follow-ups`
- `PATCH /api/v1/follow-ups/:id/status`
- `GET /api/v1/patients/:patientId/notifications`

Create template request example:

```json
{
  "name": "Appointment Reminder Default",
  "type": "appointment_reminder",
  "channel": "mock",
  "subject": "Appointment Reminder",
  "body": "Hello {{patientName}}, your appointment is on {{appointmentDate}} at {{appointmentTime}}.",
  "variables": ["patientName", "appointmentDate", "appointmentTime"]
}
```

Send notification success example:

```json
{
  "success": true,
  "message": "Notification processed successfully",
  "data": {
    "notificationLog": {
      "_id": "700000000000000000000031",
      "type": "custom",
      "channel": "mock",
      "status": "sent",
      "subject": "Custom update",
      "body": "Please contact the clinic.",
      "provider": "mock"
    }
  }
}
```

Create follow-up task success example:

```json
{
  "success": true,
  "message": "Follow-up task created successfully",
  "data": {
    "followUpTask": {
      "_id": "700000000000000000000041",
      "title": "Review after 7 days",
      "status": "pending",
      "type": "follow_up_visit",
      "reminderSent": false
    },
    "notificationLog": {
      "_id": "700000000000000000000042",
      "type": "follow_up",
      "status": "pending",
      "scheduledFor": "2026-04-30T09:00:00.000Z"
    }
  }
}
```

Patient notification history success example:

```json
{
  "success": true,
  "message": "Patient notification history retrieved successfully",
  "data": {
    "patient": {
      "_id": "700000000000000000000011",
      "patientId": "PAT-20260423-0001",
      "fullName": "Anita Sharma"
    },
    "notificationLogs": [
      {
        "_id": "700000000000000000000031",
        "type": "custom",
        "status": "sent",
        "channel": "mock"
      }
    ],
    "followUpTasks": [
      {
        "_id": "700000000000000000000041",
        "title": "Review after 7 days",
        "status": "pending"
      }
    ]
  }
}
```

Notification workflow guarantees:

- Notification templates, logs, and follow-up tasks are clinic-scoped in the backend.
- Missing template variables do not crash rendering; unresolved placeholders render as empty strings.
- Immediate sends and scheduled sends share the same audited `notification_logs` collection.
- Phase 13 defaults to a mock-first provider strategy so local development does not depend on paid vendor credentials.
- `dispatch-pending` is a manual MVP delivery mechanism; no heavy cron or queue worker is required in this phase.
- Patient history and notification history are populated from backend relations only.

## Phase 9 Frontend Compatibility Notes

Dedicated frontend-facing compatibility routes and adapters used by the React MVP:

- `POST /api/v1/symptom-check`
- `POST /api/v1/format-clinical-note`
- `POST /api/v1/transcribe`

Response shape used by the frontend chatbot fallback:

```json
{
  "success": true,
  "message": "Symptom analysis generated",
  "data": {
    "possibleConditions": [],
    "recommendedSpecialization": "",
    "urgency": "low",
    "redFlags": [],
    "doctorNoteSummary": "",
    "disclaimer": "AI suggestions are assistive only and not a final diagnosis."
  }
}
```

## Phase 14 Dashboard APIs

Dashboard endpoints:

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/dashboard/appointments`
- `GET /api/v1/dashboard/revenue`
- `GET /api/v1/dashboard/patients`
- `GET /api/v1/dashboard/labs`
- `GET /api/v1/dashboard/pharmacy`
- `GET /api/v1/dashboard/notifications`
- `GET /api/v1/dashboard/doctor-workload`
- `GET /api/v1/dashboard/no-show`
- `GET /api/v1/dashboard/activity-feed`

Overview success example:

```json
{
  "success": true,
  "message": "Dashboard overview fetched successfully",
  "data": {
    "cards": {
      "totalPatients": 120,
      "newPatients": 18,
      "todayAppointments": 9,
      "pendingAppointments": 4,
      "completedConsultations": 7,
      "activePrescriptions": 6,
      "pendingInvoices": 3,
      "labOrders": 5,
      "lowStockMedicines": 2,
      "pendingFollowUps": 8
    },
    "range": {
      "from": "2026-04-01",
      "to": "2026-04-30"
    }
  }
}
```

Appointments analytics response highlights:

- `total`
- `booked`
- `confirmed`
- `completed`
- `cancelled`
- `noShow`
- `walkInCount`
- `byDay`
- `byDoctor`

Revenue analytics response highlights:

- `invoiceRevenue`
- `pharmacyRevenue`
- `totalRevenue`
- `paidAmount`
- `unpaidAmount`
- `byDay`

Dashboard contract guarantees:

- All dashboard endpoints are clinic-scoped in the backend.
- `from` and `to` use `YYYY-MM-DD` format.
- When `from` and `to` are omitted, the backend defaults to the last 30 days.
- When a metric is not reliably derivable from current schema state, the backend returns safe zero/empty values instead of failing.
- Doctor-scoped dashboard access is restricted safely to doctor-linked records where the current schema supports it.

## Phase 15 Hardening Notes

- Phase 15 does not add new business endpoints.
- The active Postman collection was refreshed to match the current health, auth, patients, doctors, appointments, consultations, prescriptions, billing, labs, pharmacy, notifications, dashboard, and AI-service routes.
- Docker/runtime verification is still environment-dependent. When Docker is unavailable, structural review plus local service probes remain the verified fallback.
