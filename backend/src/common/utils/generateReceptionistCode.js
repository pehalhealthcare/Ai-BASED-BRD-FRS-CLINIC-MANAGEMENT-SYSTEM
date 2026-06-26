const { generateScopedSequenceCode } = require('./generateScopedSequenceCode');

const generateReceptionistCode = (clinicId) =>
  generateScopedSequenceCode({
    prefix: 'REC',
    scope: 'receptionist',
    clinicId
  });

module.exports = { generateReceptionistCode };
