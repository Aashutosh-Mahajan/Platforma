import apiClient from './client';

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface PendingRestaurant {
  id: number;
  name: string;
  owner_email: string;
  city: string;
  state: string;
  address: string;
  cuisine_types: string;
  is_active: boolean;
  created_at: string;
}

export interface PendingEvent {
  id: number;
  name: string;
  organizer_email: string;
  category: string;
  event_date: string;
  venue_name: string;
  city: string;
  state: string;
  is_published: boolean;
  created_at: string;
}

export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  is_email_verified: boolean;
  date_joined: string;
}

export interface AuditLogEntry {
  id: number;
  actor: string;
  action: string;
  target_type: string;
  target_id: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RegionRow {
  region: string;
  zesty_revenue: number;
  zesty_orders: number;
  eventra_revenue: number;
  eventra_bookings: number;
  total_revenue: number;
}

export interface TopRestaurantRow {
  restaurant__id: number;
  restaurant__name: string;
  restaurant__city: string;
  restaurant__state: string;
  revenue: number;
  order_count: number;
}

export interface TopEventRow {
  event__id: number;
  event__name: string;
  event__venue__city: string;
  event__venue__state: string;
  revenue: number;
  booking_count: number;
}

export interface AnalyticsOverview {
  group_by: 'city' | 'state';
  regions: RegionRow[];
  top_restaurants: TopRestaurantRow[];
  top_events: TopEventRow[];
  totals: {
    zesty_revenue: number;
    zesty_orders: number;
    eventra_revenue: number;
    eventra_bookings: number;
  };
}

const normalizeRegion = (raw: RegionRow): RegionRow => ({
  ...raw,
  zesty_revenue: toNumber(raw.zesty_revenue),
  zesty_orders: toNumber(raw.zesty_orders),
  eventra_revenue: toNumber(raw.eventra_revenue),
  eventra_bookings: toNumber(raw.eventra_bookings),
  total_revenue: toNumber(raw.total_revenue),
});

export const adminAPI = {
  pendingRestaurants: async (): Promise<PendingRestaurant[]> => {
    const response = await apiClient.get('/admin/restaurants/pending');
    return response.data;
  },

  verifyRestaurant: async (id: number, isVerified: boolean): Promise<void> => {
    await apiClient.patch(`/admin/restaurants/${id}/verify`, { is_verified: isVerified });
  },

  setCommissionRate: async (id: number, commissionRate: number): Promise<void> => {
    await apiClient.patch(`/admin/restaurants/${id}/commission`, { commission_rate: commissionRate });
  },

  pendingEvents: async (): Promise<PendingEvent[]> => {
    const response = await apiClient.get('/admin/events/pending');
    return response.data;
  },

  approveEvent: async (id: number, isApproved: boolean): Promise<void> => {
    await apiClient.patch(`/admin/events/${id}/approve`, { is_approved: isApproved });
  },

  users: async (params?: { search?: string; role?: string }): Promise<AdminUser[]> => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },

  suspendUser: async (id: number, suspend: boolean): Promise<void> => {
    await apiClient.patch(`/admin/users/${id}/suspend`, { suspend });
  },

  auditLog: async (limit = 50): Promise<AuditLogEntry[]> => {
    const response = await apiClient.get('/admin/audit-log', { params: { limit } });
    return response.data;
  },

  analyticsOverview: async (groupBy: 'city' | 'state' = 'city'): Promise<AnalyticsOverview> => {
    const response = await apiClient.get('/admin/analytics/overview', { params: { group_by: groupBy } });
    const data = response.data as AnalyticsOverview;
    return {
      ...data,
      regions: (data.regions || []).map(normalizeRegion),
      top_restaurants: (data.top_restaurants || []).map((r) => ({ ...r, revenue: toNumber(r.revenue), order_count: toNumber(r.order_count) })),
      top_events: (data.top_events || []).map((e) => ({ ...e, revenue: toNumber(e.revenue), booking_count: toNumber(e.booking_count) })),
      totals: {
        zesty_revenue: toNumber(data.totals?.zesty_revenue),
        zesty_orders: toNumber(data.totals?.zesty_orders),
        eventra_revenue: toNumber(data.totals?.eventra_revenue),
        eventra_bookings: toNumber(data.totals?.eventra_bookings),
      },
    };
  },
};
