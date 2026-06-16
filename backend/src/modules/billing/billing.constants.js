const BILLING_ITEM_TYPES = ['consultation', 'lab', 'pharmacy', 'procedure', 'other'];
const DISCOUNT_TYPES = ['none', 'percentage', 'fixed'];
const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid', 'refunded', 'cancelled'];
const INVOICE_STATUSES = ['draft', 'issued', 'cancelled'];

module.exports = {
  BILLING_ITEM_TYPES,
  DISCOUNT_TYPES,
  PAYMENT_STATUSES,
  INVOICE_STATUSES
};
