import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

interface AdminRouteProps {
  children: React.ReactElement;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs text-slate-500 font-medium">Verifying administrator permissions...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto my-12 bg-white p-6 rounded-xl border border-red-200 text-center space-y-3 shadow-sm">
        <div className="text-3xl text-red-500 font-bold">🚫</div>
        <h1 className="text-lg font-bold text-slate-900">Access Restricted</h1>
        <p className="text-xs text-slate-600">
          This feature is restricted strictly to municipal administrative personnel.
        </p>
      </div>
    );
  }

  return children;
};
