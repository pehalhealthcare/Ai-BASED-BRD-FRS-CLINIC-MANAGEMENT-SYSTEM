const { generateScopedSequenceCode } = require('./generateScopedSequenceCode');

const generatePatientId = (clinicId) =>
  generateScopedSequenceCode({
    prefix: 'PAT',
    scope: 'patient',
    clinicId
  });

module.exports = { generatePatientId };
