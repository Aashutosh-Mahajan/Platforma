import apiClient from './client';
import { setTokens, clearTokens } from './client';
import type { User, AuthResponse, RegisterResponse } from '../types';

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
  register: async (data: RegisterData): Promise<RegisterResponse> => {
    const response = await apiClient.post('/auth/register/', data);
    const { tokens } = response.data;
    setTokens(tokens.access, tokens.refresh);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login/', data);
    const { access, refresh } = response.data;
    setTokens(access, refresh);
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
