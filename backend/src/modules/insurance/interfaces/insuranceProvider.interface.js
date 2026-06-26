/**
 * Abstract class representing the interface that all Insurance Provider Adapters must implement.
 */
class InsuranceProviderAdapter {
  constructor() {
    if (this.constructor === InsuranceProviderAdapter) {
      throw new Error("Cannot instantiate abstract class InsuranceProviderAdapter directly.");
    }
  }

  /**
   * Verify a policy status, validity, and details.
   * @param {Object} params
   * @param {string} params.providerCode
   * @param {string} params.policyNumber
   * @returns {Promise<{valid: boolean, policyHolder: string, expiry: Date, status: string, remainingCoverage: number}>}
   */
  async verifyPolicy({ providerCode, policyNumber }) {
    throw new Error("Method 'verifyPolicy' must be implemented.");
  }

  /**
   * Get policy benefits coverage.
   * @param {Object} params
   * @param {string} params.policyNumber
   * @returns {Promise<{consultation: boolean, lab: boolean, pharmacy: boolean, hospitalization: boolean, emergency: boolean, surgery: boolean, remainingCoverage: number}>}
   */
  async getCoverage({ policyNumber }) {
    throw new Error("Method 'getCoverage' must be implemented.");
  }

  /**
   * Submit an insurance claim.
   * @param {Object} params
   * @param {Object} params.claimData
   * @returns {Promise<Object>}
   */
  async submitClaim({ claimData }) {
    throw new Error("Method 'submitClaim' must be implemented.");
  }

  /**
   * Retrieve current claim details and status.
   * @param {Object} params
   * @param {string} params.claimId
   * @returns {Promise<Object>}
   */
  async getClaimStatus({ claimId }) {
    throw new Error("Method 'getClaimStatus' must be implemented.");
  }

  /**
   * Approve a claim and adjust policy coverage.
   * @param {Object} params
   * @param {string} params.claimId
   * @param {number} params.approvedAmount
   * @returns {Promise<Object>}
   */
  async approveClaim({ claimId, approvedAmount }) {
    throw new Error("Method 'approveClaim' must be implemented.");
  }

  /**
   * Reject a claim.
   * @param {Object} params
   * @param {string} params.claimId
   * @param {string} params.rejectionReason
   * @returns {Promise<Object>}
   */
  async rejectClaim({ claimId, rejectionReason }) {
    throw new Error("Method 'rejectClaim' must be implemented.");
  }
}

module.exports = InsuranceProviderAdapter;
