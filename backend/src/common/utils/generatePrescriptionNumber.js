const { generateScopedSequenceCode } = require('./generateScopedSequenceCode');

const generatePrescriptionNumber = (clinicId) =>
  generateScopedSequenceCode({
    prefix: 'RX',
    scope: 'prescription',
    clinicId,
    padLength: 6
  });

module.exports = { generatePrescriptionNumber };
