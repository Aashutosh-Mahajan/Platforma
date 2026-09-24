import apiClient from './client';
import { setTokens, clearTokens } from './client';
import type { User, AuthResponse } from '../types';

/** Returned when a 6-digit code has been (or recently was) emailed. */
export interface CodeSent {
  email?: string;
  resend_in?: number;
  expires_in?: number;
  /** Only present when the backend runs with DEBUG on. */
  dev_code?: string;
  message?: string;
  detail?: string;
}

export interface RegisterResult extends CodeSent {
  requires_verification: boolean;
  email: string;
}

/** Raised by login when the password is right but the email isn't verified yet. */
export class EmailNotVerifiedError extends Error {
  info: CodeSent;
  constructor(info: CodeSent) {
    super(info.detail || 'Please confirm your email to finish signing in.');
    this.name = 'EmailNotVerifiedError';
    this.info = info;
  }
}

/**
 * Pull readable messages out of an API error. The backend wraps validation
 * errors as {error: {details: [{field, message}]}}; plain DRF errors use
 * {detail} or {field: [messages]}.
 */
export const parseApiError = (err: any): { fields: Record<string, string>; message: string } => {
  const data = err?.response?.data;
  const fields: Record<string, string> = {};
  if (data?.error?.details && Array.isArray(data.error.details)) {
    for (const d of data.error.details) {
      const key = d.field || 'non_field_errors';
      if (!fields[key]) fields[key] = String(d.message);
    }
  } else if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (key === 'detail') continue;
      if (Array.isArray(value) && value.length) fields[key] = String(value[0]);
      else if (typeof value === 'string') fields[key] = value;
    }
  }
  const message =
    fields.non_field_errors ||
    data?.detail ||
    (Object.keys(fields).length ? '' : err?.response ? 'Something went wrong. Please try again.' : err?.message || 'Network error. Check your connection.');
  return { fields, message };
};

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  restaurant_name?: string;
  company_name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const authAPI = {
  /** Creates the account and emails a code. No session until the code is confirmed. */
  register: async (data: RegisterData): Promise<RegisterResult> => {
    const response = await apiClient.post('/auth/register/', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post('/auth/login/', data);
      const { access, refresh } = response.data;
      setTokens(access, refresh);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 403 && err.response.data?.reason === 'email_not_verified') {
        throw new EmailNotVerifiedError(err.response.data);
      }
      throw err;
    }
  },

  verifyCode: async (email: string, code: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/verify-code', { email, code });
    const { access, refresh } = response.data;
    setTokens(access, refresh);
    return response.data;
  },

  resendCode: async (email: string): Promise<CodeSent> => {
    const response = await apiClient.post('/auth/resend-code', { email });
    return response.data;
  },

  requestPasswordReset: async (email: string): Promise<CodeSent> => {
    const response = await apiClient.post('/auth/password-reset/code', { email });
    return response.data;
  },

  confirmPasswordReset: async (email: string, code: string, newPassword: string, confirm: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/password-reset/confirm', {
      email, code, new_password: newPassword, new_password_confirm: confirm,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout/', { refresh: refreshToken });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    clearTokens();
  },

  refreshToken: async (): Promise<AuthResponse> => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const response = await apiClient.post('/auth/token/refresh/', { refresh: refreshToken });
    const { access, refresh } = response.data;
    setTokens(access, refresh);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get('/users/profile/');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch('/users/profile/', data);
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/password/change/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },
};
