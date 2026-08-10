export const accountApi = (axios) => ({
  changePassword: (data) => axios.put('/account/password', data),
});
