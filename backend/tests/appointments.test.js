const request = require('supertest');

const { APPOINTMENT_STATUSES } = require('../src/common/constants/appointmentStatus');
const { ROLES } = require('../src/common/constants/roles');
const { DAY_NAMES, formatDate, normalizeDate } = require('../src/common/utils/slotUtils');
const {
  createUserWithClinic,
  createPatientRecord,
  createDoctorRecord,
  getAuthHeaders
} = require('./helpers/phase3.helper');

let app;

const buildFutureSchedule = (daysAhead = 3) => {
  const targetDate = new Date();
  targetDate.setUTCDate(targetDate.getUTCDate() + daysAhead);
  const normalized = normalizeDate(targetDate);

  return {
    date: formatDate(normalized),
    dayOfWeek: DAY_NAMES[normalized.getUTCDay()]
  };
};

beforeAll(() => {
  app = require('../src/app');
});

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('Appointments module', () => {
  it('creates appointment successfully', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const aiService = require('../src/modules/ai/ai.service');
    jest.spyOn(aiService, 'noShow').mockResolvedValue({
      success: true,
      message: 'No-show risk generated successfully',
      data: {
        risk_score: 0.74,
        risk_level: 'high',
        reason_codes: ['HIGH_PREVIOUS_NO_SHOWS'],
        reasons: ['Patient has multiple previous no-shows.'],
        recommended_action: 'Call patient, confirm attendance, and consider controlled overbooking only if clinic policy allows.',
        confidence: 0.81,
        model_name: 'xgboost_no_show',
        model_version: 'phase-20-test',
        model_status: 'available',
        requires_staff_review: true,
        audit_id: 'audit-001'
      }
    });
    const schedule = buildFutureSchedule();
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id,
      availability: [
        {
          dayOfWeek: schedule.dayOfWeek,
          isAvailable: true,
          startTime: '09:00',
          endTime: '12:00',
          slotDurationMinutes: 30
        }
      ]
    });

    const response = await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: schedule.date,
        startTime: '10:00',
        durationMinutes: 30,
        appointmentType: 'scheduled',
        reasonForVisit: 'Fever'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.appointment.status).toBe(APPOINTMENT_STATUSES.BOOKED);
    expect(response.body.data.appointment.endTime).toBe('10:30');
    expect(response.body.data.appointment.noShowRisk.level).toBe('high');
    expect(response.body.data.appointment.noShowRisk.modelStatus).toBe('available');
    expect(response.body.data.appointment.noShowRisk.auditId).toBe('audit-001');
  });

  it('rejects overlapping appointment for same doctor', async () => {
    const receptionist = await createUserWithClinic({ role: ROLES.RECEPTIONIST });
    const schedule = buildFutureSchedule(4);
    const patient = await createPatientRecord({ clinicId: receptionist.clinic._id, createdBy: receptionist.user._id });
    const otherPatient = await createPatientRecord({ clinicId: receptionist.clinic._id, createdBy: receptionist.user._id });
    const doctor = await createDoctorRecord({
      clinicId: receptionist.clinic._id,
      createdBy: receptionist.user._id,
      availability: [
        {
          dayOfWeek: schedule.dayOfWeek,
          isAvailable: true,
          startTime: '09:00',
          endTime: '13:00',
          slotDurationMinutes: 30
        }
      ]
    });

    await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(receptionist.token))
      .send({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: schedule.date,
        startTime: '10:00',
        durationMinutes: 30
      });

    const response = await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(receptionist.token))
      .send({
        patientId: otherPatient._id,
        doctorId: doctor._id,
        appointmentDate: schedule.date,
        startTime: '10:15',
        durationMinutes: 30
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Selected slot overlaps with an existing appointment.');
  });

  it('allows same time for different doctors', async () => {
    const receptionist = await createUserWithClinic({ role: ROLES.RECEPTIONIST });
    const schedule = buildFutureSchedule(5);
    const patient = await createPatientRecord({ clinicId: receptionist.clinic._id, createdBy: receptionist.user._id });
    const otherPatient = await createPatientRecord({ clinicId: receptionist.clinic._id, createdBy: receptionist.user._id });
    const availability = [
      {
        dayOfWeek: schedule.dayOfWeek,
        isAvailable: true,
        startTime: '09:00',
        endTime: '13:00',
        slotDurationMinutes: 30
      }
    ];
    const doctorA = await createDoctorRecord({
      clinicId: receptionist.clinic._id,
      createdBy: receptionist.user._id,
      availability
    });
    const doctorB = await createDoctorRecord({
      clinicId: receptionist.clinic._id,
      createdBy: receptionist.user._id,
      availability
    });

    const first = await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(receptionist.token))
      .send({
        patientId: patient._id,
        doctorId: doctorA._id,
        appointmentDate: schedule.date,
        startTime: '11:00',
        durationMinutes: 30
      });

    const second = await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(receptionist.token))
      .send({
        patientId: otherPatient._id,
        doctorId: doctorB._id,
        appointmentDate: schedule.date,
        startTime: '11:00',
        durationMinutes: 30
      });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
  });

  it('rejects invalid time format', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const schedule = buildFutureSchedule(6);
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id,
      availability: [
        {
          dayOfWeek: schedule.dayOfWeek,
          isAvailable: true,
          startTime: '09:00',
          endTime: '17:00',
          slotDurationMinutes: 30
        }
      ]
    });

    const response = await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: schedule.date,
        startTime: '25:99',
        durationMinutes: 30
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('lists appointments with filters', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const schedule = buildFutureSchedule(7);
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id,
      availability: [
        {
          dayOfWeek: schedule.dayOfWeek,
          isAvailable: true,
          startTime: '09:00',
          endTime: '17:00',
          slotDurationMinutes: 30
        }
      ]
    });

    await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: schedule.date,
        startTime: '09:00',
        durationMinutes: 30
      });

    const response = await request(app)
      .get('/api/v1/appointments')
      .set(getAuthHeaders(admin.token))
      .query({ date: schedule.date, doctorId: String(doctor._id), status: APPOINTMENT_STATUSES.BOOKED });

    expect(response.status).toBe(200);
    expect(response.body.data.appointments).toHaveLength(1);
    expect(response.body.data.pagination.total).toBe(1);
  });

  it('fetches available slots with booked and blocked states', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const doctorUser = await createUserWithClinic({
      role: ROLES.DOCTOR,
      clinicId: admin.clinic._id
    });
    const schedule = buildFutureSchedule(8);
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id,
      userId: doctorUser.user._id,
      availability: [
        {
          dayOfWeek: schedule.dayOfWeek,
          isAvailable: true,
          startTime: '09:00',
          endTime: '11:00',
          slotDurationMinutes: 30
        }
      ]
    });

    await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: schedule.date,
        startTime: '09:30',
        durationMinutes: 30
      });

    await request(app)
      .post(`/api/v1/doctors/${doctor._id}/blocked-slots`)
      .set(getAuthHeaders(doctorUser.token))
      .send({
        date: schedule.date,
        startTime: '10:30',
        endTime: '11:00',
        reason: 'Emergency meeting'
      });

    const response = await request(app)
      .get('/api/v1/appointments/available-slots')
      .set(getAuthHeaders(admin.token))
      .query({
        doctorId: String(doctor._id),
        date: schedule.date,
        durationMinutes: 30
      });

    expect(response.status).toBe(200);
    expect(response.body.data.slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ startTime: '09:00', available: true }),
        expect.objectContaining({ startTime: '09:30', available: false, reason: 'Booked' }),
        expect.objectContaining({ startTime: '10:30', available: false, reason: 'Emergency meeting' })
      ])
    );
  });

  it('updates status with a valid transition', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const schedule = buildFutureSchedule(9);
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id,
      availability: [
        {
          dayOfWeek: schedule.dayOfWeek,
          isAvailable: true,
          startTime: '09:00',
          endTime: '12:00',
          slotDurationMinutes: 30
        }
      ]
    });

    const createResponse = await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: schedule.date,
        startTime: '10:00',
        durationMinutes: 30
      });

    const response = await request(app)
      .patch(`/api/v1/appointments/${createResponse.body.data.appointment._id}/status`)
      .set(getAuthHeaders(admin.token))
      .send({
        status: APPOINTMENT_STATUSES.CONFIRMED,
        note: 'Confirmed by phone'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.appointment.status).toBe(APPOINTMENT_STATUSES.CONFIRMED);
  });

  it('rejects invalid status transition', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const schedule = buildFutureSchedule(10);
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id,
      availability: [
        {
          dayOfWeek: schedule.dayOfWeek,
          isAvailable: true,
          startTime: '09:00',
          endTime: '12:00',
          slotDurationMinutes: 30
        }
      ]
    });

    const createResponse = await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: schedule.date,
        startTime: '10:00',
        durationMinutes: 30
      });

    const response = await request(app)
      .patch(`/api/v1/appointments/${createResponse.body.data.appointment._id}/status`)
      .set(getAuthHeaders(admin.token))
      .send({
        status: APPOINTMENT_STATUSES.COMPLETED
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid appointment status transition.');
  });

  it('cancels appointment without deleting it', async () => {
    const receptionist = await createUserWithClinic({ role: ROLES.RECEPTIONIST });
    const schedule = buildFutureSchedule(11);
    const patient = await createPatientRecord({ clinicId: receptionist.clinic._id, createdBy: receptionist.user._id });
    const doctor = await createDoctorRecord({
      clinicId: receptionist.clinic._id,
      createdBy: receptionist.user._id,
      availability: [
        {
          dayOfWeek: schedule.dayOfWeek,
          isAvailable: true,
          startTime: '09:00',
          endTime: '12:00',
          slotDurationMinutes: 30
        }
      ]
    });

    const createResponse = await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(receptionist.token))
      .send({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: schedule.date,
        startTime: '10:00',
        durationMinutes: 30
      });

    const response = await request(app)
      .patch(`/api/v1/appointments/${createResponse.body.data.appointment._id}/cancel`)
      .set(getAuthHeaders(receptionist.token))
      .send({
        cancellationReason: 'Patient requested cancellation'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.appointment.status).toBe(APPOINTMENT_STATUSES.CANCELLED);

    const getResponse = await request(app)
      .get(`/api/v1/appointments/${createResponse.body.data.appointment._id}`)
      .set(getAuthHeaders(receptionist.token));

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.appointment.status).toBe(APPOINTMENT_STATUSES.CANCELLED);
  });

  it('reschedules appointment and rejects conflicting reschedule', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const schedule = buildFutureSchedule(12);
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const otherPatient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id,
      availability: [
        {
          dayOfWeek: schedule.dayOfWeek,
          isAvailable: true,
          startTime: '09:00',
          endTime: '13:00',
          slotDurationMinutes: 30
        }
      ]
    });

    const original = await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: schedule.date,
        startTime: '09:00',
        durationMinutes: 30
      });

    await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: otherPatient._id,
        doctorId: doctor._id,
        appointmentDate: schedule.date,
        startTime: '10:00',
        durationMinutes: 30
      });

    const conflictResponse = await request(app)
      .patch(`/api/v1/appointments/${original.body.data.appointment._id}/reschedule`)
      .set(getAuthHeaders(admin.token))
      .send({
        appointmentDate: schedule.date,
        startTime: '10:00',
        durationMinutes: 30,
        reason: 'Doctor requested shift'
      });

    expect(conflictResponse.status).toBe(409);

    const rescheduleResponse = await request(app)
      .patch(`/api/v1/appointments/${original.body.data.appointment._id}/reschedule`)
      .set(getAuthHeaders(admin.token))
      .send({
        appointmentDate: schedule.date,
        startTime: '11:00',
        durationMinutes: 30,
        reason: 'Doctor requested shift'
      });

    expect(rescheduleResponse.status).toBe(200);
    expect(rescheduleResponse.body.data.appointment.rescheduledFrom).toBeTruthy();

    const originalAfter = await request(app)
      .get(`/api/v1/appointments/${original.body.data.appointment._id}`)
      .set(getAuthHeaders(admin.token));

    expect(originalAfter.body.data.appointment.status).toBe(APPOINTMENT_STATUSES.RESCHEDULED);
  });

  it('creates appointment successfully outside availability when isEarlyBooking is true', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const schedule = buildFutureSchedule(13);
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id,
      availability: [
        {
          dayOfWeek: schedule.dayOfWeek,
          isAvailable: true,
          startTime: '10:00',
          endTime: '12:00',
          slotDurationMinutes: 30
        }
      ]
    });

    const response = await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: schedule.date,
        startTime: '09:00',
        durationMinutes: 30,
        appointmentType: 'scheduled',
        isEarlyBooking: true,
        earlyBookingReason: 'doctor_request'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.appointment.isEarlyBooking).toBe(true);
    expect(response.body.data.appointment.earlyBookingReason).toBe('doctor_request');
  });

  it('rejects appointment creation outside availability when isEarlyBooking is false', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const schedule = buildFutureSchedule(14);
    const patient = await createPatientRecord({ clinicId: admin.clinic._id, createdBy: admin.user._id });
    const doctor = await createDoctorRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id,
      availability: [
        {
          dayOfWeek: schedule.dayOfWeek,
          isAvailable: true,
          startTime: '10:00',
          endTime: '12:00',
          slotDurationMinutes: 30
        }
      ]
    });

    const response = await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: schedule.date,
        startTime: '09:00',
        durationMinutes: 30,
        appointmentType: 'scheduled',
        isEarlyBooking: false
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Selected slot is outside doctor availability.');
  });
});
