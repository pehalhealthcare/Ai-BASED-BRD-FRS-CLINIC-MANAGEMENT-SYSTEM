const Invoice = require('../invoice.model');

class BillingRepository {
  async createInvoice(invoiceData) {
    return Invoice.create(invoiceData);
  }

  async findInvoiceById(id) {
    return Invoice.findById(id)
      .populate('patientId')
      .populate('clinicId')
      .populate('doctorId')
      .populate('appointmentId')
      .populate('organizationId');
  }

  async findInvoicesByPatient(patientId) {
    return Invoice.find({ patientId })
      .populate('patientId')
      .populate('clinicId')
      .populate('doctorId')
      .populate('organizationId');
  }

  async findInvoicesByOrganization(organizationId) {
    return Invoice.find({ organizationId })
      .populate('patientId')
      .populate('clinicId')
      .populate('doctorId')
      .populate('organizationId');
  }

  async updateInvoiceStatus(id, { invoiceStatus, paymentStatus, paymentId }) {
    const update = {};
    if (invoiceStatus) update.invoiceStatus = invoiceStatus;
    if (paymentStatus) update.paymentStatus = paymentStatus;
    if (paymentId) update.paymentId = paymentId;
    update.pdfUrl = null; // Clear cached PDF URL to force regeneration

    return Invoice.findByIdAndUpdate(id, update, { new: true });
  }

  async generateInvoiceNumber() {
    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
    if (!lastInvoice || !lastInvoice.invoiceNumber) {
      return 'INV-000001';
    }
    const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
    if (!match) {
      return 'INV-000001';
    }
    const nextNum = parseInt(match[1], 10) + 1;
    return `INV-${String(nextNum).padStart(6, '0')}`;
  }
}

module.exports = new BillingRepository();
