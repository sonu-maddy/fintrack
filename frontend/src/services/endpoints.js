import api from './api';

const unwrap = (promise) => promise.then((res) => res.data.data);

export const authApi = {
  register: (body) => unwrap(api.post('/auth/register', body)),
  login: (body) => unwrap(api.post('/auth/login', body)),
  logout: () => unwrap(api.post('/auth/logout')),
  me: () => unwrap(api.get('/auth/me')),
};

export const transactionApi = {
  list: (params) => unwrap(api.get('/transactions', { params })),
  get: (id) => unwrap(api.get(`/transactions/${id}`)),
  create: (body) => unwrap(api.post('/transactions', body)),
  update: (id, body) => unwrap(api.put(`/transactions/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/transactions/${id}`)),
  summary: (month) => unwrap(api.get('/transactions/summary', { params: { month } })),
  trend: (to, months = 6) => unwrap(api.get('/transactions/trend', { params: { to, months } })),
};

export const notificationApi = {
  list: (params) => unwrap(api.get('/notifications', { params })),
  markRead: (id) => unwrap(api.patch(`/notifications/${id}/read`)),
  markAllRead: () => unwrap(api.patch('/notifications/read-all')),
  getThreshold: () => unwrap(api.get('/settings/threshold')),
  setThreshold: (threshold) => unwrap(api.put('/settings/threshold', { threshold })),
};
