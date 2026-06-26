const BILLING_ITEM_TYPES = ['consultation', 'lab', 'pharmacy', 'procedure', 'other', 'CONSULTATION', 'LAB', 'PHARMACY'];
const DISCOUNT_TYPES = ['none', 'percentage', 'fixed'];
const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid', 'refunded', 'cancelled', 'PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'UNPAID'];
const INVOICE_STATUSES = ['draft', 'issued', 'cancelled', 'paid', 'PENDING', 'PAID', 'CANCELLED', 'REFUNDED'];

module.exports = {
  BILLING_ITEM_TYPES,
  DISCOUNT_TYPES,
  PAYMENT_STATUSES,
  INVOICE_STATUSES
};
