const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String },
  code: { type: String }
}, { timestamps: true, collection: 'clinics' });

const Organization = mongoose.models.Organization || mongoose.model('Organization', organizationSchema);

module.exports = Organization;
