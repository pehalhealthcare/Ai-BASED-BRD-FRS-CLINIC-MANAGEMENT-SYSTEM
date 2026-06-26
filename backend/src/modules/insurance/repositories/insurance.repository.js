const InsuranceProvider = require('../schemas/provider.schema');
const PatientInsurance = require('../schemas/policy.schema');
const InsuranceClaim = require('../schemas/claim.schema');

class InsuranceRepository {
  // Provider Repos
  async findProviderById(id) {
    return InsuranceProvider.findById(id);
  }

  async findProviderByCode(providerCode) {
    return InsuranceProvider.findOne({ providerCode: providerCode.toUpperCase() });
  }

  async listProviders(filter = {}) {
    return InsuranceProvider.find(filter);
  }

  // Policy Repos
  async findPolicyByNumber(policyNumber) {
    return PatientInsurance.findOne({ policyNumber: policyNumber.toUpperCase() })
      .populate('providerId')
      .populate('patientId');
  }

  async findPolicyByPatientId(patientId) {
    return PatientInsurance.findOne({ patientId })
      .populate('providerId')
      .populate('patientId');
  }

  async createPolicy(policyData) {
    return PatientInsurance.create(policyData);
  }

  async updatePolicy(id, updateData) {
    return PatientInsurance.findByIdAndUpdate(id, updateData, { new: true })
      .populate('providerId')
      .populate('patientId');
  }

  async deletePolicy(id) {
    return PatientInsurance.findByIdAndDelete(id);
  }

  // Claim Repos
  async findClaimById(id) {
    return InsuranceClaim.findById(id)
      .populate('patientId')
      .populate('invoiceId')
      .populate('clinicId');
  }

  async findClaimByClaimId(claimId) {
    return InsuranceClaim.findOne({ claimId: claimId.toUpperCase() })
      .populate('patientId')
      .populate('invoiceId')
      .populate('clinicId');
  }

  async createClaim(claimData) {
    return InsuranceClaim.create(claimData);
  }

  async updateClaim(id, updateData) {
    return InsuranceClaim.findByIdAndUpdate(id, updateData, { new: true })
      .populate('patientId')
      .populate('invoiceId')
      .populate('clinicId');
  }

  async listClaims({ filter, page = 1, limit = 10, sort = { createdAt: -1 } }) {
    const skip = (page - 1) * limit;
    const [claims, total] = await Promise.all([
      InsuranceClaim.find(filter)
        .populate('patientId')
        .populate('invoiceId')
        .populate('clinicId')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      InsuranceClaim.countDocuments(filter)
    ]);
    return { claims, total };
  }

  // Helper to generate claim ID in format CLAIM-000001
  async generateNextClaimId() {
    const lastClaim = await InsuranceClaim.findOne().sort({ createdAt: -1 });
    if (!lastClaim || !lastClaim.claimId) {
      return 'CLAIM-000001';
    }
    const match = lastClaim.claimId.match(/CLAIM-(\d+)/);
    if (!match) {
      return 'CLAIM-000001';
    }
    const nextNum = parseInt(match[1], 10) + 1;
    return `CLAIM-${String(nextNum).padStart(6, '0')}`;
  }
}

module.exports = new InsuranceRepository();
