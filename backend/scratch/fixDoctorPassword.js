/**
 * Fix doctor user account: 
 * - The user "kaishavgupta4.2001@gmail.com" was created in an earlier attempt with phone "9868382858"
 * - The doctor profile has phone "+919798969300" 
 * - Initial password = phone number used at creation = "9868382858" (wrong)
 * - We need to reset the password to the doctor profile's phone "+919798969300"
 * - Also mark isEmailVerified = true so OTP wall doesn't block them
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function fix() {
  const uri = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';
  await mongoose.connect(uri);
  console.log('Connected to Atlas DB');

  const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    phone: String,
    password: String,
    isEmailVerified: Boolean,
    approvalStatus: String
  }, { strict: false }));

  const email = 'kaishavgupta4.2001@gmail.com';
  const newPhone = '+919798969300';
  const newPassword = await bcrypt.hash(newPhone, 10);

  const result = await User.updateOne(
    { email: email.toLowerCase() },
    { 
      $set: { 
        password: newPassword,
        phone: newPhone,
        isEmailVerified: true
      }
    }
  );

  console.log('Update result:', result);
  console.log(`Doctor user password reset to phone: ${newPhone}`);
  console.log('isEmailVerified set to true');

  await mongoose.disconnect();
  console.log('Done!');
}

fix().catch(console.error);
