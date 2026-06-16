const Invoice = require('./invoice.model');

const populateInvoice = (query) =>
  query
    .populate('patientId', 'patientId firstName lastName fullName gender age phone email')
    .populate('appointmentId', 'appointmentDate startTime endTime status reasonForVisit doctorId')
    .populate('consultationId', 'chiefComplaint diagnosis treatmentPlan status doctorId')
    .populate('createdBy', 'name email role')
    .populate('updatedBy', 'name email role')
    .populate('payments.receivedBy', 'name email role');

const createInvoice = (data) => Invoice.create(data);

const findInvoiceById = ({ id, clinicId, populateDetails = true, lean = false }) => {
  let query = Invoice.findOne({ _id: id, clinicId });

  if (populateDetails) {
    query = populateInvoice(query);
  }

  if (lean) {
    query = query.lean();
  }

  return query;
};

const listInvoices = async ({ filter, page = 1, limit = 10, sort = { invoiceDate: -1, createdAt: -1 } }) => {
  const skip = (page - 1) * limit;
  const [invoices, total] = await Promise.all([
    populateInvoice(Invoice.find(filter).sort(sort).skip(skip).limit(limit)).lean(),
    Invoice.countDocuments(filter)
  ]);

  return { invoices, total };
};

const updateInvoice = ({ id, clinicId, data, populateDetails = true }) => {
  let query = Invoice.findOneAndUpdate({ _id: id, clinicId }, data, {
    new: true,
    runValidators: true
  });

  if (populateDetails) {
    query = populateInvoice(query);
  }

  return query;
};

const findByPatient = async ({ patientId, clinicId, queryOptions = {} }) => {
  const { page = 1, limit = 10, invoiceStatus, paymentStatus } = queryOptions;
  const skip = (page - 1) * limit;
  const filter = { patientId, clinicId };

  if (invoiceStatus) {
    filter.invoiceStatus = invoiceStatus;
  }

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  const [invoices, total] = await Promise.all([
    populateInvoice(Invoice.find(filter).sort({ invoiceDate: -1, createdAt: -1 }).skip(skip).limit(limit)).lean(),
    Invoice.countDocuments(filter)
  ]);

  return { invoices, total };
};

const getBillingSummary = async ({ clinicId, range = {} }) => {
  const invoices = await Invoice.find({ clinicId, invoiceStatus: { $ne: 'cancelled' } }).lean();
  const totalInvoices = invoices.length;
  const totalRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0);
  const pendingAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.dueAmount || 0), 0);
  const paidInvoices = invoices.filter((invoice) => invoice.paymentStatus === 'paid').length;
  const partialInvoices = invoices.filter((invoice) => invoice.paymentStatus === 'partial').length;
  const unpaidInvoices = invoices.filter((invoice) => invoice.paymentStatus === 'unpaid').length;

  const sumPaymentsInRange = (startDate, endDate) =>
    invoices.reduce((sum, invoice) => {
      const rangeTotal = (invoice.payments || []).reduce((paymentSum, payment) => {
        const paidAt = payment.paidAt ? new Date(payment.paidAt) : null;

        if (!paidAt || Number.isNaN(paidAt.getTime())) {
          return paymentSum;
        }

        if (paidAt >= startDate && paidAt <= endDate) {
          return paymentSum + Number(payment.amount || 0);
        }

        return paymentSum;
      }, 0);

      return sum + rangeTotal;
    }, 0);

  const todayStart = range.todayStart || new Date(new Date().setHours(0, 0, 0, 0));
  const todayEnd = range.todayEnd || new Date(new Date().setHours(23, 59, 59, 999));
  const monthStart = range.monthStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthEnd = range.monthEnd || todayEnd;

  return {
    totalInvoices,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    pendingAmount: Number(pendingAmount.toFixed(2)),
    paidInvoices,
    partialInvoices,
    unpaidInvoices,
    todayRevenue: Number(sumPaymentsInRange(todayStart, todayEnd).toFixed(2)),
    monthRevenue: Number(sumPaymentsInRange(monthStart, monthEnd).toFixed(2))
  };
};

module.exports = {
  createInvoice,
  findInvoiceById,
  listInvoices,
  updateInvoice,
  findByPatient,
  getBillingSummary
};
