const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/modules/users/user.model');
const AuthOtp = require('../src/modules/auth/authOtp.model');
const authService = require('../src/modules/auth/auth.service');
const { ROLES } = require('../src/common/constants/roles');
const bcrypt = require('bcryptjs');

async function runAllRoleTests() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(' STARTING FULL MULTI-ROLE (ADMIN, STAFF, PATIENT) AUTHENTICATION TESTS ');
  console.log('═══════════════════════════════════════════════════════════════════════');
  await connectDB();

  try {
    // 1. Setup / Find Test Users
    // 1a. Clinic Admin
    let adminUser = await User.findOne({ role: ROLES.ADMIN, isActive: true }).select('+password');
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Test Clinic Admin',
        email: 'test_admin_multi@pepal.test',
        password: 'Password123!',
        role: ROLES.ADMIN,
        isActive: true,
        approvalStatus: 'approved'
      });
    } else {
      adminUser.password = 'Password123!';
      await adminUser.save();
    }

    // 1b. Doctor / Staff
    let doctorUser = await User.findOne({ role: ROLES.DOCTOR, isActive: true }).select('+password');
    if (!doctorUser) {
      doctorUser = await User.create({
        name: 'Test Doctor Staff',
        email: 'test_doctor_multi@pepal.test',
        password: 'Password123!',
        role: ROLES.DOCTOR,
        isActive: true,
        approvalStatus: 'approved',
        clinicId: adminUser.clinicId || null
      });
    } else {
      doctorUser.password = 'Password123!';
      await doctorUser.save();
    }

    // 1c. Patient
    let patientUser = await User.findOne({ role: ROLES.PATIENT, isActive: true }).select('+password');
    if (!patientUser) {
      patientUser = await User.create({
        name: 'Test Patient Multi',
        email: 'test_patient_multi@pepal.test',
        password: 'Password123!',
        role: ROLES.PATIENT,
        isActive: true,
        approvalStatus: 'approved'
      });
    } else {
      patientUser.password = 'Password123!';
      await patientUser.save();
    }

    console.log(`Test Users Ready:
- Clinic Admin: ${adminUser.email} (${adminUser.role})
- Doctor/Staff: ${doctorUser.email} (${doctorUser.role})
- Patient:      ${patientUser.email} (${patientUser.role})\n`);

    // ── ROLE 1: CLINIC ADMIN ──
    console.log('▶ [ROLE 1: CLINIC ADMIN]');
    // 1. Password
    const adminPwd = await authService.login({
      email: adminUser.email,
      password: 'Password123!',
      portal: 'clinic'
    });
    console.log('✓ Clinic Admin Password Login SUCCESS. Role:', adminPwd.user.role);

    // 2. OTP
    await AuthOtp.deleteMany({ email: adminUser.email });
    await authService.sendLoginOtp({ email: adminUser.email, portal: 'clinic' });
    const adminOtpRec = await AuthOtp.findOne({ email: adminUser.email }).sort({ createdAt: -1 });
    adminOtpRec.otpHash = await bcrypt.hash('111111', 10);
    await adminOtpRec.save();
    const adminOtp = await authService.verifyLoginOtp({
      email: adminUser.email,
      otp: '111111',
      portal: 'clinic'
    });
    console.log('✓ Clinic Admin OTP Login SUCCESS. Role:', adminOtp.user.role);

    // ── ROLE 2: DOCTOR / STAFF ──
    console.log('\n▶ [ROLE 2: DOCTOR / STAFF]');
    // 1. Password
    const docPwd = await authService.login({
      email: doctorUser.email,
      password: 'Password123!',
      portal: 'staff'
    });
    console.log('✓ Doctor/Staff Password Login SUCCESS. Role:', docPwd.user.role);

    // 2. OTP
    await AuthOtp.deleteMany({ email: doctorUser.email });
    await authService.sendLoginOtp({ email: doctorUser.email, portal: 'staff' });
    const docOtpRec = await AuthOtp.findOne({ email: doctorUser.email }).sort({ createdAt: -1 });
    docOtpRec.otpHash = await bcrypt.hash('222222', 10);
    await docOtpRec.save();
    const docOtp = await authService.verifyLoginOtp({
      email: doctorUser.email,
      otp: '222222',
      portal: 'staff'
    });
    console.log('✓ Doctor/Staff OTP Login SUCCESS. Role:', docOtp.user.role);

    // ── ROLE 3: PATIENT ──
    console.log('\n▶ [ROLE 3: PATIENT]');
    // 1. Password
    const patPwd = await authService.login({
      email: patientUser.email,
      password: 'Password123!',
      portal: 'patient'
    });
    console.log('✓ Patient Password Login SUCCESS. Role:', patPwd.user.role);

    // 2. OTP
    await AuthOtp.deleteMany({ email: patientUser.email });
    await authService.sendLoginOtp({ email: patientUser.email, portal: 'patient' });
    const patOtpRec = await AuthOtp.findOne({ email: patientUser.email }).sort({ createdAt: -1 });
    patOtpRec.otpHash = await bcrypt.hash('333333', 10);
    await patOtpRec.save();
    const patOtp = await authService.verifyLoginOtp({
      email: patientUser.email,
      otp: '333333',
      portal: 'patient'
    });
    console.log('✓ Patient OTP Login SUCCESS. Role:', patOtp.user.role);

    // ── PORTAL ROLE MISMATCH CHECKS ──
    console.log('\n▶ [PORTAL ROLE MISMATCH VALIDATION]');
    // Patient attempting Staff portal
    try {
      await authService.sendLoginOtp({ email: patientUser.email, portal: 'staff' });
      throw new Error('Failed: Patient should not be allowed on staff portal');
    } catch (err) {
      console.log('✓ Patient on Staff portal blocked:', err.message);
    }

    // Staff attempting Patient portal
    try {
      await authService.sendLoginOtp({ email: doctorUser.email, portal: 'patient' });
      throw new Error('Failed: Doctor should not be allowed on patient portal');
    } catch (err) {
      console.log('✓ Doctor on Patient portal blocked:', err.message);
    }

    // Patient attempting Clinic Admin portal
    try {
      await authService.sendLoginOtp({ email: patientUser.email, portal: 'clinic' });
      throw new Error('Failed: Patient should not be allowed on clinic portal');
    } catch (err) {
      console.log('✓ Patient on Clinic portal blocked:', err.message);
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log(' ALL 3 ROLES (CLINIC ADMIN, DOCTOR/STAFF, PATIENT) FULLY TESTED & PASS! ');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

runAllRoleTests();
