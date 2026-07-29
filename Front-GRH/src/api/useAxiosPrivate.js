import axios from 'axios';
import keycloak from '../keycloak/keycloak';

const axiosPrivate = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach token at request time — no effect/closure timing issues
axiosPrivate.interceptors.request.use((config) => {
  const token = keycloak.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const useAxiosPrivate = () => axiosPrivate;

export default useAxiosPrivate;
