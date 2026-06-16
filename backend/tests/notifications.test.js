const request = require('supertest');

const { ROLES } = require('../src/common/constants/roles');
const { DAY_NAMES, formatDate, normalizeDate } = require('../src/common/utils/slotUtils');
const { renderNotificationTemplate } = require('../src/modules/notifications/notification.service');
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

const buildFutureIsoString = (daysAhead = 2) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  date.setUTCHours(9, 0, 0, 0);
  return date.toISOString();
};

beforeAll(() => {
  app = require('../src/app');
});

describe('Notifications module', () => {
  it('creates a notification template', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });

    const response = await request(app)
      .post('/api/v1/notifications/templates')
      .set(getAuthHeaders(admin.token))
      .send({
        name: 'Appointment Reminder Default',
        type: 'appointment_reminder',
        channel: 'mock',
        subject: 'Appointment Reminder',
        body: 'Hello {{patientName}}, your appointment is on {{appointmentDate}} at {{appointmentTime}}.',
        variables: ['patientName', 'appointmentDate', 'appointmentTime']
      });

    expect(response.status).toBe(201);
    expect(response.body.data.notificationTemplate.name).toBe('Appointment Reminder Default');
    expect(response.body.data.notificationTemplate.type).toBe('appointment_reminder');
  });

  it('renders template variables safely', () => {
    const rendered = renderNotificationTemplate('Hello {{patientName}} {{missingValue}}', {
      patientName: 'Asha'
    });

    expect(rendered).toBe('Hello Asha ');
  });

  it('sends an immediate mock notification', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id
    });

    const response = await request(app)
      .post('/api/v1/notifications/send')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        type: 'custom',
        channel: 'mock',
        subject: 'Custom update',
        body: 'Hello {{patientName}}, please contact the clinic.'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.notificationLog.status).toBe('sent');
    expect(response.body.data.notificationLog.recipient.name).toBe(patient.fullName);
  });

  it('schedules and cancels a pending notification', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id
    });

    const scheduled = await request(app)
      .post('/api/v1/notifications/send')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        type: 'custom',
        channel: 'mock',
        subject: 'Scheduled update',
        body: 'Please contact the clinic later today.',
        scheduledFor: buildFutureIsoString(5)
      });

    expect(scheduled.status).toBe(201);
    expect(scheduled.body.data.notificationLog.status).toBe('pending');

    const cancelResponse = await request(app)
      .patch(`/api/v1/notifications/logs/${scheduled.body.data.notificationLog._id}/cancel`)
      .set(getAuthHeaders(admin.token))
      .send({});

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.data.notificationLog.status).toBe('cancelled');
  });

  it('creates a follow-up task with a pending notification log', async () => {
    const doctorUser = await createUserWithClinic({ role: ROLES.DOCTOR });
    const doctorProfile = await createDoctorRecord({
      clinicId: doctorUser.clinic._id,
      createdBy: doctorUser.user._id,
      userId: doctorUser.user._id
    });
    const patient = await createPatientRecord({
      clinicId: doctorUser.clinic._id,
      createdBy: doctorUser.user._id
    });

    const response = await request(app)
      .post('/api/v1/notifications/follow-up')
      .set(getAuthHeaders(doctorUser.token))
      .send({
        patientId: patient._id,
        doctorId: doctorProfile._id,
        title: 'Review after 7 days',
        description: 'Follow up for symptom improvement',
        dueDate: buildFutureIsoString(7).slice(0, 10),
        channel: 'mock'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.followUpTask.status).toBe('pending');
    expect(response.body.data.notificationLog.status).toBe('pending');
  });

  it('updates follow-up task status', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id
    });

    const created = await request(app)
      .post('/api/v1/notifications/follow-up')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        title: 'Medication review',
        description: 'Check response to medication',
        dueDate: buildFutureIsoString(4).slice(0, 10),
        type: 'medication_review',
        channel: 'mock'
      });

    const response = await request(app)
      .patch(`/api/v1/follow-ups/${created.body.data.followUpTask._id}/status`)
      .set(getAuthHeaders(admin.token))
      .send({
        status: 'completed'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.followUpTask.status).toBe('completed');
  });

  it('returns patient notification history', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id
    });

    await request(app)
      .post('/api/v1/notifications/send')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        type: 'custom',
        channel: 'mock',
        subject: 'History update',
        body: 'Please review your latest clinic update.'
      });

    await request(app)
      .post('/api/v1/notifications/follow-up')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        title: 'Lab review',
        description: 'Review recent lab reports',
        dueDate: buildFutureIsoString(6).slice(0, 10),
        type: 'lab_review',
        channel: 'mock'
      });

    const response = await request(app)
      .get(`/api/v1/patients/${patient._id}/notifications`)
      .set(getAuthHeaders(admin.token));

    expect(response.status).toBe(200);
    expect(response.body.data.notificationLogs.length).toBeGreaterThanOrEqual(2);
    expect(response.body.data.followUpTasks).toHaveLength(1);
  });

  it('keeps patient notification history clinic scoped', async () => {
    const clinicAAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
    const clinicBAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
    const patient = await createPatientRecord({
      clinicId: clinicAAdmin.clinic._id,
      createdBy: clinicAAdmin.user._id
    });

    await request(app)
      .post('/api/v1/notifications/send')
      .set(getAuthHeaders(clinicAAdmin.token))
      .send({
        patientId: patient._id,
        type: 'custom',
        channel: 'mock',
        subject: 'Scoped update',
        body: 'Clinic A only.'
      });

    const response = await request(app)
      .get(`/api/v1/patients/${patient._id}/notifications`)
      .set(getAuthHeaders(clinicBAdmin.token));

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Patient not found.');
  });

  it('creates an appointment reminder intent when booking an appointment', async () => {
    const admin = await createUserWithClinic({ role: ROLES.ADMIN });
    const schedule = buildFutureSchedule(8);
    const patient = await createPatientRecord({
      clinicId: admin.clinic._id,
      createdBy: admin.user._id
    });
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

    const appointmentResponse = await request(app)
      .post('/api/v1/appointments')
      .set(getAuthHeaders(admin.token))
      .send({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: schedule.date,
        startTime: '10:00',
        durationMinutes: 30,
        appointmentType: 'scheduled',
        reasonForVisit: 'Reminder coverage'
      });

    expect(appointmentResponse.status).toBe(201);

    const logsResponse = await request(app)
      .get('/api/v1/notifications/logs')
      .set(getAuthHeaders(admin.token))
      .query({
        type: 'appointment_reminder'
      });

    expect(logsResponse.status).toBe(200);
    expect(logsResponse.body.data.notificationLogs.some((log) => log.appointmentId?._id === appointmentResponse.body.data.appointment._id)).toBe(true);
    expect(logsResponse.body.data.notificationLogs.some((log) => log.status === 'pending')).toBe(true);
  });
});
