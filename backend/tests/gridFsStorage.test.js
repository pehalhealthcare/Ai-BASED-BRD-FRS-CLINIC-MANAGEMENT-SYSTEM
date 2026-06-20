const request = require('supertest');
const zlib = require('zlib');

describe('GridFS File Storage & zlib Compression', () => {
  let app;
  let User;
  let Doctor;
  let Clinic;
  let clinic;
  let doctorToken;
  let organizationId;

  // Simple base64 data URIs for testing
  const dummyImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const dummyPdfBase64 = 'data:application/pdf;base64,JVBERi0xLjQKJcFSg4KJVBERi0xLjQKJcFSg4KJVBERi0xLjQKJcFSg4KJVBERi0xLjQKJcFSg4K';

  beforeAll(async () => {
    app = require('../src/app');
    User = require('../src/modules/users/user.model');
    Doctor = require('../src/modules/doctors/doctor.model');
    Clinic = require('../src/modules/clinics/clinic.model');
    const Organization = require('../src/modules/organizations/organization.model');

    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    clinic = await Clinic.create({
      name: `GridFS Test Clinic ${suffix}`,
      code: `CL${suffix}`.slice(-10),
      isActive: true
    });

    const org = await Organization.create({
      name: `GridFS Org ${suffix}`,
      email: `gridfs-org-${suffix}@test.com`,
      phone: '9999999999'
    });
    organizationId = org._id.toString();
  });

  it('registers a doctor user, uploads credentials/photo to GridFS with compression, and resolves base64 on fetch', async () => {
    const mongoose = require('mongoose');

    // 1. Register a doctor
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'GridFS Doctor',
        email: `gridfs-doctor-${Date.now()}@example.com`,
        phone: '8888888888',
        password: 'StrongPass123!',
        role: ROLES = 'DOCTOR'
      });

    expect(registerResponse.status).toBe(201);
    doctorToken = registerResponse.body.data.accessToken;

    // 2. Save draft profile with image and document PDF
    const updateResponse = await request(app)
      .put('/api/v1/doctors/me/profile')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        specialization: 'Cardiology',
        qualification: 'MD',
        medicalRegistrationNumber: 'REG-GRID-99',
        image: dummyImageBase64,
        documentPdf: dummyPdfBase64,
        organizationId
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.doctor.image).toBe(dummyImageBase64);
    expect(updateResponse.body.data.doctor.documentPdf).toBe(dummyPdfBase64);

    // 3. Verify in database that it is actually stored as gridfs: references
    const rawDoctorInDb = await Doctor.findOne({ userId: registerResponse.body.data.user._id });
    expect(rawDoctorInDb.image).toMatch(/^gridfs:[a-f0-9]{24}$/);
    expect(rawDoctorInDb.documentPdf).toMatch(/^gridfs:[a-f0-9]{24}$/);

    // 4. Verify that the files exist in GridFS collection and are compressed
    const fileIdStr = rawDoctorInDb.image.split(':')[1];
    const gridFile = await mongoose.connection.db
      .collection('doctor_files.files')
      .findOne({ _id: new mongoose.Types.ObjectId(fileIdStr) });

    expect(gridFile).toBeTruthy();
    expect(gridFile.metadata.mimeType).toBe('image/png');

    // Retrieve chunks
    const chunks = await mongoose.connection.db
      .collection('doctor_files.chunks')
      .find({ files_id: gridFile._id })
      .toArray();

    expect(chunks.length).toBeGreaterThan(0);
    const compressedBuffer = Buffer.concat(chunks.map((c) => c.data.buffer));

    // Decompress and match raw base64 buffer content
    const decompressed = zlib.gunzipSync(compressedBuffer);
    const rawExpected = Buffer.from(dummyImageBase64.split(',')[1], 'base64');
    expect(decompressed.equals(rawExpected)).toBe(true);

    // 5. Submit profile
    const submitResponse = await request(app)
      .post('/api/v1/doctors/me/submit')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        specialization: 'Cardiology',
        qualification: 'MD',
        medicalRegistrationNumber: 'REG-GRID-99',
        image: dummyImageBase64,
        documentPdf: dummyPdfBase64,
        organizationId
      });

    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.data.doctor.approvalStatus).toBe('pending_approval');

    // 6. Get my profile should transparently resolve file references
    const getResponse = await request(app)
      .get('/api/v1/doctors/me/profile')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.doctor.image).toBe(dummyImageBase64);
    expect(getResponse.body.data.doctor.documentPdf).toBe(dummyPdfBase64);
  });
});
