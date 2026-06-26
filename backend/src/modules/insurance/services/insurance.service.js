const mockAdapter = require('../adapters/mockInsuranceProvider.adapter');
const insuranceRepository = require('../repositories/insurance.repository');
const { createAuditLog } = require('../../audit/audit.service');
const { AppError } = require('../../../common/utils/AppError');
const { HTTP_STATUS } = require('../../../common/constants/httpStatus');

class InsuranceService {
  constructor(adapter = mockAdapter) {
    this.adapter = adapter;
  }

  /**
   * List all providers
   */
  async listProviders() {
    return insuranceRepository.listProviders();
  }

  /**
   * Get provider by ID
   */
  async getProviderById(id) {
    const provider = await insuranceRepository.findProviderById(id);
    if (!provider) {
      throw new AppError('Insurance provider not found.', HTTP_STATUS.NOT_FOUND);
    }
    return provider;
  }

  /**
   * Verify policy
   */
  async verifyPolicy({ providerCode, policyNumber, requester, req }) {
    const result = await this.adapter.verifyPolicy({ providerCode, policyNumber });

    // Log audit
    await createAuditLog({
      actorUserId: requester?._id,
      action: 'INSURANCE_POLICY_VERIFIED',
      entity: 'PatientInsurance',
      entityId: null,
      metadata: { providerCode, policyNumber, isValid: result.valid, status: result.status },
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent'),
      status: result.valid ? 'SUCCESS' : 'FAILURE'
    }).catch(err => console.error('Failed to log insurance verify audit:', err));

    return result;
  }

  /**
   * Get coverage
   */
  async getCoverage({ policyNumber, requester, req }) {
    const coverage = await this.adapter.getCoverage({ policyNumber });
    return coverage;
  }

  /**
   * Submit Claim
   */
  async submitClaim({ payload, requester, req }) {
    const { patientId, invoiceId, policyNumber, clinicId, claimAmount, documents } = payload;
    
    // Verify policy first
    const policy = await insuranceRepository.findPolicyByNumber(policyNumber);
    if (!policy) {
      throw new AppError('Policy does not exist.', HTTP_STATUS.BAD_REQUEST);
    }

    if (policy.remainingCoverage < claimAmount) {
      throw new AppError('Claim amount exceeds remaining policy coverage.', HTTP_STATUS.BAD_REQUEST);
    }

    const claimData = {
      patientId,
      invoiceId,
      policyNumber,
      clinicId,
      claimAmount,
      hospitalId: clinicId, // Map clinicId as hospitalId
      documents: documents || []
    };

    const claim = await this.adapter.submitClaim({ claimData });

    // Log audit
    await createAuditLog({
      actorUserId: requester?._id,
      action: 'INSURANCE_CLAIM_SUBMITTED',
      entity: 'InsuranceClaim',
      entityId: claim._id,
      metadata: { claimId: claim.claimId, claimAmount, policyNumber },
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent'),
      status: 'SUCCESS'
    }).catch(err => console.error('Failed to log claim submit audit:', err));

    return claim;
  }

  /**
   * Get claim status
   */
  async getClaimStatus({ claimId }) {
    return this.adapter.getClaimStatus({ claimId });
  }

  /**
   * Approve claim
   */
  async approveClaim({ claimId, approvedAmount, requester, req }) {
    const claim = await this.adapter.approveClaim({ claimId, approvedAmount });

    // Log audit
    await createAuditLog({
      actorUserId: requester?._id,
      action: 'INSURANCE_CLAIM_APPROVED',
      entity: 'InsuranceClaim',
      entityId: claim._id,
      metadata: { claimId, approvedAmount },
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent'),
      status: 'SUCCESS'
    }).catch(err => console.error('Failed to log claim approve audit:', err));

    return claim;
  }

  /**
   * Reject claim
   */
  async rejectClaim({ claimId, rejectionReason, requester, req }) {
    const claim = await this.adapter.rejectClaim({ claimId, rejectionReason });

    // Log audit
    await createAuditLog({
      actorUserId: requester?._id,
      action: 'INSURANCE_CLAIM_REJECTED',
      entity: 'InsuranceClaim',
      entityId: claim._id,
      metadata: { claimId, rejectionReason },
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent'),
      status: 'SUCCESS'
    }).catch(err => console.error('Failed to log claim reject audit:', err));

    return claim;
  }

  // Patient Insurance Operations
  async getPatientInsurance(patientId) {
    const policy = await insuranceRepository.findPolicyByPatientId(patientId);
    if (!policy) {
      throw new AppError('No active policy found for this patient.', HTTP_STATUS.NOT_FOUND);
    }
    return policy;
  }

  async createPatientInsurance(patientId, policyData, requester, req) {
    const existing = await insuranceRepository.findPolicyByPatientId(patientId);
    if (existing) {
      throw new AppError('Patient already has an active policy linked.', HTTP_STATUS.BAD_REQUEST);
    }

    const policy = await insuranceRepository.createPolicy({
      ...policyData,
      patientId,
      remainingCoverage: policyData.coverageAmount
    });

    // Log audit
    await createAuditLog({
      actorUserId: requester?._id,
      action: 'PATIENT_INSURANCE_CREATED',
      entity: 'PatientInsurance',
      entityId: policy._id,
      metadata: { patientId, policyNumber: policy.policyNumber },
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent'),
      status: 'SUCCESS'
    }).catch(err => console.error('Failed to log create policy audit:', err));

    return policy;
  }

  async updatePatientInsurance(patientId, updateData, requester, req) {
    const policy = await insuranceRepository.findPolicyByPatientId(patientId);
    if (!policy) {
      throw new AppError('No policy linked to this patient.', HTTP_STATUS.NOT_FOUND);
    }

    const updated = await insuranceRepository.updatePolicy(policy._id, updateData);

    // Log audit
    await createAuditLog({
      actorUserId: requester?._id,
      action: 'PATIENT_INSURANCE_UPDATED',
      entity: 'PatientInsurance',
      entityId: updated._id,
      metadata: { patientId, policyNumber: updated.policyNumber },
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent'),
      status: 'SUCCESS'
    }).catch(err => console.error('Failed to log update policy audit:', err));

    return updated;
  }

  async deletePatientInsurance(patientId, requester, req) {
    const policy = await insuranceRepository.findPolicyByPatientId(patientId);
    if (!policy) {
      throw new AppError('No policy linked to this patient.', HTTP_STATUS.NOT_FOUND);
    }

    await insuranceRepository.deletePolicy(policy._id);

    // Log audit
    await createAuditLog({
      actorUserId: requester?._id,
      action: 'PATIENT_INSURANCE_DELETED',
      entity: 'PatientInsurance',
      entityId: policy._id,
      metadata: { patientId, policyNumber: policy.policyNumber },
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent'),
      status: 'SUCCESS'
    }).catch(err => console.error('Failed to log delete policy audit:', err));

    return { message: 'Policy successfully unlinked.' };
  }

  /**
   * List claims with filtering, sorting, searching, and pagination
   */
  async listClaims({ query }) {
    const { page = 1, limit = 10, search = '', status = '', sortBy = 'createdAt', sortOrder = 'desc', clinicId } = query;

    const filter = {};
    if (clinicId) {
      filter.clinicId = clinicId;
    }
    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { claimId: { $regex: search, $options: 'i' } },
        { policyNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    return insuranceRepository.listClaims({
      filter,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort
    });
  }
}

module.exports = new InsuranceService();
