import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Token management functions
export const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

export const clearTokens = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// Exponential backoff delay calculation
const getRetryDelay = (retryCount: number): number => {
  return INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
};

// Sleep utility for retry delays
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Check if error is retryable
const isRetryableError = (error: AxiosError): boolean => {
  if (!error.response) {
    // Network errors are retryable
    return true;
  }
  
  const status = error.response.status;
  // Retry on 5xx server errors and 408 timeout
  return status >= 500 || status === 408;
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add access token to headers
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Initialize retry count
    if (!config.headers['X-Retry-Count']) {
      config.headers['X-Retry-Count'] = '0';
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle token refresh, retries, and errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - Token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(
          `${API_BASE_URL}/auth/token/refresh/`,
          { refresh: refreshToken }
        );

        const { access, refresh } = response.data;
        setTokens(access, refresh);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle retryable errors with exponential backoff
    const retryCount = parseInt(originalRequest.headers['X-Retry-Count'] as string || '0');
    
    if (isRetryableError(error) && retryCount < MAX_RETRIES) {
      const newRetryCount = retryCount + 1;
      originalRequest.headers['X-Retry-Count'] = newRetryCount.toString();
      
      const delay = getRetryDelay(retryCount);
      await sleep(delay);
      
      return apiClient(originalRequest);
    }

    // Enhance error with user-friendly message
    return Promise.reject(enhanceError(error));
  }
);

// Enhance error with user-friendly messages
const enhanceError = (error: AxiosError): AxiosError => {
  if (!error.response) {
    // Network error
    error.message = 'Network error. Please check your internet connection and try again.';
  } else {
    const status = error.response.status;
    
    switch (status) {
      case 400:
        // Bad request - validation errors
        error.message = 'Invalid request. Please check your input and try again.';
        break;
      case 401:
        // Unauthorized
        error.message = 'Your session has expired. Please log in again.';
        break;
      case 403:
        // Forbidden
        error.message = 'You do not have permission to perform this action.';
        break;
      case 404:
        // Not found
        error.message = 'The requested resource was not found.';
        break;
      case 408:
        // Timeout
        error.message = 'Request timeout. Please try again.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        // Server errors
        error.message = 'Server error. Please try again later.';
        break;
      default:
        error.message = 'An unexpected error occurred. Please try again.';
    }
  }
  
  return error;
};

export default apiClient;
