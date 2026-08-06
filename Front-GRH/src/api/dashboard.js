export const dashboardApi = (axios) => ({
  getStats: () => axios.get('/dashboard/stats'),
  getYearBreakdown: (year) => axios.get('/dashboard/year-breakdown', { params: { year } }),
});
