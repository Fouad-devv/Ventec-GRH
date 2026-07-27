const BASE = '/interviews';

export const interviewsApi = (axios) => ({
  schedule: (data) => axios.post(BASE, data),
  get: (id) => axios.get(`${BASE}/${id}`),
  getByApplication: (applicationId) => axios.get(`${BASE}/application/${applicationId}`),
  update: (id, data) => axios.put(`${BASE}/${id}`, data),
  cancel: (id) => axios.put(`${BASE}/${id}/cancel`),
});
