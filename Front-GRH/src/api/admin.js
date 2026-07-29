const BASE = '/admin';

export const adminApi = (axios) => ({
  createUser: (data) => axios.post(`${BASE}/users`, data),
  syncUser: (data) => axios.post(`${BASE}/users/sync`, data),
  getUsers: () => axios.get(`${BASE}/users`),
  getUser: (id) => axios.get(`${BASE}/users/${id}`),
  deactivate: (id) => axios.put(`${BASE}/users/${id}/deactivate`),
  getTemplates: () => axios.get(`${BASE}/templates`),
  createTemplate: (data) => axios.post(`${BASE}/templates`, data),
  updateTemplate: (id, data) => axios.put(`${BASE}/templates/${id}`, data),
  deleteTemplate: (id) => axios.delete(`${BASE}/templates/${id}`),
});
