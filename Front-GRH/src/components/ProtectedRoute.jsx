import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { isLoading, isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) login();
  }, [isLoading, isAuthenticated, login]);

  if (isLoading)        return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="h-12 w-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" /></div>;
  if (!isAuthenticated) return null;

  return children;
};
