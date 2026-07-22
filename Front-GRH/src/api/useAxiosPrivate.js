import { useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const axiosPrivate = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

const useAxiosPrivate = () => {
  const { getToken, isAuthenticated } = useAuth();

  useEffect(() => {
    const requestIntercept = axiosPrivate.interceptors.request.use((config) => {
      if (!isAuthenticated) return config;

      const token = getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;

      return config;
    });

    return () => axiosPrivate.interceptors.request.eject(requestIntercept);
  }, [getToken, isAuthenticated]);

  return axiosPrivate;
};

export default useAxiosPrivate;
