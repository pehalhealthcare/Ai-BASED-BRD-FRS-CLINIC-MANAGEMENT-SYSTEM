const mongoose = require('mongoose');
const User = require('../modules/users/user.model');

const MONGO_URI = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';

async function findUser() {
  await mongoose.connect(MONGO_URI);
  try {
    const user = await User.findOne({ email: /alphabro/i });
    if (!user) {
      console.log('User not found in database.');
    } else {
      console.log('User details found:', JSON.stringify(user, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

findUser();
