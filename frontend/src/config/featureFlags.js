/**
 * PEHAL AI-CMS Centralized Feature Flags Configuration
 *
 * This configuration serves as the single source of truth for toggling
 * feature modules across the application without deleting or altering
 * underlying business logic, database models, or backend controllers.
 *
 * ---------------------------------------------------------------------
 * HOW TO RE-ENABLE THE FINANCIAL & SETTLEMENT PORTAL:
 * ---------------------------------------------------------------------
 * Option A (Direct code toggle):
 *   Change `ENABLE_FINANCIAL_SETTLEMENT_PORTAL: false` to `true` below.
 *
 * Option B (Environment variable):
 *   Add `VITE_ENABLE_FINANCIAL_SETTLEMENT_PORTAL=true` in frontend/.env
 *   or your environment configuration.
 * ---------------------------------------------------------------------
 */

const envFlag = import.meta.env?.VITE_ENABLE_FINANCIAL_SETTLEMENT_PORTAL;

export const FEATURE_FLAGS = {
  /**
   * Financial & Settlement Portal ('Payments')
   * Controls:
   * - Payments navigation entry in Sidebar (Super Admin, Clinic Owner, Clinic Admin)
   * - Direct route access to `/billing/financials` (FinancialDashboard)
   * - Direct route access to `/payments`, `/super-admin/payments`, `/payments/:id`, `/payments/verify/:id`
   * - Dashboard shortcuts specifically leading to the portal
   *
   * Default: false (Temporarily disabled and hidden from navigation and routes)
   */
  ENABLE_FINANCIAL_SETTLEMENT_PORTAL:
    envFlag !== undefined ? envFlag === 'true' : false,
};

/**
 * Reusable helper function to check whether Financial & Settlement Portal is enabled.
 * @returns {boolean}
 */
export const isFinancialSettlementPortalEnabled = () => {
  return FEATURE_FLAGS.ENABLE_FINANCIAL_SETTLEMENT_PORTAL === true;
};

export default FEATURE_FLAGS;

