const BASE = '/email-candidatures';

export const emailCandidaturesApi = (axios) => ({
  getAll:  ()   => axios.get(BASE),
  delete:  (id) => axios.delete(`${BASE}/${id}`),
  deleteAll: () => axios.delete(BASE),
});
