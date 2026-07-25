const { connectDB } = require('d:/Office_work/CMS/backend/src/config/database');
const User = require('d:/Office_work/CMS/backend/src/modules/users/user.model');

async function run() {
  await connectDB();
  const user = await User.findOne({ email: '8978977897@test.com' });
  console.log("PATIENT USER:", JSON.stringify(user, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
