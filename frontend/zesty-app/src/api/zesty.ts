import apiClient from './client';
import type { Restaurant, MenuItem, Order, Review, DeliveryTracking, PaginatedResponse } from '../types';

export interface RestaurantListParams {
  search?: string;
  area?: string;
  cuisine?: string;
  veg_only?: boolean;
  price_range?: number;
  is_open?: boolean;
  ordering?: string;
  page?: number;
}

export interface MenuItemListParams {
  category?: string;
  search?: string;
}

export interface OrderCreateData {
  restaurant_id: number;
  delivery_address_id: number;
  special_instructions?: string;
  payment_method: string;
  items: Array<{
    menu_item_id: number;
    quantity: number;
  }>;
}

export interface ReviewCreateData {
  rating: number;
  comment?: string;
}

export interface RestaurantCreateData {
  name: string;
  description: string;
  cuisine_types: string;
  address: string;
  phone: string;
  delivery_fee: number;
  delivery_time_min: number;
  delivery_time_max: number;
  image?: File;
  banner?: File;
}

export interface MenuItemCreateData {
  restaurant: number;
  name: string;
  description: string;
  price: number;
  category: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  image?: File;
}

export const restaurantAPI = {
  list: async (params?: RestaurantListParams): Promise<PaginatedResponse<Restaurant>> => {
    const response = await apiClient.get('/zesty/restaurants/', { params });
    return response.data;
  },

  retrieve: async (id: number): Promise<Restaurant> => {
    const response = await apiClient.get(`/zesty/restaurants/${id}/`);
    return response.data;
  },

  create: async (data: RestaurantCreateData): Promise<Restaurant> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
    });
    const response = await apiClient.post('/zesty/restaurants/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  update: async (id: number, data: Partial<RestaurantCreateData>): Promise<Restaurant> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
    });
    const response = await apiClient.patch(`/zesty/restaurants/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/zesty/restaurants/${id}/`);
  },

  toggleActive: async (id: number): Promise<Restaurant> => {
    const response = await apiClient.patch(`/zesty/restaurants/${id}/toggle_active/`);
    return response.data;
  },

  getMenu: async (id: number, params?: MenuItemListParams): Promise<PaginatedResponse<MenuItem>> => {
    const response = await apiClient.get(`/zesty/restaurants/${id}/menu/`, { params });
    return response.data;
  },

  getReviews: async (id: number): Promise<PaginatedResponse<Review>> => {
    const response = await apiClient.get(`/zesty/restaurants/${id}/reviews/`);
    return response.data;
  },

  createReview: async (id: number, data: ReviewCreateData): Promise<Review> => {
    const response = await apiClient.post(`/zesty/restaurants/${id}/reviews/`, data);
    return response.data;
  },
};

export const menuItemAPI = {
  list: async (): Promise<PaginatedResponse<MenuItem>> => {
    const response = await apiClient.get('/zesty/menu-items/');
    return response.data;
  },

  create: async (data: MenuItemCreateData): Promise<MenuItem> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
    });
    const response = await apiClient.post('/zesty/menu-items/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  update: async (id: number, data: Partial<MenuItemCreateData>): Promise<MenuItem> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
    });
    const response = await apiClient.patch(`/zesty/menu-items/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/zesty/menu-items/${id}/`);
  },

  toggleAvailable: async (id: number): Promise<MenuItem> => {
    const response = await apiClient.patch(`/zesty/menu-items/${id}/toggle_available/`);
    return response.data;
  },
};

export const orderAPI = {
  list: async (status?: string): Promise<PaginatedResponse<Order>> => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/zesty/orders/', { params });
    return response.data;
  },

  create: async (data: OrderCreateData): Promise<Order> => {
    const response = await apiClient.post('/zesty/orders/', data);
    return response.data;
  },

  retrieve: async (id: number): Promise<Order> => {
    const response = await apiClient.get(`/zesty/orders/${id}/`);
    return response.data;
  },

  cancel: async (id: number): Promise<Order> => {
    const response = await apiClient.patch(`/zesty/orders/${id}/cancel/`);
    return response.data;
  },

  getTracking: async (id: number): Promise<DeliveryTracking> => {
    const response = await apiClient.get(`/zesty/orders/${id}/tracking/`);
    return response.data;
  },

  updateStatus: async (id: number, status: string): Promise<Order> => {
    const response = await apiClient.patch(`/zesty/orders/${id}/update_status/`, { status });
    return response.data;
  },
};
