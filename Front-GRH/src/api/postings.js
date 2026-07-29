const BASE = '/postings';

export const postingsApi = (axios) => ({
  getAll: (params) => axios.get(BASE, { params }),
  get: (id) => axios.get(`${BASE}/${id}`),
  create: (data) => axios.post(BASE, data),
  update: (id, data) => axios.put(`${BASE}/${id}`, data),
  publish: (id) => axios.put(`${BASE}/${id}/publish`),
  close: (id) => axios.put(`${BASE}/${id}/close`),
  delete: (id) => axios.delete(`${BASE}/${id}`),
  generateDescription: (data) => axios.post(`${BASE}/generate-description`, data),
  duplicate: (id) => axios.post(`${BASE}/${id}/duplicate`),
  exportDocxUrl: (id) => `${import.meta.env.VITE_API_URL}/postings/${id}/export/docx`,
  getHistory: () => axios.get(`${BASE}/history`),
});
