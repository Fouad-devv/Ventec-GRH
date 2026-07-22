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

  if (isLoading)                              return <p className="p-10 text-center">Chargement...</p>;
  if (!isAuthenticated || !hasRole('ADMIN')) return null;

  return children;
};
