const mongoose = require('mongoose');
const User = require('../src/modules/users/user.model');
const Clinic = require('../src/modules/clinics/clinic.model');
const SubscriptionPlan = require('../src/modules/subscriptions/subscriptionPlan.model');

async function run() {
  const uri = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';
  await mongoose.connect(uri);

  try {
    const adminUser = await User.findOne({ email: 'kaishavgupta65416@gmail.com' });
    const doctorUser = await User.findOne({ email: 'kaishavgupta4.2001@gmail.com' });

    if (adminUser) {
      console.log('--- ADMIN USER ---');
      console.log('Email:', adminUser.email);
      console.log('Clinic ID:', adminUser.clinicId);
      const clinic = await Clinic.findById(adminUser.clinicId).populate('subscription.planId');
      if (clinic) {
        console.log('Clinic Name:', clinic.name);
        console.log('Subscription Plan Name:', clinic.subscription?.planId?.name);
        console.log('Subscription Plan Features:', clinic.subscription?.planId?.features);
      }
    } else {
      console.log('Admin user not found');
    }

    if (doctorUser) {
      console.log('\n--- DOCTOR USER ---');
      console.log('Email:', doctorUser.email);
      console.log('Clinic ID:', doctorUser.clinicId);
      const clinic = await Clinic.findById(doctorUser.clinicId).populate('subscription.planId');
      if (clinic) {
        console.log('Clinic Name:', clinic.name);
        console.log('Subscription Plan Name:', clinic.subscription?.planId?.name);
        console.log('Subscription Plan Features:', clinic.subscription?.planId?.features);
      }
    } else {
      console.log('Doctor user not found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
