const { connectDB, disconnectDB } = require('../config/database');
const { ROLES } = require('../common/constants/roles');
const { APPOINTMENT_STATUSES } = require('../common/constants/appointmentStatus');
const { calculateInvoiceTotals } = require('../common/utils/billingCalculator');
const { logger } = require('../common/utils/logger');
const Clinic = require('../modules/clinics/clinic.model');
const User = require('../modules/users/user.model');
const Patient = require('../modules/patients/patient.model');
const Doctor = require('../modules/doctors/doctor.model');
const Appointment = require('../modules/appointments/appointment.model');
const Consultation = require('../modules/consultations/consultation.model');
const Prescription = require('../modules/prescriptions/prescription.model');
const Invoice = require('../modules/billing/invoice.model');
const { LabOrder } = require('../modules/labs/labOrder.model');
const LabReport = require('../modules/labs/labReport.model');
const Medicine = require('../modules/pharmacy/medicine.model');
const DispensingRecord = require('../modules/pharmacy/dispensingRecord.model');
const PharmacySale = require('../modules/pharmacy/pharmacySale.model');
const NotificationTemplate = require('../modules/notifications/notificationTemplate.model');
const NotificationLog = require('../modules/notifications/notificationLog.model');
const FollowUpTask = require('../modules/notifications/followUpTask.model');

const DEMO_USERS = {
  admin: {
    name: 'Super Admin',
    email: 'admin@aicms.local',
    password: 'Admin123!',
    role: ROLES.SUPER_ADMIN
  },
  receptionist: {
    name: 'Reception Demo',
    email: 'receptionist@aicms.local',
    password: 'Reception@12345',
    role: ROLES.RECEPTIONIST,
    phone: '9000000001'
  },
  doctor: {
    name: 'Dr Aarav Mehta',
    email: 'doctor@aicms.local',
    password: 'Doctor@12345',
    role: ROLES.DOCTOR,
    phone: '9000000002'
  },
  patient: {
    name: 'Riya Patel',
    email: 'patient@aicms.local',
    password: 'Patient@12345',
    role: ROLES.PATIENT,
    phone: '9000000003'
  }
};

