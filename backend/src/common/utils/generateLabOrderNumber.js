const { generateScopedSequenceCode } = require('./generateScopedSequenceCode');

const generateLabOrderNumber = (clinicId, date = new Date()) =>
  generateScopedSequenceCode({
    prefix: 'LAB',
    scope: 'lab-order',
    clinicId,
    date,
    padLength: 4
  });

module.exports = {
  generateLabOrderNumber
};
