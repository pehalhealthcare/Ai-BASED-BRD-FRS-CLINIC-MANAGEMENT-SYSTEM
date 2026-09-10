const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');

async function check() {
  await connectDB();
  const logs = await mongoose.connection.db
    .collection('audit_logs')
    .find({ action: { $in: ['USER_LOGIN_FAILED', 'LOGIN_OTP_REQUEST_FAILED', 'LOGIN_OTP_VERIFY_FAILED', 'USER_LOGGED_IN'] } })
    .sort({ _id: -1 })
    .limit(15)
    .toArray();

  console.log('Recent Auth Logs:');
  logs.forEach((l) => {
    console.log({
      action: l.action,
      status: l.status,
      metadata: l.metadata,
      createdAt: l.createdAt
    });
  });

  await disconnectDB();
  process.exit(0);
}

check();
