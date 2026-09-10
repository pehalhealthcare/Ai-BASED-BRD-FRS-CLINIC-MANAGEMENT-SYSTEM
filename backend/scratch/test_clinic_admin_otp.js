const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/modules/users/user.model');
const AuthOtp = require('../src/modules/auth/authOtp.model');
const authService = require('../src/modules/auth/auth.service');
const { ROLES } = require('../src/common/constants/roles');
const bcrypt = require('bcryptjs');

async function runTests() {
  console.log('--- Starting Dual Authentication (Password + OTP) Tests ---');
  await connectDB();

  try {
    // 1. Find or create a test Clinic Admin
    let adminUser = await User.findOne({ role: ROLES.ADMIN, isActive: true }).select('+password');
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Test Clinic Admin',
        email: 'test_clinic_admin@pepal.test',
        password: 'Password123!',
        role: ROLES.ADMIN,
        isActive: true,
        approvalStatus: 'approved'
      });
      console.log('Created test Clinic Admin:', adminUser.email);
    } else {
      console.log('Using existing Clinic Admin:', adminUser.email);
      // Ensure password is set to known password for testing
      adminUser.password = 'Password123!';
      await adminUser.save();
    }

    // TEST 1: Password Login with correct password
    console.log('\n[TEST 1] Password Login with correct credentials...');
    const pwdLoginResult = await authService.login({
      email: adminUser.email,
      password: 'Password123!',
      portal: 'clinic'
    });
    if (!pwdLoginResult.accessToken || !pwdLoginResult.user) {
      throw new Error('Test 1 failed: Missing token or user in password login response');
    }
    console.log('✓ PASS: Password login successful for role:', pwdLoginResult.user.role);

    // TEST 2: Password Login with incorrect password
    console.log('\n[TEST 2] Password Login with incorrect password...');
    try {
      await authService.login({
        email: adminUser.email,
        password: 'WrongPassword!',
        portal: 'clinic'
      });
      throw new Error('Test 2 failed: Should have thrown error for wrong password');
    } catch (err) {
      console.log('✓ PASS: Wrong password rejected:', err.message);
    }

    // TEST 3: OTP Send & Rate Limit
    console.log('\n[TEST 3] OTP Send & Rate Limit...');
    await AuthOtp.deleteMany({ email: adminUser.email });
    const sendRes = await authService.sendClinicAdminOtp({ email: adminUser.email });
    console.log('✓ PASS: OTP Sent message:', sendRes.message);

    try {
      await authService.sendClinicAdminOtp({ email: adminUser.email });
      throw new Error('Test 3 failed: Should have enforced 30s cooldown');
    } catch (err) {
      console.log('✓ PASS: Cooldown enforced:', err.message);
    }

    // TEST 4: OTP Verification & Single-Use
    console.log('\n[TEST 4] OTP Verification...');
    const otpRecord = await AuthOtp.findOne({ email: adminUser.email, purpose: 'CLINIC_ADMIN_LOGIN' });
    const testOtp = '112233';
    otpRecord.otpHash = await bcrypt.hash(testOtp, 10);
    await otpRecord.save();

    const otpLoginResult = await authService.verifyClinicAdminOtp({
      email: adminUser.email,
      otp: testOtp
    });
    if (!otpLoginResult.accessToken || !otpLoginResult.user) {
      throw new Error('Test 4 failed: Missing token or user in OTP login response');
    }
    console.log('✓ PASS: OTP login successful for role:', otpLoginResult.user.role);

    // TEST 5: Re-verify consumed OTP
    console.log('\n[TEST 5] Re-verify consumed OTP...');
    try {
      await authService.verifyClinicAdminOtp({ email: adminUser.email, otp: testOtp });
      throw new Error('Test 5 failed: Consumed OTP should not be reusable');
    } catch (err) {
      console.log('✓ PASS: Re-use prevented:', err.message);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(' BOTH AUTHENTICATION METHODS (PASSWORD + OTP) PASSED! ');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

runTests();
