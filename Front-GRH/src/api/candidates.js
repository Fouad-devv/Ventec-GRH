const BASE = '/candidates';

export const candidatesApi = (axios) => ({
  getAll: (params) => axios.get(BASE, { params }),
  get: (id) => axios.get(`${BASE}/${id}`),
  create: (formData) => axios.post(BASE, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, params) => axios.put(`${BASE}/${id}`, null, { params }),
  delete: (id) => axios.delete(`${BASE}/${id}`),
  cvUrl: (id) => `${import.meta.env.VITE_API_URL}/candidates/${id}/cv`,
  extractCv: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return axios.post(`${BASE}/extract-cv`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  checklistDocxUrl: (candidateId, postingId) =>
    `${import.meta.env.VITE_API_URL}/checklists/candidate/${candidateId}/posting/${postingId}/export/docx`,
});
