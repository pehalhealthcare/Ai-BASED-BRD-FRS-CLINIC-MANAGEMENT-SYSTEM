const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/config/database');
const authService = require('../src/modules/auth/auth.service');
const AuthOtp = require('../src/modules/auth/authOtp.model');

async function debugOtpFlow() {
  try {
    await connectDB();

    const email = 'kaishavgupta65416@gmail.com';
    const portal = 'clinic';

    console.log('--- Step 1: Clean up old OTPs ---');
    await AuthOtp.deleteMany({ email });

    console.log('--- Step 2: Send Login OTP ---');
    const sendResult = await authService.sendLoginOtp({ email, portal });
    console.log('Send Result:', sendResult);

    console.log('--- Step 3: Inspect Database Record ---');
    const records = await AuthOtp.find({ email }).sort({ createdAt: -1 });
    console.log('Total Records Found:', records.length);
    if (records.length > 0) {
      const rec = records[0];
      console.log('Record ID:', rec._id);
      console.log('Record Email:', rec.email);
      console.log('Record Purpose:', rec.purpose);
      console.log('Record CreatedAt:', rec.createdAt);
      console.log('Record ExpiresAt:', rec.expiresAt);
      console.log('Record Attempts:', rec.attempts);
      console.log('Record MaxAttempts:', rec.maxAttempts);
      console.log('Record OtpHash:', rec.otpHash);
    }

    console.log('--- Step 4: Test with wrong OTP ---');
    try {
      await authService.verifyLoginOtp({ email, otp: '999999', portal });
      console.error('ERROR: Wrong OTP was accepted!');
    } catch (err) {
      console.log('Expected error on wrong OTP:', err.message);
    }

  } catch (err) {
    console.error('Debug script failed:', err);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

debugOtpFlow();
