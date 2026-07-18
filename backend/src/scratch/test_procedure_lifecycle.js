const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('Loading Mongoose and models...');
try {
  const mongoose = require('mongoose');
  const Procedure = require('../modules/procedures/procedure.model');
  const Clinic = require('../modules/clinics/clinic.model');
  const Invoice = require('../modules/billing/invoice.model');
  const procedureService = require('../modules/procedures/procedure.service');
  
  console.log('Models and Service loaded successfully!');
  console.log('Procedure Status Enum values:', Procedure.schema.path('status').enumValues);
  console.log('Procedure Billing Policy enum check:', Clinic.schema.path('billingSettings.procedureBillingPolicy').enumValues);
  console.log('Invoice ServiceType enum check:', Invoice.schema.path('serviceType').enumValues);
  
  console.log('Verification Success: All modules loaded and validated without syntax or runtime reference errors!');
  process.exit(0);
} catch (err) {
  console.error('Verification Failed: Error loading modules:', err);
  process.exit(1);
}
