// src/components/RequireAdmin.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // adjust path as needed

/**
 * Simple guard that only renders children if the user has admin role.
 * Otherwise redirects to home or login page.
 */
const RequireAdmin = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-64"><span className="text-stone-500">Loading...</span></div>;
  }

  if (!user || user.role !== 'admin') {
    // Not an admin – redirect to home (or login)
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RequireAdmin;
