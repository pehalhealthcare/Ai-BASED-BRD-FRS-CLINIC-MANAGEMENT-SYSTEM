const Payment = require('../schemas/payment.schema');

class PaymentRepository {
  async createPayment(paymentData) {
    return Payment.create(paymentData);
  }

  async findPaymentById(id) {
    return Payment.findById(id).populate('invoiceId').populate('patientId');
  }

  async findPaymentByPaymentId(paymentId) {
    return Payment.findOne({ paymentId }).populate('invoiceId').populate('patientId');
  }

  async findPaymentByGatewayOrderId(gatewayOrderId) {
    return Payment.findOne({ gatewayOrderId }).populate('invoiceId').populate('patientId');
  }

  async updatePaymentStatus(id, { status, gatewayPaymentId, gatewaySignature }) {
    const update = { status };
    if (gatewayPaymentId) update.gatewayPaymentId = gatewayPaymentId;
    if (gatewaySignature) update.gatewaySignature = gatewaySignature;

    return Payment.findByIdAndUpdate(id, update, { new: true });
  }

  async findPaymentsByPatientId(patientId) {
    return Payment.find({ patientId }).populate('invoiceId').sort({ createdAt: -1 });
  }

  async generatePaymentId() {
    const lastPayment = await Payment.findOne().sort({ createdAt: -1 });
    if (!lastPayment || !lastPayment.paymentId) {
      return 'PAY-000001';
    }
    const match = lastPayment.paymentId.match(/PAY-(\d+)/);
    if (!match) {
      return 'PAY-000001';
    }
    const nextNum = parseInt(match[1], 10) + 1;
    return `PAY-${String(nextNum).padStart(6, '0')}`;
  }
}

module.exports = new PaymentRepository();
