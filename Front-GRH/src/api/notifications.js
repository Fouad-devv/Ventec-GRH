const BASE = '/notifications';

export const notificationsApi = (axios) => ({
  getAll: () => axios.get(`${BASE}/me`),
  countUnread: () => axios.get(`${BASE}/me/unread-count`),
  markRead: (id) => axios.put(`${BASE}/${id}/read`),
  markAllRead: () => axios.put(`${BASE}/me/read-all`),
});
