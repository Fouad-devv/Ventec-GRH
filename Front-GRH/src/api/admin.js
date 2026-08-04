const BASE = '/admin';

export const adminApi = (axios) => ({
  createUser: (data) => axios.post(`${BASE}/users`, data),
  syncUser: (data) => axios.post(`${BASE}/users/sync`, data),
  getUsers: () => axios.get(`${BASE}/users`),
  getUser: (id) => axios.get(`${BASE}/users/${id}`),
  updateUser: (id, data) => axios.put(`${BASE}/users/${id}`, data),
  deleteUser: (id) => axios.delete(`${BASE}/users/${id}`),
  deactivate: (id) => axios.put(`${BASE}/users/${id}/deactivate`),
});
