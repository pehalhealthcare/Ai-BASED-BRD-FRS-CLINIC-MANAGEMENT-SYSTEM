const roundCurrency = (value) => {
  const numericValue = Number(value || 0);
  return Math.round((numericValue + Number.EPSILON) * 100) / 100;
};

const normalizeItem = (item = {}) => {
  const quantity = Math.max(1, Number(item.quantity || 0));
  const unitPrice = Math.max(0, Number(item.unitPrice || 0));
  const amount = roundCurrency(quantity * unitPrice);

  return {
    itemType: item.itemType || 'other',
    name: item.name?.trim?.() || '',
    description: item.description?.trim?.() || '',
    quantity,
    unitPrice,
    amount
  };
};

const calculatePaymentStatus = (totalAmount, paidAmount) => {
  const normalizedTotal = roundCurrency(totalAmount);
  const normalizedPaid = roundCurrency(paidAmount);

  if (normalizedPaid <= 0) {
    return 'unpaid';
  }

  if (normalizedPaid > 0 && normalizedPaid < normalizedTotal) {
    return 'partial';
  }

  if (normalizedPaid >= normalizedTotal) {
    return 'paid';
  }

  return 'unpaid';
};

const calculateInvoiceTotals = (payload = {}) => {
  const items = (payload.items || []).map(normalizeItem);
  const payments = (payload.payments || []).map((payment) => ({
    ...payment,
    amount: roundCurrency(payment.amount)
  }));
  const subtotal = roundCurrency(items.reduce((sum, item) => sum + item.amount, 0));
  const discountType = payload.discountType || 'none';
  const discountValue = Math.max(0, Number(payload.discountValue || 0));

  let discountAmount = 0;

  if (discountType === 'fixed') {
    discountAmount = discountValue;
  }

  if (discountType === 'percentage') {
    discountAmount = subtotal * (discountValue / 100);
  }

  discountAmount = roundCurrency(Math.min(subtotal, Math.max(0, discountAmount)));

  const taxableAmount = roundCurrency(Math.max(0, subtotal - discountAmount));
  const gstRate = Math.max(0, Number(payload.gstRate || 0));
  const gstAmount = roundCurrency(taxableAmount * (gstRate / 100));
  const totalAmount = roundCurrency(taxableAmount + gstAmount);
  const paidAmount = roundCurrency(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
  const dueAmount = roundCurrency(Math.max(0, totalAmount - paidAmount));
  const paymentStatus = calculatePaymentStatus(totalAmount, paidAmount);

  return {
    items,
    subtotal,
    discountType,
    discountValue: roundCurrency(discountValue),
    discountAmount,
    taxableAmount,
    gstRate: roundCurrency(gstRate),
    gstAmount,
    totalAmount,
    paidAmount,
    dueAmount,
    paymentStatus,
    payments
  };
};

module.exports = {
  roundCurrency,
  calculateInvoiceTotals,
  calculatePaymentStatus
};
