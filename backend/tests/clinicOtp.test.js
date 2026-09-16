const request = require('supertest');

describe('Clinic Onboarding OTP Flow', () => {
  it('should send verification OTP successfully without logger reference error', async () => {
    const app = require('../src/app');
    const res = await request(app)
      .post('/api/v1/clinics/register/send-otp')
      .send({ email: 'doctor.test.onboarding@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/OTP sent successfully/i);
  });
});
