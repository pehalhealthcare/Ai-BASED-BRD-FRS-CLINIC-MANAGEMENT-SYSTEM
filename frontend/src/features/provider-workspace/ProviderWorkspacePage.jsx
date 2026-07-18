import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import PharmacyWorkspace from './PharmacyWorkspace';
import LaboratoryWorkspace from './LaboratoryWorkspace';
import GenericWorkspace from './GenericWorkspace';

const ProviderWorkspacePage = () => {
  const { type } = useParams();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';
  const { user } = useAuth();

  // If ADMIN accesses the workspace, allow preview based on type param
  const activeType = type || 'generic';

  if (activeType === 'pharmacy') {
    return <PharmacyWorkspace tab={tab} user={user} />;
  }

  if (activeType === 'laboratory') {
    return <LaboratoryWorkspace tab={tab} user={user} />;
  }

  return <GenericWorkspace tab={tab} type={activeType} user={user} />;
};

export default ProviderWorkspacePage;
