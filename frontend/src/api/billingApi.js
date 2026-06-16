import { axiosClient, unwrapResponse } from './axiosClient';

export const billingApi = {
  createInvoice: async (payload) => unwrapResponse(await axiosClient.post('/billing/invoices', payload)),
  getInvoices: async (params = {}) => unwrapResponse(await axiosClient.get('/billing/invoices', { params })),
  getInvoiceById: async (id) => unwrapResponse(await axiosClient.get(`/billing/invoices/${id}`)),
  updateInvoice: async (id, payload) => unwrapResponse(await axiosClient.put(`/billing/invoices/${id}`, payload)),
  recordPayment: async (id, payload) => unwrapResponse(await axiosClient.post(`/billing/invoices/${id}/payments`, payload)),
  generateInvoicePdf: async (id) => unwrapResponse(await axiosClient.post(`/billing/invoices/${id}/generate-pdf`, {})),
  downloadInvoicePdf: async (id) =>
    axiosClient.get(`/billing/invoices/${id}/pdf`, {
      responseType: 'blob'
    }),
  cancelInvoice: async (id, payload) => unwrapResponse(await axiosClient.patch(`/billing/invoices/${id}/cancel`, payload)),
  getPatientInvoices: async (patientId, params = {}) =>
    unwrapResponse(await axiosClient.get(`/billing/patient/${patientId}/invoices`, { params })),
  getBillingSummary: async () => unwrapResponse(await axiosClient.get('/billing/summary')),
  createRazorpayOrder: async (invoiceId) => unwrapResponse(await axiosClient.post(`/billing/invoices/${invoiceId}/razorpay-order`)),
  verifyRazorpayPayment: async (invoiceId, payload) => unwrapResponse(await axiosClient.post(`/billing/invoices/${invoiceId}/razorpay-verify`, payload))
};

export default billingApi;
