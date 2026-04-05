import apiClient from './client';
import type { Notification, PaginatedResponse } from '../types';

export const notificationAPI = {
  list: async (unread?: boolean): Promise<PaginatedResponse<Notification>> => {
    const params = unread ? { unread: true } : {};
    const response = await apiClient.get('/notifications/', { params });
    return response.data;
  },

  markAsRead: async (id: number): Promise<Notification> => {
    const response = await apiClient.patch(`/notifications/${id}/mark_read/`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ message: string }> => {
    const response = await apiClient.patch('/notifications/mark_all_read/');
    return response.data;
  },
};

export interface SearchParams {
  query: string;
  scope?: 'all' | 'restaurants' | 'events' | 'menu';
  limit?: number;
}

export const searchAPI = {
  search: async (params: SearchParams): Promise<any> => {
    const response = await apiClient.get('/search/', { params });
    return response.data;
  },
};
