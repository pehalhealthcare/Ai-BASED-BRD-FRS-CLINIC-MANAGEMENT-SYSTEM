const request = require('supertest');
const mongoose = require('mongoose');

const { ROLES } = require('../src/common/constants/roles');
const {
  createDoctorRecord,
  createPatientRecord,
  createUserWithClinic,
  getAuthHeaders
} = require('./helpers/phase3.helper');

let app;

const createAppointmentRecord = ({ clinicId, patientId, doctorId, createdBy, overrides = {} }) =>
  require('../src/modules/appointments/appointment.model').create({
    clinicId,
    patientId,
    doctorId,
    createdBy,
    appointmentDate: new Date('2026-04-10T00:00:00.000Z'),
    startTime: '10:00',
    endTime: '10:30',
    durationMinutes: 30,
    appointmentType: 'scheduled',
    status: 'confirmed',
    reasonForVisit: 'General review',
    symptomsSummary: 'fever',
    source: 'reception',
    ...overrides
  });

const createConsultationRecord = ({ clinicId, patientId, doctorId, appointmentId, createdBy, overrides = {} }) =>
  require('../src/modules/consultations/consultation.model').create({
    clinicId,
    patientId,
    doctorId,
    appointmentId,
    chiefComplaint: 'Fever',
    status: 'completed',
    startedAt: new Date('2026-04-10T10:00:00.000Z'),
    completedAt: new Date('2026-04-10T10:20:00.000Z'),
    diagnosis: {
      primary: 'Viral fever',
      secondary: [],
      notes: ''
    },
    treatmentPlan: 'Oral medication',
    createdBy,
    updatedBy: createdBy,
    ...overrides
  });

