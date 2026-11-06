import React from 'react';
import { Navigate } from 'react-router-dom';
import { isFinancialSettlementPortalEnabled } from '../config/featureFlags';

/**
 * FeatureRouteGuard
 * Protects routes controlled by the Financial & Settlement Portal feature flag.
 * If the portal is temporarily disabled, attempts to access it via direct URL
 * will redirect to the specified dashboard route with history replacement to
 * prevent back/forward navigation loops.
 */
export const FinancialPortalRouteGuard = ({ children, redirectTo = '/dashboard' }) => {
  if (!isFinancialSettlementPortalEnabled()) {
    return <Navigate to={redirectTo} replace />;
  }
  return children;
};

export default FinancialPortalRouteGuard;

