const Counter = require('../../modules/counters/counter.model');

const formatDateToken = (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
};

const generateScopedSequenceCode = async ({ prefix, scope, clinicId, date = new Date(), padLength = 4 }) => {
  const dateToken = formatDateToken(date);
  const counterKey = `${scope}:${clinicId}:${dateToken}`;
  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    {
      $inc: { seq: 1 },
      $setOnInsert: { key: counterKey }
    },
    {
      new: true,
      upsert: true
    }
  );

  return `${prefix}-${dateToken}-${String(counter.seq).padStart(padLength, '0')}`;
};

module.exports = {
  formatDateToken,
  generateScopedSequenceCode
};
