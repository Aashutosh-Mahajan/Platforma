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
  discount: toNumber(raw.discount, 0),
  promo_code: raw.promo_code || '',
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
  promo_code?: string;
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

export interface Payout {
  id: number;
  restaurant: number;
  restaurant_name: string;
  period_start: string;
  period_end: string;
  order_count: number;
  gross_revenue: number | string;
  commission_rate: number | string;
  commission_amount: number | string;
  net_amount: number | string;
  status: 'pending' | 'paid';
  paid_at: string | null;
  notes: string;
  created_at: string;
}

export interface EarningsSummary {
  commission_rate: number;
  unsettled: {
    period_start: string;
    period_end: string;
    order_count: number;
    gross_revenue: number;
    commission_amount: number;
    net_amount: number;
  };
  payouts: Payout[];
}

const normalizePayout = (raw: Payout): Payout => ({
  ...raw,
  gross_revenue: toNumber(raw.gross_revenue, 0),
  commission_rate: toNumber(raw.commission_rate, 0),
  commission_amount: toNumber(raw.commission_amount, 0),
  net_amount: toNumber(raw.net_amount, 0),
});

const normalizeEarnings = (raw: EarningsSummary): EarningsSummary => ({
  commission_rate: toNumber(raw.commission_rate, 0),
  unsettled: {
    ...raw.unsettled,
    order_count: toNumber(raw.unsettled?.order_count, 0),
    gross_revenue: toNumber(raw.unsettled?.gross_revenue, 0),
    commission_amount: toNumber(raw.unsettled?.commission_amount, 0),
    net_amount: toNumber(raw.unsettled?.net_amount, 0),
  },
  payouts: (raw.payouts || []).map(normalizePayout),
});

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

  getEarnings: async (id: number): Promise<EarningsSummary> => {
    const response = await apiClient.get(`/zesty/restaurants/${id}/earnings/`);
    return normalizeEarnings(response.data);
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

// ---- Cart (backend-persisted — see backend/zesty/views.py CartView et al.) ----

export interface BackendCartItem {
  id: number;
  menu_item: number;
  menu_item_name: string;
  menu_item_detail: MenuItem;
  unit_price: number | string;
  quantity: number;
  line_total: number | string;
}

export interface BackendCart {
  id: number;
  restaurant: number | null;
  restaurant_name: string | null;
  restaurant_detail: Restaurant | null;
  items: BackendCartItem[];
  subtotal: number | string;
  updated_at: string;
}

export interface CartConflictError {
  isCartConflict: true;
  currentRestaurant: number;
  requestedRestaurant: number;
}

const normalizeCart = (raw: BackendCart): BackendCart => ({
  ...raw,
  items: (raw.items || []).map((item) => ({
    ...item,
    menu_item: toNumber(item.menu_item, 0),
    quantity: toNumber(item.quantity, 1),
    unit_price: toNumber(item.unit_price, 0),
    line_total: toNumber(item.line_total, 0),
    menu_item_detail: item.menu_item_detail
      ? { ...normalizeMenuItem(item.menu_item_detail), restaurant: toNumber(raw.restaurant, 0) }
      : item.menu_item_detail,
  })),
  restaurant: raw.restaurant != null ? toNumber(raw.restaurant, 0) : null,
  restaurant_detail: raw.restaurant_detail ? normalizeRestaurant(raw.restaurant_detail) : null,
  subtotal: toNumber(raw.subtotal, 0),
});

export const cartAPI = {
  get: async (): Promise<BackendCart> => {
    const response = await apiClient.get('/zesty/cart');
    return normalizeCart(response.data);
  },

  /** Throws an Axios error whose `response.data.error.details` carries a
   * `current_restaurant`/`requested_restaurant` pair when the cart holds
   * items from a different restaurant — caller decides whether to retry
   * with confirmSwitch. */
  addItem: async (menuItemId: number, quantity: number, confirmSwitch = false): Promise<BackendCart & { cart_was_cleared?: boolean }> => {
    const response = await apiClient.post('/zesty/cart/items', {
      menu_item_id: menuItemId,
      quantity,
      confirm_switch: confirmSwitch,
    });
    return normalizeCart(response.data) as BackendCart & { cart_was_cleared?: boolean };
  },

  updateItem: async (cartItemId: number, quantity: number): Promise<BackendCart> => {
    const response = await apiClient.patch(`/zesty/cart/items/${cartItemId}`, { quantity });
    return normalizeCart(response.data);
  },

  removeItem: async (cartItemId: number): Promise<void> => {
    await apiClient.delete(`/zesty/cart/items/${cartItemId}`);
  },
};

// ---- Promotions (owner-managed discount codes) ----

export interface Promotion {
  id: number;
  restaurant: number | null;
  code: string;
  description: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number | string;
  min_order_value: number | string;
  max_discount_amount: number | string | null;
  usage_limit: number | null;
  times_used: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PromotionCreateData {
  restaurant: number;
  code: string;
  description?: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_value?: number;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
}

export interface PromoValidationResult {
  code: string;
  discount: number;
  description: string;
}

const normalizePromotion = (raw: Promotion): Promotion => ({
  ...raw,
  restaurant: raw.restaurant != null ? toNumber(raw.restaurant, 0) : null,
  discount_value: toNumber(raw.discount_value, 0),
  min_order_value: toNumber(raw.min_order_value, 0),
  max_discount_amount: raw.max_discount_amount != null ? toNumber(raw.max_discount_amount, 0) : null,
  times_used: toNumber(raw.times_used, 0),
});

export const promotionAPI = {
  list: async (restaurantId?: number): Promise<Promotion[]> => {
    const response = await apiClient.get('/zesty/promotions/', {
      params: restaurantId ? { restaurant: restaurantId } : undefined,
    });
    const results = Array.isArray(response.data.results) ? response.data.results : response.data;
    return (results || []).map(normalizePromotion);
  },

  create: async (data: PromotionCreateData): Promise<Promotion> => {
    const response = await apiClient.post('/zesty/promotions/', data);
    return normalizePromotion(response.data);
  },

  update: async (id: number, data: Partial<PromotionCreateData>): Promise<Promotion> => {
    const response = await apiClient.patch(`/zesty/promotions/${id}/`, data);
    return normalizePromotion(response.data);
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/zesty/promotions/${id}/`);
  },

  /** Throws (via axios) with `error.response.data.error` holding a
   * user-facing reason when the code doesn't apply. */
  validate: async (code: string, restaurantId: number, subtotal: number): Promise<PromoValidationResult> => {
    const response = await apiClient.post('/zesty/promotions/validate', {
      code,
      restaurant_id: restaurantId,
      subtotal,
    });
    return { ...response.data, discount: toNumber(response.data.discount, 0) };
  },
};

// ---- Payouts (admin-only settlement) ----

export interface PayoutCreateData {
  restaurant: number;
  period_start: string;
  period_end: string;
  notes?: string;
}

export const payoutAPI = {
  list: async (params?: { restaurant?: number; status?: string }): Promise<Payout[]> => {
    const response = await apiClient.get('/zesty/payouts/', { params });
    const results = Array.isArray(response.data.results) ? response.data.results : response.data;
    return (results || []).map(normalizePayout);
  },

  create: async (data: PayoutCreateData): Promise<Payout> => {
    const response = await apiClient.post('/zesty/payouts/', data);
    return normalizePayout(response.data);
  },

  markPaid: async (id: number): Promise<Payout> => {
    const response = await apiClient.patch(`/zesty/payouts/${id}/mark_paid/`);
    return normalizePayout(response.data);
  },
};
