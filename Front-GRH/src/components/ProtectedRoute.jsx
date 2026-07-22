import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { isLoading, isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) login();
  }, [isLoading, isAuthenticated, login]);

  if (isLoading)        return <p className="p-10 text-center">Chargement...</p>;
  if (!isAuthenticated) return null;

  return children;
};
