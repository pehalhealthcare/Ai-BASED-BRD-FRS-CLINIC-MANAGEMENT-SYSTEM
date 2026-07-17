const mongoose = require('mongoose');
const { seedPlans } = require('../modules/subscriptions/subscription.service');

const MONGO_URI = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB. Seeding plans...');
    await seedPlans();
    console.log('Plans seeded/updated successfully.');
  } catch (err) {
    console.error('Error seeding plans:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
