const DoctorEarning = require('../schemas/doctorEarning.schema');
const OrganizationEarning = require('../schemas/organizationEarning.schema');
const DoctorPayoutSetting = require('../schemas/doctorPayoutSetting.schema');
const OrganizationFinancialSetting = require('../schemas/organizationFinancialSetting.schema');

class SettlementsRepository {
  // Earnings creation
  async createDoctorEarning(data) {
    return DoctorEarning.create(data);
  }

  async createOrganizationEarning(data) {
    return OrganizationEarning.create(data);
  }

  // Retrieval
  async findDoctorEarnings(doctorId) {
    return DoctorEarning.find({ doctorId }).populate('invoiceId');
  }

  async findDoctorPayouts(doctorId) {
    return DoctorEarning.find({ doctorId, status: 'PAID' }).populate('invoiceId');
  }

  async findOrganizationEarnings(organizationId) {
    return OrganizationEarning.find({ organizationId }).populate('invoiceId');
  }

  // Update statuses
  async updateDoctorEarningStatus(id, status, payoutDetails = {}) {
    const update = { status };
    if (payoutDetails.transactionRef || payoutDetails.remarks) {
      update.payoutDetails = payoutDetails;
    }
    return DoctorEarning.findByIdAndUpdate(id, update, { new: true });
  }

  async updateOrganizationEarningStatus(id, status) {
    return OrganizationEarning.findByIdAndUpdate(id, { status }, { new: true });
  }

  // Doctor settings CRUD
  async getDoctorPayoutSettings(doctorId) {
    return DoctorPayoutSetting.findOne({ doctorId });
  }

  async upsertDoctorPayoutSettings(doctorId, data) {
    return DoctorPayoutSetting.findOneAndUpdate(
      { doctorId },
      { $set: data },
      { new: true, upsert: true }
    );
  }

  // Organization settings CRUD
  async getOrganizationFinancialSettings(organizationId) {
    return OrganizationFinancialSetting.findOne({ organizationId });
  }

  async upsertOrganizationFinancialSettings(organizationId, data) {
    return OrganizationFinancialSetting.findOneAndUpdate(
      { organizationId },
      { $set: data },
      { new: true, upsert: true }
    );
  }

  // Lists
  async listDoctorEarnings(filter = {}) {
    return DoctorEarning.find(filter).populate('doctorId').populate('invoiceId');
  }

  async listOrganizationEarnings(filter = {}) {
    return OrganizationEarning.find(filter).populate('invoiceId');
  }
}

module.exports = new SettlementsRepository();
