import React from 'react';
import { useParams, useSearchParams, useLocation, Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import PharmacyWorkspace from './PharmacyWorkspace';
import LaboratoryWorkspace from './LaboratoryWorkspace';
import GenericWorkspace from './GenericWorkspace';

const ProviderWorkspacePage = ({ type: propType }) => {
  const { type: paramType, laboratoryId, tab: routeTab } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const queryTab = searchParams.get('tab');
  const queryLabId = searchParams.get('labId');

  let tab = routeTab || queryTab;
  if (!tab) {
    if (location.pathname.startsWith('/sample-collection')) {
      tab = 'collection';
    } else if (location.pathname.startsWith('/qc-calibration')) {
      tab = 'qc';
    } else if (location.pathname.startsWith('/reports-analytics')) {
      tab = 'analytics';
    } else {
      tab = 'dashboard';
    }
  }

  const { user } = useAuth();

  // If ADMIN accesses the workspace, allow preview based on type param
  const activeType = propType || paramType || 'generic';

  if (activeType === 'pharmacy') {
    return <PharmacyWorkspace tab={tab} user={user} />;
  }

  if (activeType === 'laboratory') {
    const finalLabId = laboratoryId || queryLabId || user?.providerId;
    if (finalLabId && (!laboratoryId || routeTab !== tab)) {
      return <Navigate to={`/laboratory/${finalLabId}/${tab}`} replace />;
    }
    return <LaboratoryWorkspace tab={tab} user={user} laboratoryId={finalLabId} />;
  }

  return <GenericWorkspace tab={tab} type={activeType} user={user} />;
};

export default ProviderWorkspacePage;
