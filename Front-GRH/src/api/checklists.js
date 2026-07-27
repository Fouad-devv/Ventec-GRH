const BASE = '/checklists';

export const checklistsApi = (axios) => ({
  getOrCreate: (candidateId, jobPostingId) =>
    axios.get(`${BASE}/candidate/${candidateId}/posting/${jobPostingId}`),
  update: (candidateId, jobPostingId, data) =>
    axios.put(`${BASE}/candidate/${candidateId}/posting/${jobPostingId}`, data),
  getByCandidate: (candidateId) => axios.get(`${BASE}/candidate/${candidateId}`),
});
