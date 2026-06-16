const Invoice = require('../../modules/billing/invoice.model');

const formatDateToken = (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
};

const generateFallbackInvoiceNumber = (dateToken) =>
  `INV-${dateToken}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;

const generateInvoiceNumber = async ({ date = new Date() } = {}) => {
  const dateToken = formatDateToken(date);
  const startOfDay = new Date(`${dateToken.slice(0, 4)}-${dateToken.slice(4, 6)}-${dateToken.slice(6, 8)}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateToken.slice(0, 4)}-${dateToken.slice(4, 6)}-${dateToken.slice(6, 8)}T23:59:59.999Z`);

  try {
    const latestInvoice = await Invoice.findOne({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      invoiceNumber: new RegExp(`^INV-${dateToken}-\\d{4}$`)
    })
      .sort({ createdAt: -1, invoiceNumber: -1 })
      .select('invoiceNumber')
      .lean();

    if (!latestInvoice?.invoiceNumber) {
      return `INV-${dateToken}-0001`;
    }

    const currentSequence = Number(latestInvoice.invoiceNumber.split('-').pop() || 0);
    const nextSequence = currentSequence + 1;

    return `INV-${dateToken}-${String(nextSequence).padStart(4, '0')}`;
  } catch (_error) {
    return generateFallbackInvoiceNumber(dateToken);
  }
};

module.exports = {
  formatDateToken,
  generateInvoiceNumber
};
