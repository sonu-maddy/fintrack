import axios from 'axios';

// Same-origin by default (nginx / Vercel rewrite / Vite proxy). VITE_API_URL is an optional override.
const baseURL = `${import.meta.env.VITE_API_URL || ''}/api`;

let accessToken = null; // kept in memory only, never in localStorage
let refreshPromise = null;
let onAuthFailure = () => {};

export const setAccessToken = (token) => { accessToken = token; };
export const setAuthFailureHandler = (fn) => { onAuthFailure = fn; };

const options = { baseURL, withCredentials: true, timeout: 60000 }; // long timeout: free hosts can take ~60s to wake up
const api = axios.create(options);
const bare = axios.create(options); // no interceptors, used for the refresh call itself

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// One refresh at a time: parallel callers (and React StrictMode double effects) share the same promise.
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = bare
      .post('/auth/refresh')
      .then(({ data }) => {
        accessToken = data.data.accessToken;
        return true;
      })
      .catch(() => {
        accessToken = null;
        return false;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthCall = AUTH_PATHS.some((p) => (original?.url || '').startsWith(p));
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      if (await refreshSession()) {
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      }
      onAuthFailure();
    }
    return Promise.reject(error);
  },
);

export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ECONNABORTED') return 'The server is taking a while to wake up. Please try again in a moment.';
  if (err?.message === 'Network Error') return 'Cannot reach the server. Check your connection and try again.';
  return fallback;
};

export default api;
