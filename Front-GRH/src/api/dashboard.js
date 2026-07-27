export const dashboardApi = (axios) => ({
  getStats: () => axios.get('/dashboard/stats'),
});
