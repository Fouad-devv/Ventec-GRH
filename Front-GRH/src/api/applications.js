const BASE = '/applications';

export const applicationsApi = (axios) => ({
  get: (id) => axios.get(`${BASE}/${id}`),
  getByPosting: (jobPostingId) => axios.get(`${BASE}/posting/${jobPostingId}`),
  getByCandidate: (candidateId) => axios.get(`${BASE}/candidate/${candidateId}`),
  updateStatus: (id, data) => axios.put(`${BASE}/${id}/status`, data),
});
