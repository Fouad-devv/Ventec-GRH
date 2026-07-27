const BASE = '/admin';

export const adminApi = (axios) => ({
  syncUser: (data) => axios.post(`${BASE}/users/sync`, data),
  getUsers: () => axios.get(`${BASE}/users`),
  getUser: (id) => axios.get(`${BASE}/users/${id}`),
  deactivate: (id) => axios.put(`${BASE}/users/${id}/deactivate`),
});
