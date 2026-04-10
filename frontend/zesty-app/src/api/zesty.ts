import apiClient from './client';
import type { Restaurant, MenuItem, Order, Review, DeliveryTracking, PaginatedResponse } from '../types';

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeRestaurant = (raw: Restaurant): Restaurant => ({
  ...raw,
  id: toNumber(raw.id, 0),
  price_range: toNumber(raw.price_range, 1),
  delivery_fee: toNumber(raw.delivery_fee, 0),
  delivery_time_min: toNumber(raw.delivery_time_min, 20),
  delivery_time_max: toNumber(raw.delivery_time_max, 40),
  rating: toNumber(raw.rating, 0),
  review_count: toNumber(raw.review_count, 0),
});

const normalizeReview = (raw: Review): Review => ({
  ...raw,
  rating: toNumber(raw.rating, 0),
});

const normalizeMenuItem = (raw: MenuItem): MenuItem => ({
  ...raw,
  id: toNumber(raw.id, 0),
  restaurant: toNumber(raw.restaurant, 0),
  price: toNumber(raw.price, 0),
});

const normalizeOrderItem = (raw: Order['items'][number]): Order['items'][number] => ({
  ...raw,
  id: typeof raw.id === 'string' ? raw.id : toNumber(raw.id, 0),
  menu_item: raw.menu_item ? normalizeMenuItem(raw.menu_item) : null,
  quantity: toNumber(raw.quantity, 1),
  unit_price: toNumber(raw.unit_price, 0),
  total: toNumber(raw.total, 0),
});

const normalizeOrder = (raw: Order): Order => ({
  ...raw,
  user: toNumber(raw.user, 0),
  restaurant: toNumber(raw.restaurant, 0),
  restaurant_name: raw.restaurant_name || '',
  items: Array.isArray(raw.items) ? raw.items.map(normalizeOrderItem) : [],
  subtotal: toNumber(raw.subtotal, 0),
  delivery_fee: toNumber(raw.delivery_fee, 0),
  tax: toNumber(raw.tax, 0),
  total: toNumber(raw.total, 0),
  delivery_address: raw.delivery_address && typeof raw.delivery_address === 'object'
    ? raw.delivery_address
    : null,
  estimated_delivery: raw.estimated_delivery || null,
  actual_delivery: raw.actual_delivery || null,
  special_instructions: raw.special_instructions || '',
});

const normalizeTrackingTimeline = (timeline: unknown): Array<{ status: string; at: string }> => {
  if (!Array.isArray(timeline)) {
    return [];
  }

  return timeline
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      status: typeof item.status === 'string' ? item.status : 'pending',
      at: typeof item.at === 'string' ? item.at : '',
    }))
    .filter((item) => item.at.length > 0);
};

const normalizeTracking = (raw: DeliveryTracking): DeliveryTracking => ({
  ...raw,
  order_status: raw.order_status || 'pending',
  delivery_partner_name: raw.delivery_partner_name || 'Delivery Partner',
  delivery_partner_phone: raw.delivery_partner_phone || '',
  status_timeline: normalizeTrackingTimeline(raw.status_timeline),
  eta: raw.eta || null,
});

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
    menu_item_name?: string;
    unit_price?: number;
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
    return {
      ...response.data,
      results: (response.data.results || []).map(normalizeRestaurant),
    };
  },

  retrieve: async (id: number): Promise<Restaurant> => {
    const response = await apiClient.get(`/zesty/restaurants/${id}/`);
    return normalizeRestaurant(response.data);
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
    return {
      ...response.data,
      results: (response.data.results || []).map(normalizeReview),
    };
  },

  createReview: async (id: number, data: ReviewCreateData): Promise<Review> => {
    const response = await apiClient.post(`/zesty/restaurants/${id}/reviews/`, data);
    return normalizeReview(response.data);
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
    return {
      ...response.data,
      results: (response.data.results || []).map(normalizeOrder),
    };
  },

  create: async (data: OrderCreateData): Promise<Order> => {
    const response = await apiClient.post('/zesty/orders/', data);
    return normalizeOrder(response.data);
  },

  retrieve: async (id: string | number): Promise<Order> => {
    const response = await apiClient.get(`/zesty/orders/${id}/`);
    return normalizeOrder(response.data);
  },

  cancel: async (id: string | number): Promise<Order> => {
    const response = await apiClient.patch(`/zesty/orders/${id}/cancel/`);
    return normalizeOrder(response.data);
  },

  getTracking: async (id: string | number): Promise<DeliveryTracking> => {
    const response = await apiClient.get(`/zesty/orders/${id}/tracking/`);
    return normalizeTracking(response.data);
  },

  updateStatus: async (id: string | number, status: string): Promise<Order> => {
    const response = await apiClient.patch(`/zesty/orders/${id}/update_status/`, { status });
    return normalizeOrder(response.data);
  },
};
