const { generateScopedSequenceCode } = require('./generateScopedSequenceCode');

const generateDoctorCode = (clinicId) =>
  generateScopedSequenceCode({
    prefix: 'DOC',
    scope: 'doctor',
    clinicId
  });

module.exports = { generateDoctorCode };
