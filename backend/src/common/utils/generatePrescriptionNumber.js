const { generateScopedSequenceCode } = require('./generateScopedSequenceCode');

const generatePrescriptionNumber = (clinicId) =>
  generateScopedSequenceCode({
    prefix: 'RX',
    scope: 'prescription',
    clinicId,
    padLength: 6
  });

const generateUploadedPrescriptionNumber = (clinicId) =>
  generateScopedSequenceCode({
    prefix: 'UPR',
    scope: 'uploaded_prescription',
    clinicId,
    padLength: 5
  });

module.exports = { generatePrescriptionNumber, generateUploadedPrescriptionNumber };
