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
  uploadFicheFonction: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return axios.post(`${BASE}/${id}/fiche-fonction`, fd);
  },
  generateFicheFonction: (id) => axios.post(`${BASE}/${id}/generate-fiche-fonction`),
  exportDocx: (id) => axios.get(`${BASE}/${id}/export/docx`, { responseType: 'blob' }),
  exportFicheFonction: (id) => axios.get(`${BASE}/${id}/export/fiche-fonction`, { responseType: 'blob' }),
  getHistory: () => axios.get(`${BASE}/history`),
  importCvs: (id, files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    return axios.post(`${BASE}/${id}/import-cvs`, fd);
  },
});
