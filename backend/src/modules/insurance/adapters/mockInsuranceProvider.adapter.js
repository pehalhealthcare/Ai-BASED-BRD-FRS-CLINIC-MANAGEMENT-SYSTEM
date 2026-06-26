const InsuranceProviderAdapter = require('../interfaces/insuranceProvider.interface');
const insuranceRepository = require('../repositories/insurance.repository');
const { AppError } = require('../../../common/utils/AppError');
const { HTTP_STATUS } = require('../../../common/constants/httpStatus');

class MockInsuranceProviderAdapter extends InsuranceProviderAdapter {
  /**
   * Verify policy
   */
  async verifyPolicy({ providerCode, policyNumber }) {
    const policy = await insuranceRepository.findPolicyByNumber(policyNumber);
    if (!policy) {
      return { valid: false, status: 'INVALID', message: 'Policy not found.' };
    }

    const provider = policy.providerId;
    if (!provider || provider.providerCode.toUpperCase() !== providerCode.toUpperCase()) {
      return { valid: false, status: 'INVALID', message: 'Provider code mismatch.' };
    }

    const today = new Date();
    if (new Date(policy.policyEndDate) < today) {
      return {
        valid: false,
        policyHolder: policy.policyHolderName,
        expiry: policy.policyEndDate,
        status: 'EXPIRED',
        remainingCoverage: policy.remainingCoverage
      };
    }

    return {
      valid: true,
      policyHolder: policy.policyHolderName,
      expiry: policy.policyEndDate,
      status: policy.status,
      remainingCoverage: policy.remainingCoverage
    };
  }

  /**
   * Get coverage benefits
   */
  async getCoverage({ policyNumber }) {
    const policy = await insuranceRepository.findPolicyByNumber(policyNumber);
    if (!policy) {
      throw new AppError('Policy not found.', HTTP_STATUS.NOT_FOUND);
    }

    return {
      consultation: policy.benefits?.consultation || false,
      lab: policy.benefits?.lab || false,
      pharmacy: policy.benefits?.pharmacy || false,
      hospitalization: policy.benefits?.hospitalization || false,
      emergency: policy.benefits?.emergency || false,
      surgery: policy.benefits?.surgery || false,
      remainingCoverage: policy.remainingCoverage
    };
  }

  /**
   * Submit claim
   */
  async submitClaim({ claimData }) {
    const nextClaimId = await insuranceRepository.generateNextClaimId();
    
    // Create new claim entry
    const claim = await insuranceRepository.createClaim({
      ...claimData,
      claimId: nextClaimId,
      status: 'PENDING',
      timeline: [
        {
          status: 'PENDING',
          description: 'Claim submitted successfully under Mock Adapter.'
        }
      ]
    });

    return claim;
  }

  /**
   * Get claim status
   */
  async getClaimStatus({ claimId }) {
    const claim = await insuranceRepository.findClaimByClaimId(claimId);
    if (!claim) {
      throw new AppError('Claim not found.', HTTP_STATUS.NOT_FOUND);
    }
    return claim;
  }

  /**
   * Approve claim
   */
  async approveClaim({ claimId, approvedAmount }) {
    const claim = await insuranceRepository.findClaimByClaimId(claimId);
    if (!claim) {
      throw new AppError('Claim not found.', HTTP_STATUS.NOT_FOUND);
    }

    if (claim.status !== 'PENDING' && claim.status !== 'UNDER_REVIEW') {
      throw new AppError('Claim has already been processed.', HTTP_STATUS.BAD_REQUEST);
    }

    const policy = await insuranceRepository.findPolicyByNumber(claim.policyNumber);
    if (!policy) {
      throw new AppError('Policy associated with this claim not found.', HTTP_STATUS.NOT_FOUND);
    }

    if (policy.remainingCoverage < approvedAmount) {
      throw new AppError('Approved amount exceeds policy remaining coverage.', HTTP_STATUS.BAD_REQUEST);
    }

    // Deduct remaining coverage from policy
    const nextRemaining = policy.remainingCoverage - approvedAmount;
    await insuranceRepository.updatePolicy(policy._id, {
      remainingCoverage: nextRemaining,
      status: nextRemaining <= 0 ? 'EXPIRED' : policy.status
    });

    // Update claim
    const updatedClaim = await insuranceRepository.updateClaim(claim._id, {
      status: 'APPROVED',
      approvedAmount,
      timeline: [
        ...claim.timeline,
        {
          status: 'APPROVED',
          description: `Claim approved for ₹${approvedAmount}. Remaining policy coverage is ₹${nextRemaining}.`
        }
      ]
    });

    return updatedClaim;
  }

  /**
   * Reject claim
   */
  async rejectClaim({ claimId, rejectionReason }) {
    const claim = await insuranceRepository.findClaimByClaimId(claimId);
    if (!claim) {
      throw new AppError('Claim not found.', HTTP_STATUS.NOT_FOUND);
    }

    if (claim.status !== 'PENDING' && claim.status !== 'UNDER_REVIEW') {
      throw new AppError('Claim has already been processed.', HTTP_STATUS.BAD_REQUEST);
    }

    const updatedClaim = await insuranceRepository.updateClaim(claim._id, {
      status: 'REJECTED',
      rejectionReason,
      timeline: [
        ...claim.timeline,
        {
          status: 'REJECTED',
          description: `Claim rejected. Reason: ${rejectionReason}`
        }
      ]
    });

    return updatedClaim;
  }
}

module.exports = new MockInsuranceProviderAdapter();
