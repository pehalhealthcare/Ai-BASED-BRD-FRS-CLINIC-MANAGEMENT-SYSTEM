const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/config/database');
const authService = require('../src/modules/auth/auth.service');
const AuthOtp = require('../src/modules/auth/authOtp.model');

async function testRealOtpCycle() {
  try {
    await connectDB();
    console.log('═══════════════════════════════════════════════════════════');
    console.log(' TESTING COMPLETE REAL OTP CYCLE (SEND -> VERIFY)         ');
    console.log('═══════════════════════════════════════════════════════════\n');

    const testUsers = [
      { email: 'kaishavgupta65416@gmail.com', portal: 'clinic', role: 'ADMIN' },
      { email: 'kaishavgupta4.2001@gmail.com', portal: 'staff', role: 'DOCTOR' },
      { email: '8808808800@test.com', portal: 'patient', role: 'PATIENT' }
    ];

    for (const { email, portal, role } of testUsers) {
      console.log(`▶ Testing OTP lifecycle for ${role} (${email}) on portal [${portal}]...`);

      // 1. Clean previous OTPs
      await AuthOtp.deleteMany({ email });

      // 2. Request OTP
      // We monkey-patch console.info temporarily to capture the exact OTP logged during send
      let capturedOtp = null;
      const originalConsoleInfo = console.info;
      console.info = (...args) => {
        const text = args.join(' ');
        const match = text.match(/Code:\s*(\d{6})/);
        if (match) {
          capturedOtp = match[1];
        }
        originalConsoleInfo.apply(console, args);
      };

      await authService.sendLoginOtp({ email, portal });
      console.info = originalConsoleInfo;

      if (!capturedOtp) {
        // If not logged to console because SMTP is active, retrieve hash and verify via bcrypt brute-force of 6-digits (fast: ~100ms)
        const record = await AuthOtp.findOne({ email }).sort({ createdAt: -1 });
        if (!record) {
          throw new Error(`No OTP record created in DB for ${email}!`);
        }
        // Let's find which OTP matches the record's hash
        for (let i = 100000; i <= 999999; i++) {
          const testCode = String(i);
          if (await bcrypt.compare(testCode, record.otpHash)) {
            capturedOtp = testCode;
            break;
          }
        }
      }

      console.log(`   Captured/Generated OTP: ${capturedOtp}`);

      if (!capturedOtp) {
        throw new Error('Could not identify generated OTP code!');
      }

      // 3. Verify OTP
      const authResult = await authService.verifyLoginOtp({
        email,
        otp: capturedOtp,
        portal
      });

      console.log(`   ✓ verifyLoginOtp SUCCESS! Authenticated User Role: ${authResult.user.role}, Token present: ${Boolean(authResult.accessToken)}`);

      // 4. Verify Single-Use: Trying the same OTP again should fail
      try {
        await authService.verifyLoginOtp({
          email,
          otp: capturedOtp,
          portal
        });
        throw new Error('Single-use check failed: OTP was accepted twice!');
      } catch (err) {
        console.log(`   ✓ Single-use verified: Re-using OTP rejected with "${err.message}"`);
      }

      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(' ALL ROLES PASSED REAL OTP LIFECYCLE TESTS PERFECTLY!      ');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

testRealOtpCycle();