const createPrescriptionRecord = ({
  clinicId,
  patientId,
  doctorId,
  consultationId,
  appointmentId,
  createdBy,
  overrides = {}
}) =>
  require('../src/modules/prescriptions/prescription.model').create({
    clinicId,
    patientId,
    doctorId,
    consultationId,
    appointmentId,
    prescriptionNumber: `RX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    diagnosisSnapshot: 'Viral fever',
    symptomsSnapshot: 'fever',
    notes: 'Take medicines',
    medicines: [
      {
        medicineName: 'Paracetamol 500',
        dosage: '500 mg',
        frequency: 'Twice daily',
        duration: '5 days',
        route: 'oral'
      }
    ],
    advice: 'Rest',
    status: 'finalized',
    createdBy,
    updatedBy: createdBy,
    ...overrides
  });

const createInvoiceRecord = ({
  clinicId,
  patientId,
  appointmentId,
  consultationId,
  createdBy,
  overrides = {}
}) =>
  require('../src/modules/billing/invoice.model').create({
    invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    clinicId,
    patientId,
    appointmentId,
    consultationId,
    createdBy,
    updatedBy: createdBy,
    invoiceDate: new Date('2026-04-10T12:00:00.000Z'),
    items: [
      {
        itemType: 'consultation',
        name: 'Consultation fee',
        quantity: 1,
        unitPrice: 500,
        amount: 500
      }
    ],
    subtotal: 500,
    taxableAmount: 500,
    totalAmount: 500,
    paidAmount: 300,
    dueAmount: 200,
    paymentStatus: 'partial',
    invoiceStatus: 'issued',
    ...overrides
  });

const createLabOrderRecord = ({
  clinicId,
  consultationId,
  patientId,
  doctorId,
  appointmentId,
  createdBy,
  overrides = {}
}) =>
  require('../src/modules/labs/labOrder.model').LabOrder.create({
    clinicId,
    consultationId,
    patientId,
    doctorId,
    appointmentId,
    orderNumber: `LAB-20260410-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`,
    tests: [
      {
        code: 'CBC',
        name: 'Complete Blood Count',
        category: 'Hematology',
        specimenType: 'Blood'
      }
    ],
    status: 'completed',
    orderedAt: new Date('2026-04-10T10:30:00.000Z'),
    createdBy,
    updatedBy: createdBy,
    ...overrides
  });

beforeAll(() => {
  app = require('../src/app');
});

describe('Dashboard analytics module', () => {
  it('returns overview, appointments, revenue, patients, labs, pharmacy, notifications, no-show, workload, and activity feed', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const receptionist = await createUserWithClinic({
      role: ROLES.RECEPTIONIST,
      clinicId: admin.clinic._id
    });
    const doctorUser = await createUserWithClinic({
      role: ROLES.DOCTOR,
      clinicId: admin.clinic._id
    });
    const doctorProfile = await createDoctorRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id,
      userId: doctorUser.user._id
    });
    const patientOne = await createPatientRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id,
      overrides: {
        createdAt: new Date('2026-04-05T09:00:00.000Z'),
        updatedAt: new Date('2026-04-05T09:00:00.000Z'),
        gender: 'female'
      }
    });
    const patientTwo = await createPatientRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id,
      overrides: {
        createdAt: new Date('2026-03-25T09:00:00.000Z'),
        updatedAt: new Date('2026-03-25T09:00:00.000Z'),
        gender: 'male'
      }
    });
    const completedAppointment = await createAppointmentRecord({
      clinicId: admin.clinic._id,
      patientId: patientOne._id,
      doctorId: doctorProfile._id,
      createdBy: admin.user._id,
      overrides: {
        appointmentDate: new Date('2026-04-10T00:00:00.000Z'),
        status: 'completed'
      }
    });
    await createAppointmentRecord({
      clinicId: admin.clinic._id,
      patientId: patientTwo._id,
      doctorId: doctorProfile._id,
      createdBy: admin.user._id,
      overrides: {
        appointmentDate: new Date('2026-04-11T00:00:00.000Z'),
        status: 'no_show'
      }
    });
    await createAppointmentRecord({
      clinicId: admin.clinic._id,
      patientId: patientTwo._id,
      doctorId: doctorProfile._id,
      createdBy: admin.user._id,
      overrides: {
        appointmentDate: new Date('2026-04-12T00:00:00.000Z'),
        status: 'booked',
        appointmentType: 'walk_in'
      }
    });
    const consultation = await createConsultationRecord({
      clinicId: admin.clinic._id,
      patientId: patientOne._id,
      doctorId: doctorProfile._id,
      appointmentId: completedAppointment._id,
      createdBy: doctorUser.user._id,
      overrides: {
        createdAt: new Date('2026-04-10T10:00:00.000Z'),
        updatedAt: new Date('2026-04-10T10:30:00.000Z')
      }
    });
    const prescription = await createPrescriptionRecord({
      clinicId: admin.clinic._id,
      patientId: patientOne._id,
      doctorId: doctorProfile._id,
      consultationId: consultation._id,
      appointmentId: completedAppointment._id,
      createdBy: doctorUser.user._id,
      overrides: {
        createdAt: new Date('2026-04-10T10:35:00.000Z'),
        updatedAt: new Date('2026-04-10T10:35:00.000Z'),
        followUpDate: new Date('2026-04-20T00:00:00.000Z')
      }
    });
    await createInvoiceRecord({
      clinicId: admin.clinic._id,
      patientId: patientOne._id,
      appointmentId: completedAppointment._id,
      consultationId: consultation._id,
      createdBy: admin.user._id,
      overrides: {
        createdAt: new Date('2026-04-10T12:00:00.000Z'),
        updatedAt: new Date('2026-04-10T12:00:00.000Z')
      }
    });
    const labOrder = await createLabOrderRecord({
      clinicId: admin.clinic._id,
      consultationId: consultation._id,
      patientId: patientOne._id,
      doctorId: doctorProfile._id,
      appointmentId: completedAppointment._id,
      createdBy: doctorUser.user._id,
      overrides: {
        createdAt: new Date('2026-04-10T10:40:00.000Z'),
        updatedAt: new Date('2026-04-10T10:40:00.000Z')
      }
    });
    await require('../src/modules/labs/labReport.model').create({
      clinicId: admin.clinic._id,
      labOrderId: labOrder._id,
      patientId: patientOne._id,
      consultationId: consultation._id,
      resultEntries: [
        {
          code: 'HB',
          name: 'Hemoglobin',
          value: '10.2',
          numericValue: 10.2,
          normalRange: { min: 12, max: 16 },
          isAbnormal: true,
          abnormalFlag: 'low'
        }
      ],
      status: 'finalized',
      reviewedAt: new Date('2026-04-10T15:00:00.000Z'),
      createdBy: admin.user._id,
      updatedBy: admin.user._id,
      createdAt: new Date('2026-04-10T15:00:00.000Z'),
      updatedAt: new Date('2026-04-10T15:00:00.000Z')
    });
    const medicine = await require('../src/modules/pharmacy/medicine.model').create({
      clinicId: admin.clinic._id,
      code: 'PCM500',
      name: 'Paracetamol 500',
      genericName: 'Paracetamol',
      category: 'Analgesic',
      reorderLevel: 10,
      batches: [
        {
          batchNumber: 'PCM-LOW',
          quantity: 6,
          expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          sellingPrice: 2.5
        }
      ],
      createdBy: admin.user._id,
      updatedBy: admin.user._id
    });
    const dispensing = await require('../src/modules/pharmacy/dispensingRecord.model').create({
      clinicId: admin.clinic._id,
      prescriptionId: prescription._id,
      patientId: patientOne._id,
      doctorId: doctorProfile._id,
      dispensedBy: admin.user._id,
      items: [
        {
          medicineId: medicine._id,
          medicineName: 'Paracetamol 500',
          batchNumber: 'PCM-LOW',
          quantity: 4,
          unitPrice: 2.5,
          totalPrice: 10
        }
      ],
      subtotal: 10,
      status: 'dispensed',
      dispensedAt: new Date('2026-04-10T16:00:00.000Z'),
      createdAt: new Date('2026-04-10T16:00:00.000Z'),
      updatedAt: new Date('2026-04-10T16:00:00.000Z')
    });
    await require('../src/modules/pharmacy/pharmacySale.model').create({
      clinicId: admin.clinic._id,
      dispensingRecordId: dispensing._id,
      patientId: patientOne._id,
      amount: 10,
      paymentStatus: 'paid',
      createdBy: admin.user._id,
      updatedBy: admin.user._id,
      createdAt: new Date('2026-04-10T16:05:00.000Z'),
      updatedAt: new Date('2026-04-10T16:05:00.000Z')
    });
    await require('../src/modules/notifications/notificationLog.model').create({
      clinicId: admin.clinic._id,
      patientId: patientOne._id,
      appointmentId: completedAppointment._id,
      type: 'appointment_reminder',
      channel: 'mock',
      recipient: {
        name: patientOne.fullName,
        phone: patientOne.phone
      },
      subject: 'Appointment reminder',
      body: 'Your appointment is tomorrow.',
      status: 'sent',
      provider: 'mock',
      sentAt: new Date('2026-04-09T09:00:00.000Z'),
      createdBy: receptionist.user._id,
      updatedBy: receptionist.user._id,
      createdAt: new Date('2026-04-09T09:00:00.000Z'),
      updatedAt: new Date('2026-04-09T09:00:00.000Z')
    });
    await require('../src/modules/notifications/notificationLog.model').create({
      clinicId: admin.clinic._id,
      patientId: patientOne._id,
      consultationId: consultation._id,
      type: 'follow_up',
      channel: 'mock',
      recipient: {
        name: patientOne.fullName,
        phone: patientOne.phone
      },
      subject: 'Follow-up pending',
      body: 'Review after 7 days.',
      status: 'pending',
      provider: 'mock',
      scheduledFor: new Date('2026-04-20T09:00:00.000Z'),
      createdBy: doctorUser.user._id,
      updatedBy: doctorUser.user._id,
      createdAt: new Date('2026-04-13T09:00:00.000Z'),
      updatedAt: new Date('2026-04-13T09:00:00.000Z')
    });
    await require('../src/modules/notifications/followUpTask.model').create({
      clinicId: admin.clinic._id,
      patientId: patientOne._id,
      consultationId: consultation._id,
      doctorId: doctorProfile._id,
      title: 'Review after 7 days',
      dueDate: new Date('2026-04-20T00:00:00.000Z'),
      type: 'follow_up_visit',
      status: 'pending',
      createdBy: doctorUser.user._id,
      updatedBy: doctorUser.user._id,
      createdAt: new Date('2026-04-13T09:00:00.000Z'),
      updatedAt: new Date('2026-04-13T09:00:00.000Z')
    });

    const rangeQuery = {
      from: '2026-04-01',
      to: '2026-04-30'
    };

    const [
      overviewResponse,
      appointmentsResponse,
      revenueResponse,
      patientsResponse,
      labsResponse,
      pharmacyResponse,
      notificationsResponse,
      noShowResponse,
      workloadResponse,
      activityResponse
    ] = await Promise.all([
      request(app).get('/api/v1/dashboard/overview').set(getAuthHeaders(admin.token)).query(rangeQuery),
      request(app).get('/api/v1/dashboard/appointments').set(getAuthHeaders(admin.token)).query(rangeQuery),
      request(app).get('/api/v1/dashboard/revenue').set(getAuthHeaders(admin.token)).query(rangeQuery),
      request(app).get('/api/v1/dashboard/patients').set(getAuthHeaders(admin.token)).query(rangeQuery),
      request(app).get('/api/v1/dashboard/labs').set(getAuthHeaders(admin.token)).query(rangeQuery),
      request(app).get('/api/v1/dashboard/pharmacy').set(getAuthHeaders(admin.token)).query(rangeQuery),
      request(app).get('/api/v1/dashboard/notifications').set(getAuthHeaders(admin.token)).query(rangeQuery),
      request(app).get('/api/v1/dashboard/no-show').set(getAuthHeaders(receptionist.token)).query(rangeQuery),
      request(app).get('/api/v1/dashboard/doctor-workload').set(getAuthHeaders(admin.token)).query(rangeQuery),
      request(app).get('/api/v1/dashboard/activity-feed').set(getAuthHeaders(receptionist.token)).query({ limit: 10 })
    ]);

    expect(overviewResponse.status).toBe(200);
    expect(overviewResponse.body.data.cards.totalPatients).toBe(2);
    expect(overviewResponse.body.data.cards.newPatients).toBe(1);
    expect(overviewResponse.body.data.cards.pendingAppointments).toBe(1);
    expect(overviewResponse.body.data.cards.completedConsultations).toBe(1);
    expect(overviewResponse.body.data.cards.pendingInvoices).toBe(1);
    expect(overviewResponse.body.data.cards.lowStockMedicines).toBe(1);

    expect(appointmentsResponse.status).toBe(200);
    expect(appointmentsResponse.body.data.total).toBe(3);
    expect(appointmentsResponse.body.data.completed).toBe(1);
    expect(appointmentsResponse.body.data.noShow).toBe(1);
    expect(appointmentsResponse.body.data.walkInCount).toBe(1);
    expect(appointmentsResponse.body.data.byDoctor).toHaveLength(1);

    expect(revenueResponse.status).toBe(200);
    expect(revenueResponse.body.data.invoiceRevenue).toBe(500);
    expect(revenueResponse.body.data.pharmacyRevenue).toBe(10);
    expect(revenueResponse.body.data.totalRevenue).toBe(510);
    expect(revenueResponse.body.data.paidAmount).toBe(310);
    expect(revenueResponse.body.data.unpaidAmount).toBe(200);

    expect(patientsResponse.status).toBe(200);
    expect(patientsResponse.body.data.totalPatients).toBe(2);
    expect(patientsResponse.body.data.newPatients).toBe(1);
    expect(patientsResponse.body.data.activePatients).toBeGreaterThanOrEqual(1);
    expect(patientsResponse.body.data.byGender.some((row) => row.gender === 'female')).toBe(true);

    expect(labsResponse.status).toBe(200);
    expect(labsResponse.body.data.totalOrders).toBe(1);
    expect(labsResponse.body.data.completedOrders).toBe(1);
    expect(labsResponse.body.data.abnormalReports).toBe(1);

    expect(pharmacyResponse.status).toBe(200);
    expect(pharmacyResponse.body.data.totalMedicines).toBe(1);
    expect(pharmacyResponse.body.data.lowStockMedicines).toBe(1);
    expect(pharmacyResponse.body.data.nearExpiryMedicines).toBe(1);
    expect(pharmacyResponse.body.data.totalDispensings).toBe(1);
    expect(pharmacyResponse.body.data.totalPharmacySales).toBe(10);

    expect(notificationsResponse.status).toBe(200);
    expect(notificationsResponse.body.data.totalNotifications).toBe(2);
    expect(notificationsResponse.body.data.sentNotifications).toBe(1);
    expect(notificationsResponse.body.data.pendingNotifications).toBe(1);
    expect(notificationsResponse.body.data.pendingFollowUps).toBe(1);

    expect(noShowResponse.status).toBe(200);
    expect(noShowResponse.body.data.totalAppointments).toBe(3);
    expect(noShowResponse.body.data.noShowCount).toBe(1);
    expect(noShowResponse.body.data.noShowRate).toBeCloseTo(33.33, 2);

    expect(workloadResponse.status).toBe(200);
    expect(workloadResponse.body.data.doctors[0].appointments).toBe(3);
    expect(workloadResponse.body.data.doctors[0].consultations).toBe(1);
    expect(workloadResponse.body.data.doctors[0].prescriptions).toBe(1);

    expect(activityResponse.status).toBe(200);
    expect(activityResponse.body.data.length).toBeGreaterThan(0);
    expect(activityResponse.body.data.some((item) => item.type === 'notification_sent')).toBe(true);
  });

  it('scopes doctor dashboard analytics to the linked doctor profile', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const doctorUser = await createUserWithClinic({
      role: ROLES.DOCTOR,
      clinicId: admin.clinic._id
    });
    const doctorProfile = await createDoctorRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id,
      userId: doctorUser.user._id
    });
    const otherDoctor = await createDoctorRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id
    });
    const patient = await createPatientRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id
    });

    await createAppointmentRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: doctorProfile._id,
      createdBy: admin.user._id,
      overrides: {
        appointmentDate: new Date('2026-04-15T00:00:00.000Z'),
        status: 'completed'
      }
    });
    await createAppointmentRecord({
      clinicId: admin.clinic._id,
      patientId: patient._id,
      doctorId: otherDoctor._id,
      createdBy: admin.user._id,
      overrides: {
        appointmentDate: new Date('2026-04-16T00:00:00.000Z'),
        status: 'completed'
      }
    });

    const response = await request(app)
      .get('/api/v1/dashboard/appointments')
      .set(getAuthHeaders(doctorUser.token))
      .query({
        from: '2026-04-01',
        to: '2026-04-30'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.byDoctor).toHaveLength(1);
    expect(response.body.data.byDoctor[0].doctorId).toBe(String(doctorProfile._id));
  });

  it('enforces clinic scoping for dashboard endpoints', async () => {
    const clinicOneAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
    const clinicTwoAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({
      clinicId: clinicOneAdmin.clinic._id,
      createdBy: clinicOneAdmin.user._id
    });

    await createAppointmentRecord({
      clinicId: clinicOneAdmin.clinic._id,
      patientId: patient._id,
      doctorId: new mongoose.Types.ObjectId(),
      createdBy: clinicOneAdmin.user._id,
      overrides: {
        appointmentDate: new Date('2026-04-10T00:00:00.000Z'),
        status: 'completed'
      }
    });

    const response = await request(app)
      .get('/api/v1/dashboard/overview')
      .set(getAuthHeaders(clinicTwoAdmin.token))
      .query({
        from: '2026-04-01',
        to: '2026-04-30'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.cards.totalPatients).toBe(0);
  });

  it('returns safe empty-state analytics for sparse clinics', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });

    const response = await request(app)
      .get('/api/v1/dashboard/notifications')
      .set(getAuthHeaders(admin.token))
      .query({
        from: '2026-04-01',
        to: '2026-04-30'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.totalNotifications).toBe(0);
    expect(response.body.data.sentNotifications).toBe(0);
    expect(response.body.data.pendingFollowUps).toBe(0);
    expect(response.body.data.byType).toEqual([]);
    expect(response.body.data.byChannel).toEqual([]);
  });
});
