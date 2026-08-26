const mongoose = require('mongoose');
const { env } = require('../config/env');
const GlobalLabTest = require('../modules/healthcare-catalog/globalLabTest.model');
const GlobalParameter = require('../modules/healthcare-catalog/globalParameter.model');

const check = async () => {
  const { connectDB } = require('../config/database');
  await connectDB();
  console.log('Database connected successfully.');

  const tests = await GlobalLabTest.find({});
  console.log('Total tests/panels/profiles in DB:', tests.length);
  if (tests.length > 0) {
    console.log('First 5 tests in DB:');
    tests.slice(0, 5).forEach(t => {
      console.log(`- Name: ${t.name}, Type: ${t.investigationType}, Source: ${t.source}, isActive: ${t.isActive}`);
    });
  }

  const params = await GlobalParameter.find({});
  console.log('Total parameters in DB:', params.length);
  if (params.length > 0) {
    console.log('First 5 parameters in DB:');
    params.slice(0, 5).forEach(p => {
      console.log(`- Name: ${p.name}, resultType: ${p.resultType}, isActive: ${p.isActive}`);
    });
  }

  await mongoose.disconnect();
};

check();
