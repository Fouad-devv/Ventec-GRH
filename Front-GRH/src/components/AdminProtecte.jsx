import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AdminRouteProtector = ({ children }) => {
  const { isLoading, isAuthenticated, hasRole, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      login();
    } else if (!isLoading && isAuthenticated && !hasRole('ADMIN')) {
      navigate('/', { replace: true });
    }
  }, [isLoading, isAuthenticated, hasRole, login, navigate]);

  if (isLoading)                              return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="h-12 w-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" /></div>;
  if (!isAuthenticated || !hasRole('ADMIN')) return null;

  return children;
};
