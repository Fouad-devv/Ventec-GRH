const BASE = '/postings';

export const postingsApi = (axios) => ({
  getAll: (params) => axios.get(BASE, { params }),
  get: (id) => axios.get(`${BASE}/${id}`),
  create: (data) => axios.post(BASE, data),
  update: (id, data) => axios.put(`${BASE}/${id}`, data),
  publish: (id) => axios.put(`${BASE}/${id}/publish`),
  close: (id) => axios.put(`${BASE}/${id}/close`),
  delete: (id) => axios.delete(`${BASE}/${id}`),
});
