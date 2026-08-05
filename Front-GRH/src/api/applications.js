const BASE = '/applications';

export const applicationsApi = (axios) => ({
  get: (id) => axios.get(`${BASE}/${id}`),
  getByPosting: (jobPostingId) => axios.get(`${BASE}/posting/${jobPostingId}`),
  getByCandidate: (candidateId) => axios.get(`${BASE}/candidate/${candidateId}`),
  updateStatus: (id, data) => axios.put(`${BASE}/${id}/status`, data),
  delete: (id) => axios.delete(`${BASE}/${id}`),
  downloadDocumentsList: (id) =>
    axios.get(`${BASE}/${id}/documents-list`, { responseType: 'blob' }),
  downloadDocumentsListPdf: (id) =>
    axios.get(`${BASE}/${id}/documents-list-pdf`, { responseType: 'blob' }),
  sendRejectionEmails: (jobPostingId) =>
    axios.post(`${BASE}/posting/${jobPostingId}/send-rejection-emails`),
});
