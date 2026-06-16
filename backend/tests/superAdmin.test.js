const request = require('supertest');
const { ROLES } = require('../src/common/constants/roles');
const { createUserWithClinic, getAuthHeaders } = require('./helpers/phase3.helper');

let app;

beforeAll(() => {
  app = require('../src/app');
});

describe('Super Admin features', () => {
  let superAdmin;
  let normalAdmin;

  beforeEach(async () => {
    superAdmin = await createUserWithClinic({ role: ROLES.SUPER_ADMIN });
    normalAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
  });

  describe('Clinic creation and listing', () => {
    it('allows super admin to create new clinic', async () => {
      const payload = {
        name: 'New Premium Clinic',
        code: 'NPCLINIC',
        phone: '9111111111',
        image: 'base64imageStr',
        address: {
          line1: '123 New Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001'
        }
      };

      const response = await request(app)
        .post('/api/v1/clinics')
        .set(getAuthHeaders(superAdmin.token))
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.clinic.name).toBe(payload.name);
      expect(response.body.data.clinic.code).toBe(payload.code);
      expect(response.body.data.clinic.phone).toBe(payload.phone);
      expect(response.body.data.clinic.image).toBe(payload.image);
    });

    it('allows super admin to create sub-clinic', async () => {
      const Clinic = require('../src/modules/clinics/clinic.model');
      const parentClinic = await Clinic.create({
        name: 'Parent Clinic Group',
        code: 'PARCL'
      });

      const payload = {
        name: 'Sub Clinic East',
        code: 'NPCLINEAST',
        phone: '9222222222',
        parentClinicId: parentClinic._id.toString()
      };

      const response = await request(app)
        .post('/api/v1/clinics')
        .set(getAuthHeaders(superAdmin.token))
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.clinic.parentClinicId).toBe(payload.parentClinicId);
    });

    it('does not allow normal admin or other roles to create clinic', async () => {
      const response = await request(app)
        .post('/api/v1/clinics')
        .set(getAuthHeaders(normalAdmin.token))
        .send({
          name: 'Unauthorized Clinic',
          code: 'UNAUTHCL'
        });

      expect(response.status).toBe(403);
    });

    it('lists all clinics', async () => {
      const response = await request(app)
        .get('/api/v1/clinics')
        .set(getAuthHeaders(superAdmin.token));

      expect(response.status).toBe(200);
      expect(response.body.data.clinics).toBeDefined();
    });
  });

  describe('Doctor approvals and onboarding workflow', () => {
    it('handles the doctor onboarding, draft profile, submission, and approval flow', async () => {
      const User = require('../src/modules/users/user.model');
      const Clinic = require('../src/modules/clinics/clinic.model');
      const Doctor = require('../src/modules/doctors/doctor.model');
      const { generateAccessToken } = require('../src/modules/auth/token.service');

      // 1. Doctor registers (simulated by User creation)
      const suffix = Date.now();
      const pendingUser = await User.create({
        name: 'Dr Onboard Demo',
        email: `onboard-${suffix}@example.com`,
        phone: '9988776655',
        password: 'Pass123!Safe',
        role: ROLES.DOCTOR,
        isActive: true,
        approvalStatus: 'pending_profile'
      });

      const doctorToken = generateAccessToken(pendingUser);

      // Create initial draft doctor doc (as registration hook would do)
      await Doctor.create({
        userId: pendingUser._id,
        firstName: 'Dr Onboard',
        lastName: 'Demo',
        fullName: 'Dr Onboard Demo',
        phone: '9988776655',
        email: pendingUser.email,
        isActive: false,
        approvalStatus: 'pending_profile'
      });

      // 2. Fetch profile draft
      const getProfileRes = await request(app)
        .get('/api/v1/doctors/me/profile')
        .set(getAuthHeaders(doctorToken));
      expect(getProfileRes.status).toBe(200);
      expect(getProfileRes.body.data.doctor.approvalStatus).toBe('pending_profile');

      // 3. Save profile draft
      const draftPayload = {
        specialization: 'Pediatrics',
        qualification: 'MBBS, DCH',
        medicalRegistrationNumber: 'REG-12345',
        experienceYears: 5,
        consultationFee: 600,
        followUpFee: 300,
        isOnlineAvailable: true,
        image: 'photoBase64',
        documentPdf: 'documentPdfBase64'
      };

      const saveDraftRes = await request(app)
        .put('/api/v1/doctors/me/profile')
        .set(getAuthHeaders(doctorToken))
        .send(draftPayload);
      expect(saveDraftRes.status).toBe(200);
      expect(saveDraftRes.body.data.doctor.specialization).toBe('Pediatrics');

      // 4. Submit profile (requires documentPdf)
      const submitRes = await request(app)
        .post('/api/v1/doctors/me/submit')
        .set(getAuthHeaders(doctorToken))
        .send(draftPayload);
      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.doctor.approvalStatus).toBe('pending_approval');

      // Check User and Doctor status in database
      const submittedUserDoc = await User.findById(pendingUser._id);
      expect(submittedUserDoc.approvalStatus).toBe('pending_approval');

      // 5. Super Admin lists pending doctors
      const pendingListRes = await request(app)
        .get('/api/v1/admin/pending-doctors')
        .set(getAuthHeaders(superAdmin.token));
      expect(pendingListRes.status).toBe(200);
      const pendingEmails = pendingListRes.body.data.pendingDoctors.map(d => d.email);
      expect(pendingEmails).toContain(pendingUser.email);

      // Verify that the pending doctor payload contains the profile details
      const targetPending = pendingListRes.body.data.pendingDoctors.find(d => d.email === pendingUser.email);
      expect(targetPending.profile.medicalRegistrationNumber).toBe('REG-12345');

      // 6. Super Admin approves and appoints doctor to clinic
      const targetClinic = await Clinic.create({
        name: 'Approval Target Clinic',
        code: 'APPTARGET'
      });

      const approvalPayload = {
        clinicId: targetClinic._id.toString(),
        specialization: 'Pediatrics',
        qualification: 'MBBS, DCH',
        experienceYears: 5,
        consultationFee: 650,
        availability: [
          {
            dayOfWeek: 'monday',
            isAvailable: true,
            startTime: '09:00',
            endTime: '17:00',
            slotDurationMinutes: 30
          }
        ]
      };

      const approveRes = await request(app)
        .post(`/api/v1/admin/approve-doctor/${pendingUser._id}`)
        .set(getAuthHeaders(superAdmin.token))
        .send(approvalPayload);
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.doctor.approvalStatus).toBe('approved');
      expect(approveRes.body.data.doctor.clinicId).toBe(targetClinic._id.toString());
      expect(approveRes.body.data.doctor.isActive).toBe(true);

      const finalUserDoc = await User.findById(pendingUser._id);
      expect(finalUserDoc.approvalStatus).toBe('approved');
      expect(finalUserDoc.isActive).toBe(true);

      // 7. Approved doctor accepts slot
      const acceptSlotRes = await request(app)
        .post('/api/v1/doctors/me/accept-slot')
        .set(getAuthHeaders(doctorToken));
      expect(acceptSlotRes.status).toBe(200);
      expect(acceptSlotRes.body.data.doctor.hasAcceptedSlot).toBe(true);

      const finalDoctorDoc = await Doctor.findOne({ userId: pendingUser._id });
      expect(finalDoctorDoc.hasAcceptedSlot).toBe(true);
    });

    it('allows super admin to reject doctor registration', async () => {
      const User = require('../src/modules/users/user.model');
      const suffix = Date.now();
      const pendingUser = await User.create({
        name: 'Dr Rejected Onboard',
        email: `rejected-${suffix}@example.com`,
        phone: '9988776611',
        password: 'Pass123!Safe',
        role: ROLES.DOCTOR,
        isActive: true,
        approvalStatus: 'pending_profile'
      });

      const rejectRes = await request(app)
        .post(`/api/v1/admin/reject-doctor/${pendingUser._id}`)
        .set(getAuthHeaders(superAdmin.token));

      expect(rejectRes.status).toBe(200);
      
      const finalUser = await User.findById(pendingUser._id);
      expect(finalUser.approvalStatus).toBe('rejected');
      expect(finalUser.isActive).toBe(false);
    });
  });

  describe('Specializations and Re-edit workflow', () => {
    it('allows super admin to manage specializations', async () => {
      // 1. Create specialization
      const payload = {
        name: 'Neurology',
        description: 'Brain and nervous system'
      };
      const createRes = await request(app)
        .post('/api/v1/specializations')
        .set(getAuthHeaders(superAdmin.token))
        .send(payload);
      expect(createRes.status).toBe(201);
      expect(createRes.body.data.specialization.name).toBe('Neurology');

      // 2. List specializations
      const listRes = await request(app)
        .get('/api/v1/specializations')
        .set(getAuthHeaders(superAdmin.token));
      expect(listRes.status).toBe(200);
      const specNames = listRes.body.data.specializations.map(s => s.name);
      expect(specNames).toContain('Neurology');

      // 3. Delete specialization
      const specId = createRes.body.data.specialization._id;
      const deleteRes = await request(app)
        .delete(`/api/v1/specializations/${specId}`)
        .set(getAuthHeaders(superAdmin.token));
      expect(deleteRes.status).toBe(200);
    });

    it('handles requesting doctor profile re-edit and doctor re-submission', async () => {
      const User = require('../src/modules/users/user.model');
      const Doctor = require('../src/modules/doctors/doctor.model');
      const { generateAccessToken } = require('../src/modules/auth/token.service');

      // 1. Setup pending doctor
      const pendingUser = await User.create({
        name: 'Dr Re-edit Demo',
        email: `reedit-${Date.now()}@example.com`,
        password: 'Pass123!Safe',
        role: ROLES.DOCTOR,
        approvalStatus: 'pending_approval'
      });
      const doctorToken = generateAccessToken(pendingUser);

      await Doctor.create({
        userId: pendingUser._id,
        firstName: 'Dr Re-edit',
        lastName: 'Demo',
        fullName: 'Dr Re-edit Demo',
        phone: '9988776611',
        email: pendingUser.email,
        specialization: 'Cardiology',
        qualification: 'MD',
        medicalRegistrationNumber: 'REG-54321',
        documentPdf: 'pdfBase64',
        approvalStatus: 'pending_approval'
      });

      // 2. Super Admin requests re-edit
      const reEditPayload = {
        reEditFields: { specialization: true, qualification: true },
        reEditComments: 'Please upload valid qualification credentials.'
      };
      const reEditRes = await request(app)
        .post(`/api/v1/admin/doctors/${pendingUser._id}/re-edit`)
        .set(getAuthHeaders(superAdmin.token))
        .send(reEditPayload);

      expect(reEditRes.status).toBe(200);
      
      const userAfter = await User.findById(pendingUser._id);
      expect(userAfter.approvalStatus).toBe('re_edit');
      expect(userAfter.reEditComments).toBe(reEditPayload.reEditComments);
      expect(userAfter.reEditFields.specialization).toBe(true);

      // 3. Doctor submits corrected profile
      const submitPayload = {
        specialization: 'Cardiology',
        qualification: 'MD, DM',
        medicalRegistrationNumber: 'REG-54321',
        experienceYears: 10,
        consultationFee: 1000,
        followUpFee: 500,
        documentPdf: 'newPdfBase64'
      };

      const submitRes = await request(app)
        .post('/api/v1/doctors/me/submit')
        .set(getAuthHeaders(doctorToken))
        .send(submitPayload);

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.doctor.approvalStatus).toBe('pending_approval');
      expect(submitRes.body.data.doctor.reEditComments).toBe('');
    });
  });

  describe('Super Admin dashboard', () => {
    it('returns overall aggregated statistics', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/super-admin/overview')
        .set(getAuthHeaders(superAdmin.token));

      expect(response.status).toBe(200);
      expect(response.body.data.totalClinics).toBeGreaterThan(0);
      expect(response.body.data.totalDoctors).toBeDefined();
      expect(response.body.data.totalRevenue).toBeDefined();
      expect(response.body.data.clinics).toBeDefined();
    });

    it('denies access to non-super admin', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/super-admin/overview')
        .set(getAuthHeaders(normalAdmin.token));

      expect(response.status).toBe(403);
    });
  });
});
