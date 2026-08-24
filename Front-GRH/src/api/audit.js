const BASE = '/admin/audit-logs';

export const auditApi = (axios) => ({
  getAll: (params) => axios.get(BASE, { params }),
  getMeta: () => axios.get(`${BASE}/meta`),
});
