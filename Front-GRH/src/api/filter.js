const BASE = '/filter';

export const filterApi = (axios) => ({
  requestFilter: (jobPostingId) => axios.post(`${BASE}/${jobPostingId}`),
  getFilterJob: (filterJobId) => axios.get(`${BASE}/${filterJobId}`),
  getForPosting: (jobPostingId) => axios.get(`${BASE}/posting/${jobPostingId}`),
});
