import apiClient from './client';
import type { Address, PaginatedResponse } from '../types';

export interface CreateAddressData {
  label: 'home' | 'work' | 'other';
  street: string;
  city: string;
  state: string;
  postal_code: string;
  is_default?: boolean;
}

export const addressAPI = {
  list: async (): Promise<PaginatedResponse<Address>> => {
    const response = await apiClient.get('/users/addresses/');
    return response.data;
  },

  create: async (data: CreateAddressData): Promise<Address> => {
    const response = await apiClient.post('/users/addresses/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CreateAddressData>): Promise<Address> => {
    const response = await apiClient.patch(`/users/addresses/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/addresses/${id}/`);
  },

  setDefault: async (id: number): Promise<Address> => {
    const response = await apiClient.patch(`/users/addresses/${id}/`, { is_default: true });
    return response.data;
  },
};
