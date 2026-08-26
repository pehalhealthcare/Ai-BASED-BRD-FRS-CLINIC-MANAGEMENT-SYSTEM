import React from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import PharmacyWorkspace from './PharmacyWorkspace';
import LaboratoryWorkspace from './LaboratoryWorkspace';
import GenericWorkspace from './GenericWorkspace';

const ProviderWorkspacePage = ({ type: propType }) => {
  const { type: paramType, laboratoryId, tab: routeTab } = useParams();
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  const queryLabId = searchParams.get('labId');
  const tab = routeTab || queryTab || 'dashboard';
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
