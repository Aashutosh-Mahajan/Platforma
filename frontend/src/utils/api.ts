import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const tokensStr = localStorage.getItem('platforma-tokens');
    if (tokensStr) {
      try {
        const tokens = JSON.parse(tokensStr);
        config.headers.Authorization = `Bearer ${tokens.access}`;
      } catch {
        // ignore
      }
    }
  }
  return config;
});

// Response interceptor — handle 401 (token expired)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokensStr = localStorage.getItem('platforma-tokens');
        if (tokensStr) {
          const tokens = JSON.parse(tokensStr);
          const res = await axios.post(`${API_URL}/auth/token/refresh/`, {
            refresh: tokens.refresh,
          });

          const newTokens = { access: res.data.access, refresh: tokens.refresh };
          localStorage.setItem('platforma-tokens', JSON.stringify(newTokens));
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem('platforma-tokens');
        localStorage.removeItem('platforma-user');
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
