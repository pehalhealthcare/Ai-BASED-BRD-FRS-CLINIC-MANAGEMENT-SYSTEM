import { billingApi } from '../../lib/api';

const roundCurrency = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const previewInvoiceTotals = ({
  items = [],
  discountType = 'none',
  discountValue = 0,
  gstRate = 18,
  payments = []
}) => {
  const normalizedItems = items.map((item) => {
    const quantity = Math.max(1, Number(item.quantity || 0));
    const unitPrice = Math.max(0, Number(item.unitPrice || 0));
    return {
      ...item,
      quantity,
      unitPrice,
      amount: roundCurrency(quantity * unitPrice)
    };
  });

  const subtotal = roundCurrency(normalizedItems.reduce((sum, item) => sum + item.amount, 0));
  let discountAmount = 0;

  if (discountType === 'fixed') {
    discountAmount = Number(discountValue || 0);
  }

  if (discountType === 'percentage') {
    discountAmount = subtotal * (Number(discountValue || 0) / 100);
  }

  discountAmount = roundCurrency(Math.min(subtotal, Math.max(0, discountAmount)));
  const taxableAmount = roundCurrency(Math.max(0, subtotal - discountAmount));
  const gstAmount = roundCurrency(taxableAmount * (Number(gstRate || 0) / 100));
  const totalAmount = roundCurrency(taxableAmount + gstAmount);
  const paidAmount = roundCurrency(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
  const dueAmount = roundCurrency(Math.max(0, totalAmount - paidAmount));
  const paymentStatus = paidAmount <= 0 ? 'unpaid' : paidAmount < totalAmount ? 'partial' : 'paid';

  return {
    items: normalizedItems,
    subtotal,
    discountAmount,
    taxableAmount,
    gstAmount,
    totalAmount,
    paidAmount,
    dueAmount,
    paymentStatus
  };
};

export const createInvoice = (payload) => billingApi.createInvoice(payload);
export const getInvoices = (params) => billingApi.getInvoices(params);
export const getInvoiceById = (id) => billingApi.getInvoiceById(id);
export const updateInvoice = (id, payload) => billingApi.updateInvoice(id, payload);
export const recordPayment = (invoiceId, payload) => billingApi.recordPayment(invoiceId, payload);
export const generateInvoicePdf = (invoiceId) => billingApi.generateInvoicePdf(invoiceId);
export const downloadInvoicePdf = (invoiceId) => billingApi.downloadInvoicePdf(invoiceId);
export const cancelInvoice = (invoiceId, payload) => billingApi.cancelInvoice(invoiceId, payload);
export const getPatientInvoices = (patientId, params) => billingApi.getPatientInvoices(patientId, params);
export const getBillingSummary = (params) => billingApi.getBillingSummary(params);
export const createRazorpayOrder = (invoiceId) => billingApi.createRazorpayOrder(invoiceId);
export const verifyRazorpayPayment = (invoiceId, payload) => billingApi.verifyRazorpayPayment(invoiceId, payload);
export const recordRefund = (invoiceId, payload) => billingApi.recordRefund(invoiceId, payload);

export default billingApi;
