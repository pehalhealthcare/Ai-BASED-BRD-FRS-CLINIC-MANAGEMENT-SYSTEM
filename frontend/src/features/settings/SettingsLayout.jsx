import React from 'react';
import { Navigate } from 'react-router-dom';

const SettingsLayout = () => {
  return <Navigate to="/settings/payment" replace />;
};

export default SettingsLayout;