const demoAvailability = [
  { dayOfWeek: 'monday', isAvailable: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
  { dayOfWeek: 'tuesday', isAvailable: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
  { dayOfWeek: 'wednesday', isAvailable: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
  { dayOfWeek: 'thursday', isAvailable: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true },
  { dayOfWeek: 'friday', isAvailable: true, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isActive: true }
];

const getDateOffset = (days) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};

const upsertDocument = async (Model, filter, payload, options = {}) => {
  const query = Model.findOne(filter);

  if (options.includePassword) {
    query.select('+password');
  }

  let document = await query;

  if (!document) {
    document = new Model(payload);
  } else {
    Object.assign(document, payload);
  }

  await document.save();
  return document;
};

const upsertRecord = async ({ Model, filter, createPayload, updatePayload = null }) => {
  const existing = await Model.findOne(filter);

  if (!existing) {
    return Model.create(createPayload);
  }

  Object.assign(existing, updatePayload || createPayload);
  await existing.save();
  return existing;
};

const seedDemoData = async () => {
  await connectDB();

  const clinic = await upsertDocument(
    Clinic,
    { code: 'AICMSDEMO' },
    {
      name: 'AI-CMS Demo Clinic',
      code: 'AICMSDEMO',
      address: {
        line1: '12 Demo Health Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      },
      isActive: true
    }
  );

  const adminUser = await upsertDocument(
    User,
    { email: DEMO_USERS.admin.email },
    {
      ...DEMO_USERS.admin,
      clinicId: clinic._id,
      isActive: true,
      createdBy: null,
      updatedBy: null
    },
    { includePassword: true }
  );

  const receptionistUser = await upsertDocument(
    User,
    { email: DEMO_USERS.receptionist.email },
    {
      ...DEMO_USERS.receptionist,
      clinicId: clinic._id,
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id
    },
    { includePassword: true }
  );

  const doctorUser = await upsertDocument(
    User,
    { email: DEMO_USERS.doctor.email },
    {
      ...DEMO_USERS.doctor,
      clinicId: clinic._id,
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id
    },
    { includePassword: true }
  );

  await upsertDocument(
    User,
    { email: DEMO_USERS.patient.email },
    {
      ...DEMO_USERS.patient,
      clinicId: clinic._id,
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id
    },
    { includePassword: true }
  );

  const doctorOne = await upsertDocument(
    Doctor,
    { clinicId: clinic._id, doctorCode: 'DOC-DEMO-0001' },
    {
      clinicId: clinic._id,
      userId: doctorUser._id,
      doctorCode: 'DOC-DEMO-0001',
      firstName: 'Aarav',
      lastName: 'Mehta',
      fullName: 'Dr Aarav Mehta',
      gender: 'male',
      phone: '9000001001',
      email: DEMO_USERS.doctor.email,
      specialization: 'General Physician',
      qualification: 'MBBS, MD',
      experienceYears: 9,
      consultationFee: 500,
      availability: demoAvailability,
      blockedSlots: [],
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id
    }
  );

  const doctorTwo = await upsertDocument(
    Doctor,
    { clinicId: clinic._id, doctorCode: 'DOC-DEMO-0002' },
    {
      clinicId: clinic._id,
      doctorCode: 'DOC-DEMO-0002',
      firstName: 'Priya',
      lastName: 'Sharma',
      fullName: 'Dr Priya Sharma',
      gender: 'female',
      phone: '9000001002',
      email: 'doctor2@aicms.local',
      specialization: 'Internal Medicine',
      qualification: 'MBBS, DNB',
      experienceYears: 7,
      consultationFee: 600,
      availability: demoAvailability,
      blockedSlots: [],
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id
    }
  );

  const patientOne = await upsertDocument(
    Patient,
    { clinicId: clinic._id, patientId: 'PAT-DEMO-0001' },
    {
      clinicId: clinic._id,
      patientId: 'PAT-DEMO-0001',
      firstName: 'Riya',
      lastName: 'Patel',
      fullName: 'Riya Patel',
      gender: 'female',
      dateOfBirth: new Date('1996-08-15'),
      phone: DEMO_USERS.patient.phone,
      email: DEMO_USERS.patient.email,
      address: {
        line1: '101 Palm Residency',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002',
        country: 'India'
      },
      bloodGroup: 'B+',
      allergies: ['Dust'],
      chronicConditions: ['Migraine'],
      currentMedications: ['Vitamin D'],
      emergencyContact: {
        name: 'Nitin Patel',
        relation: 'Brother',
        phone: '9000002001'
      },
      isActive: true,
      createdBy: receptionistUser._id,
      updatedBy: receptionistUser._id
    }
  );

  const patientTwo = await upsertDocument(
    Patient,
    { clinicId: clinic._id, patientId: 'PAT-DEMO-0002' },
    {
      clinicId: clinic._id,
      patientId: 'PAT-DEMO-0002',
      firstName: 'Mohan',
      lastName: 'Verma',
      fullName: 'Mohan Verma',
      gender: 'male',
      dateOfBirth: new Date('1988-04-11'),
      phone: '9000002002',
      email: 'mohan@aicms.local',
      address: {
        line1: '22 Lake View Apartments',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400003',
        country: 'India'
      },
      bloodGroup: 'O+',
      allergies: [],
      chronicConditions: ['Hypertension'],
      currentMedications: ['Amlodipine'],
      emergencyContact: {
        name: 'Neha Verma',
        relation: 'Spouse',
        phone: '9000002003'
      },
      isActive: true,
      createdBy: receptionistUser._id,
      updatedBy: receptionistUser._id
    }
  );

  const patientThree = await upsertDocument(
    Patient,
    { clinicId: clinic._id, patientId: 'PAT-DEMO-0003' },
    {
      clinicId: clinic._id,
      patientId: 'PAT-DEMO-0003',
      firstName: 'Sana',
      lastName: 'Khan',
      fullName: 'Sana Khan',
      gender: 'female',
      dateOfBirth: new Date('2001-12-03'),
      phone: '9000002004',
      email: 'sana@aicms.local',
      address: {
        line1: '8 Riverfront Towers',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400004',
        country: 'India'
      },
      bloodGroup: 'A+',
      allergies: ['Peanuts'],
      chronicConditions: [],
      currentMedications: [],
      emergencyContact: {
        name: 'Farah Khan',
        relation: 'Mother',
        phone: '9000002005'
      },
      isActive: true,
      createdBy: receptionistUser._id,
      updatedBy: receptionistUser._id
    }
  );

  const completedAppointment = await upsertDocument(
    Appointment,
    {
      clinicId: clinic._id,
      patientId: patientOne._id,
      doctorId: doctorOne._id,
      appointmentDate: getDateOffset(-1),
      startTime: '10:00'
    },
    {
      clinicId: clinic._id,
      patientId: patientOne._id,
      doctorId: doctorOne._id,
      createdBy: receptionistUser._id,
      appointmentDate: getDateOffset(-1),
      startTime: '10:00',
      endTime: '10:30',
      durationMinutes: 30,
      appointmentType: 'scheduled',
      status: APPOINTMENT_STATUSES.COMPLETED,
      reasonForVisit: 'Fever and cough for 2 days',
      symptomsSummary: 'Fever, cough, fatigue',
      source: 'reception',
      noShowRisk: {
        score: 0.2,
        level: 'low',
        reasons: ['Confirmed appointment'],
        generatedAt: new Date()
      },
      notes: 'Completed consultation available in EMR.'
    }
  );

  const upcomingAppointment = await upsertDocument(
    Appointment,
    {
      clinicId: clinic._id,
      patientId: patientTwo._id,
      doctorId: doctorTwo._id,
      appointmentDate: getDateOffset(0),
      startTime: '14:00'
    },
    {
      clinicId: clinic._id,
      patientId: patientTwo._id,
      doctorId: doctorTwo._id,
      createdBy: receptionistUser._id,
      appointmentDate: getDateOffset(0),
      startTime: '14:00',
      endTime: '14:30',
      durationMinutes: 30,
      appointmentType: 'scheduled',
      status: APPOINTMENT_STATUSES.BOOKED,
      reasonForVisit: 'Routine follow-up',
      symptomsSummary: 'Blood pressure review',
      source: 'reception',
      noShowRisk: {
        score: 0.35,
        level: 'medium',
        reasons: ['Same-day booking'],
        generatedAt: new Date()
      },
      notes: 'Visible on dashboard and appointment calendar.'
    }
  );

  const consultation = await upsertDocument(
    Consultation,
    { appointmentId: completedAppointment._id },
    {
      clinicId: clinic._id,
      appointmentId: completedAppointment._id,
      patientId: patientOne._id,
      doctorId: doctorOne._id,
      chiefComplaint: 'Fever and cough for 2 days',
      symptoms: [
        { name: 'fever', severity: 'moderate', duration: '2 days', notes: 'Mostly evening rise' },
        { name: 'cough', severity: 'mild', duration: '2 days', notes: 'Dry cough' }
      ],
      vitals: {
        temperature: 100.8,
        bloodPressure: '118/76',
        pulse: 86,
        respiratoryRate: 18,
        oxygenSaturation: 98,
        weight: 58,
        height: 162
      },
      clinicalNotes: 'Patient reports fever and cough for two days. No chest pain or breathing difficulty.',
      formattedClinicalNotes: {
        subjective: 'Patient reports fever and dry cough for two days.',
        objective: 'Temperature mildly elevated. Oxygen saturation normal.',
        assessment: 'Likely acute viral upper respiratory infection.',
        plan: 'Hydration, rest, symptomatic treatment, and review if worsening.'
      },
      diagnosis: {
        primary: 'Acute viral upper respiratory infection',
        secondary: ['Febrile illness'],
        notes: 'No emergency warning signs today.'
      },
      treatmentPlan: 'Hydration, rest, steam inhalation, and fever monitoring for 3 days.',
      followUp: {
        required: true,
        date: getDateOffset(3),
        notes: 'Return sooner if fever rises or breathing difficulty develops.'
      },
      aiSuggestions: {
        requested: true,
        generatedAt: new Date(),
        status: 'accepted',
        suggestions: [
          {
            condition: 'Possible viral upper respiratory infection',
            confidence: 0.74,
            reasoning: 'Fever and dry cough without chest pain commonly fit a viral respiratory pattern.',
            recommendedSpecialization: 'General Physician',
            redFlags: ['Shortness of breath', 'Chest pain'],
            recommendedTests: ['CBC if fever persists'],
            safetyNote: 'AI-generated suggestions are assistive only and require doctor validation.'
          }
        ],
        rawResponse: {
          modelName: 'rule-based-mvp-clinical-assistant',
          modelVersion: '0.1.0'
        },
        errorMessage: ''
      },
      aiReview: {
        decision: 'accepted',
        acceptedSuggestions: ['Possible viral upper respiratory infection'],
        rejectedSuggestions: [],
        doctorComment: 'Accepted as supportive reasoning only; final diagnosis kept doctor-controlled.',
        reviewedAt: new Date(),
        reviewedBy: doctorUser._id
      },
      status: 'completed',
      startedAt: getDateOffset(-1),
      completedAt: new Date(),
      prescriptionCreated: true,
      billingReady: true,
      createdBy: doctorUser._id,
      updatedBy: doctorUser._id
    }
  );

  const prescription = await upsertDocument(
    Prescription,
    { clinicId: clinic._id, prescriptionNumber: 'RX-DEMO-000001' },
    {
      clinicId: clinic._id,
      patientId: patientOne._id,
      doctorId: doctorOne._id,
      consultationId: consultation._id,
      appointmentId: completedAppointment._id,
      prescriptionNumber: 'RX-DEMO-000001',
      diagnosisSnapshot: consultation.diagnosis.primary,
      symptomsSnapshot: 'fever, cough',
      notes: 'Demo prescription for the seeded consultation.',
      medicines: [
        {
          medicineName: 'Paracetamol 650',
          genericName: 'Acetaminophen',
          dosage: '1 tablet',
          frequency: 'TID',
          duration: '3 days',
          route: 'oral',
          timing: 'After food',
          instructions: 'Take after meals if fever is above 100 F',
          quantity: 9,
          isSubstituteAllowed: true
        },
        {
          medicineName: 'Cough Syrup',
          genericName: 'Dextromethorphan',
          dosage: '10 ml',
          frequency: 'BID',
          duration: '5 days',
          route: 'oral',
          timing: 'After food',
          instructions: 'Use only if cough worsens at night',
          quantity: 1,
          isSubstituteAllowed: false
        }
      ],
      advice: 'Hydrate well, rest, and return if symptoms worsen.',
      followUpDate: getDateOffset(3),
      status: 'finalized',
      pdfUrl: '',
      finalizedAt: new Date(),
      createdBy: doctorUser._id,
      updatedBy: doctorUser._id,
      aiAssist: {
        used: true,
        suggestionId: 'demo-advice-format',
        disclaimer: 'AI formatted this text only. Doctor approval is mandatory.',
        doctorReviewed: true
      }
    }
  );

  const invoiceItems = [
    {
      itemType: 'consultation',
      name: 'General Consultation',
      description: 'Doctor consultation fee',
      quantity: 1,
      unitPrice: 500
    },
    {
      itemType: 'pharmacy',
      name: 'Medicines package',
      description: 'Demo pharmacy placeholder item',
      quantity: 1,
      unitPrice: 180
    }
  ];

  const payments = [
    {
      amount: 300,
      paymentMode: 'upi',
      transactionId: 'DEMO-UPI-0001',
      paidAt: new Date(),
      receivedBy: receptionistUser._id,
      notes: 'Partial demo payment'
    }
  ];

  const invoiceTotals = calculateInvoiceTotals({
    items: invoiceItems,
    discountType: 'none',
    discountValue: 0,
    gstRate: 18,
    payments
  });

  await upsertDocument(
    Invoice,
    { clinicId: clinic._id, invoiceNumber: 'INV-DEMO-0001' },
    {
      invoiceNumber: 'INV-DEMO-0001',
      clinicId: clinic._id,
      patientId: patientOne._id,
      appointmentId: completedAppointment._id,
      consultationId: consultation._id,
      createdBy: receptionistUser._id,
      updatedBy: receptionistUser._id,
      invoiceDate: new Date(),
      dueDate: getDateOffset(7),
      items: invoiceTotals.items,
      subtotal: invoiceTotals.subtotal,
      discountType: invoiceTotals.discountType,
      discountValue: invoiceTotals.discountValue,
      discountAmount: invoiceTotals.discountAmount,
      taxableAmount: invoiceTotals.taxableAmount,
      gstRate: invoiceTotals.gstRate,
      gstAmount: invoiceTotals.gstAmount,
      totalAmount: invoiceTotals.totalAmount,
      paidAmount: invoiceTotals.paidAmount,
      dueAmount: invoiceTotals.dueAmount,
      paymentStatus: invoiceTotals.paymentStatus,
      invoiceStatus: 'issued',
      payments: invoiceTotals.payments,
      pdfUrl: '',
      notes: 'Demo seeded invoice for Phase 9/10 local walkthrough.',
      metadata: {
        seeded: true
      }
    }
  );

  const labOrder = await upsertRecord({
    Model: LabOrder,
    filter: { clinicId: clinic._id, orderNumber: 'LAB-DEMO-0001' },
    createPayload: {
      clinicId: clinic._id,
      consultationId: consultation._id,
      patientId: patientOne._id,
      doctorId: doctorOne._id,
      appointmentId: completedAppointment._id,
      orderNumber: 'LAB-DEMO-0001',
      tests: [
        {
          code: 'CBC',
          name: 'Complete Blood Count',
          category: 'Hematology',
          specimenType: 'Blood',
          unit: '',
          status: 'completed'
        }
      ],
      priority: 'routine',
      notes: 'Seeded demo lab order',
      status: 'completed',
      orderedAt: new Date(),
      createdBy: doctorUser._id,
      updatedBy: doctorUser._id
    },
    updatePayload: {
      consultationId: consultation._id,
      patientId: patientOne._id,
      doctorId: doctorOne._id,
      appointmentId: completedAppointment._id,
      status: 'completed',
      updatedBy: doctorUser._id
    }
  });

  await upsertRecord({
    Model: LabReport,
    filter: { clinicId: clinic._id, labOrderId: labOrder._id },
    createPayload: {
      clinicId: clinic._id,
      labOrderId: labOrder._id,
      patientId: patientOne._id,
      consultationId: consultation._id,
      reportFileName: 'demo-cbc-report.pdf',
      reportUrl: '/uploads/reports/demo-cbc-report.pdf',
      resultEntries: [
        {
          code: 'HB',
          name: 'Hemoglobin',
          value: '10.8',
          numericValue: 10.8,
          unit: 'g/dL',
          normalRange: {
            min: 12,
            max: 16
          },
          isAbnormal: true,
          abnormalFlag: 'low'
        }
      ],
      aiAnalysis: {
        summary: '1 abnormal parameter detected. Doctor review required.',
        abnormalHighlights: ['Hemoglobin is below reference range'],
        disclaimer: 'AI output is assistive only and must be reviewed by a qualified doctor.'
      },
      status: 'finalized',
      reviewedBy: doctorUser._id,
      reviewedAt: new Date(),
      createdBy: doctorUser._id,
      updatedBy: doctorUser._id
    },
    updatePayload: {
      patientId: patientOne._id,
      consultationId: consultation._id,
      status: 'finalized',
      reviewedBy: doctorUser._id,
      reviewedAt: new Date(),
      updatedBy: doctorUser._id
    }
  });

  const medicine = await upsertDocument(
    Medicine,
    { clinicId: clinic._id, code: 'PCM-DEMO-500' },
    {
      clinicId: clinic._id,
      code: 'PCM-DEMO-500',
      name: 'Paracetamol 500',
      genericName: 'Paracetamol',
      brandName: 'PCM Demo',
      category: 'Analgesic',
      form: 'Tablet',
      strength: '500 mg',
      manufacturer: 'Demo Pharma',
      unitPrice: 2.5,
      reorderLevel: 10,
      requiresPrescription: true,
      batches: [
        {
          batchNumber: 'PCM-DEMO-B1',
          quantity: 36,
          expiryDate: getDateOffset(180),
          purchasePrice: 1.5,
          sellingPrice: 2.5,
          receivedAt: new Date()
        }
      ],
      createdBy: adminUser._id,
      updatedBy: adminUser._id
    }
  );

  prescription.dispensingStatus = 'dispensed';
  prescription.dispensedAt = new Date();
  await prescription.save();

  const dispensingRecord = await upsertRecord({
    Model: DispensingRecord,
    filter: { clinicId: clinic._id, prescriptionId: prescription._id },
    createPayload: {
      clinicId: clinic._id,
      prescriptionId: prescription._id,
      patientId: patientOne._id,
      doctorId: doctorOne._id,
      dispensedBy: receptionistUser._id,
      items: [
        {
          medicineId: medicine._id,
          medicineName: medicine.name,
          batchNumber: 'PCM-DEMO-B1',
          quantity: 9,
          unitPrice: 2.5,
          totalPrice: 22.5,
          instructions: 'Take after meals if fever is above 100 F'
        }
      ],
      subtotal: 22.5,
      notes: 'Seeded demo dispensing record',
      status: 'dispensed',
      dispensedAt: new Date()
    },
    updatePayload: {
      patientId: patientOne._id,
      doctorId: doctorOne._id,
      dispensedBy: receptionistUser._id,
      subtotal: 22.5,
      status: 'dispensed',
      dispensedAt: new Date()
    }
  });

  await upsertRecord({
    Model: PharmacySale,
    filter: { clinicId: clinic._id, dispensingRecordId: dispensingRecord._id },
    createPayload: {
      clinicId: clinic._id,
      dispensingRecordId: dispensingRecord._id,
      patientId: patientOne._id,
      amount: 22.5,
      paymentStatus: 'paid',
      paymentMethod: 'upi',
      notes: 'Seeded demo pharmacy sale',
      createdBy: receptionistUser._id,
      updatedBy: receptionistUser._id
    },
    updatePayload: {
      patientId: patientOne._id,
      amount: 22.5,
      paymentStatus: 'paid',
      paymentMethod: 'upi',
      updatedBy: receptionistUser._id
    }
  });

  const appointmentReminderTemplate = await upsertDocument(
    NotificationTemplate,
    { clinicId: clinic._id, name: 'Demo Appointment Reminder' },
    {
      clinicId: clinic._id,
      name: 'Demo Appointment Reminder',
      type: 'appointment_reminder',
      channel: 'mock',
      subject: 'Appointment Reminder',
      body: 'Hello {{patientName}}, your appointment is scheduled on {{appointmentDate}} at {{appointmentTime}}.',
      variables: ['patientName', 'appointmentDate', 'appointmentTime'],
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id
    }
  );

  await upsertRecord({
    Model: NotificationLog,
    filter: { clinicId: clinic._id, appointmentId: upcomingAppointment._id, type: 'appointment_reminder' },
    createPayload: {
      clinicId: clinic._id,
      patientId: patientTwo._id,
      appointmentId: upcomingAppointment._id,
      templateId: appointmentReminderTemplate._id,
      type: 'appointment_reminder',
      channel: 'mock',
      recipient: {
        name: patientTwo.fullName,
        phone: patientTwo.phone,
        email: patientTwo.email
      },
      subject: 'Appointment Reminder',
      body: 'Hello Mohan Verma, your appointment is scheduled today at 14:00.',
      renderedVariables: {
        patientName: patientTwo.fullName,
        appointmentDate: upcomingAppointment.appointmentDate.toISOString().slice(0, 10),
        appointmentTime: upcomingAppointment.startTime
      },
      status: 'sent',
      provider: 'mock',
      sentAt: new Date(),
      createdBy: receptionistUser._id,
      updatedBy: receptionistUser._id
    },
    updatePayload: {
      patientId: patientTwo._id,
      templateId: appointmentReminderTemplate._id,
      status: 'sent',
      provider: 'mock',
      sentAt: new Date(),
      updatedBy: receptionistUser._id
    }
  });

  await upsertRecord({
    Model: FollowUpTask,
    filter: { clinicId: clinic._id, patientId: patientOne._id, title: 'Review after 3 days' },
    createPayload: {
      clinicId: clinic._id,
      patientId: patientOne._id,
      consultationId: consultation._id,
      doctorId: doctorOne._id,
      title: 'Review after 3 days',
      description: 'Seeded follow-up task for the completed consultation.',
      dueDate: getDateOffset(3),
      type: 'follow_up_visit',
      status: 'pending',
      reminderSent: true,
      createdBy: doctorUser._id,
      updatedBy: doctorUser._id
    },
    updatePayload: {
      consultationId: consultation._id,
      doctorId: doctorOne._id,
      status: 'pending',
      reminderSent: true,
      updatedBy: doctorUser._id
    }
  });

  logger.info(
    'Demo clinic, users, doctors, patients, appointments, consultation, prescription, invoice, lab, pharmacy, and notification records have been seeded.'
  );

  await disconnectDB();
};

if (require.main === module) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch(async (error) => {
      logger.error('Demo data seed failed.', error);
      await disconnectDB();
      process.exit(1);
    });
}

module.exports = {
  seedDemoData
};
