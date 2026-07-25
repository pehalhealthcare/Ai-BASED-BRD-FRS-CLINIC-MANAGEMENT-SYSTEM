import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { providersApi } from '../../lib/api';
import PharmacyInventoryPage from './PharmacyInventoryPage';
import LaboratoryInventoryPage from './LaboratoryInventoryPage';
import toast from 'react-hot-toast';

const ProviderInventoryPage = () => {
  const { providerId } = useParams();
  const [providerType, setProviderType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchType = async () => {
      try {
        const res = await providersApi.getProvider(providerId);
        const data = res?.data ?? res ?? null;
        setProviderType(data?.providerType || 'Pharmacy');
      } catch {
        toast.error('Failed to resolve provider type for inventory');
      } finally {
        setLoading(false);
      }
    };
    fetchType();
  }, [providerId]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-1/3" />
        <div className="grid grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (providerType === 'Laboratory') {
    return <LaboratoryInventoryPage />;
  }

  return <PharmacyInventoryPage />;
};

export default ProviderInventoryPage;

