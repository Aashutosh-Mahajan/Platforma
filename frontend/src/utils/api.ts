import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

type TokenPair = {
  access: string;
  refresh: string;
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getStoredTokens(): TokenPair | null {
  if (typeof window === 'undefined') return null;

  const tokensStr = localStorage.getItem('platforma-tokens');
  if (!tokensStr) return null;

  try {
    return JSON.parse(tokensStr) as TokenPair;
  } catch {
    return null;
  }
}

export function clearStoredAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('platforma-tokens');
  localStorage.removeItem('platforma-user');
}

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
  const tokens = getStoredTokens();
  if (tokens) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
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
        const tokens = getStoredTokens();
        if (tokens) {
          const res = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh: tokens.refresh });

          const newTokens: TokenPair = {
            access: res.data.access,
            refresh: res.data.refresh ?? tokens.refresh,
          };
          localStorage.setItem('platforma-tokens', JSON.stringify(newTokens));
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return api(originalRequest);
        }
      } catch {
        clearStoredAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
