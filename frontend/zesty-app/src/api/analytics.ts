import apiClient from './client';

export type AnalyticsRange = '7d' | '30d' | '90d' | '12m' | 'all';

/** How a KPI should be formatted and whether "up" is good. */
export type KpiKind = 'money' | 'money_inverse' | 'count' | 'number' | 'rate' | 'rate_inverse' | 'days';

export interface Kpi {
  value: number | null;
  previous: number | null;
  kind: KpiKind;
}

export interface AnalyticsWindow {
  range: AnalyticsRange;
  granularity: 'day' | 'week' | 'month';
  start: string | null;
  end: string;
  previous_start: string | null;
}

export interface LabelValue {
  label: string;
  count: number;
  value?: number;
}

export interface TimeProfile {
  heatmap: number[][];
  weekdays: LabelValue[];
  dayparts: LabelValue[];
}

export interface PlatformAnalytics {
  window: AnalyticsWindow;
  kpis: Record<string, Kpi>;
  series: { date: string; label: string; zesty: number; eventra: number; orders: number; bookings: number; signups: number }[];
  signups_by_role: LabelValue[];
  funnel: LabelValue[];
  payment_methods: LabelValue[];
  heatmap: number[][];
  weekdays: LabelValue[];
  regions: (LabelValue & { zesty: number; eventra: number })[];
  health: {
    pending_restaurants: number;
    pending_events: number;
    pending_payouts: number;
    pending_payout_amount: number;
    stale_orders: number;
    events_without_seats: number;
    suspended_users: number;
  };
  search: { total: number; click_rate: number | null; top_queries: (LabelValue & { clicks: number })[] };
}

export interface ZestySections extends TimeProfile {
  series: { date: string; label: string; gmv: number; orders: number; discount: number }[];
  status_mix: Record<string, number>;
  top_dishes: {
    id: number; name: string; restaurant: string; category: string; is_vegetarian: boolean;
    quantity: number; revenue: number; orders: number;
  }[];
  categories: LabelValue[];
  veg_split: { veg: number; non_veg: number };
  basket_sizes: LabelValue[];
  customer_mix: { new_orders: number; returning_orders: number; new_value: number; returning_value: number };
  cuisines: LabelValue[];
  payment_methods: LabelValue[];
  promo_codes: { code: string; orders: number; discount: number; revenue: number }[];
}

export interface ZestyAnalytics extends ZestySections {
  window: AnalyticsWindow;
  kpis: Record<string, Kpi>;
  catalog: {
    restaurants: number; active: number; verified: number; pending_verification: number; open_now: number;
    without_orders: number; menu_items: number; menu_available_rate: number | null; avg_rating: number | null;
  };
  top_restaurants: {
    id: number; name: string; city: string; rating: number; revenue: number; orders: number;
    aov: number | null; cancellation_rate: number | null;
  }[];
  cities: LabelValue[];
  price_tiers: LabelValue[];
}

export interface RestaurantAnalytics extends ZestySections {
  window: AnalyticsWindow;
  kpis: Record<string, Kpi>;
  restaurant: { id: number; name: string; commission_rate: number };
  menu: { items: number; available: number; unsold_count: number; unsold: { id: number; name: string; category: string; price: number }[] };
  reviews: { count: number; average: number | null; distribution: LabelValue[] };
}

export interface EventraSections extends TimeProfile {
  series: { date: string; label: string; revenue: number; bookings: number; tickets: number }[];
  status_mix: Record<string, number>;
  categories: (LabelValue & { tickets: number; events: number })[];
  top_events: {
    id: number; name: string; category: string; date: string; venue: string; city: string | null;
    revenue: number; bookings: number; tickets: number; sell_through: number | null;
    cancellation_rate: number | null; rating: number | null;
  }[];
  tiers: LabelValue[];
  lead_times: LabelValue[];
  event_weekdays: LabelValue[];
  upcoming: {
    id: number; name: string; category: string; date: string; days_out: number; bookings: number;
    revenue: number; total_seats: number; sell_through: number | null; is_published: boolean; is_approved: boolean;
  }[];
  rating_distribution: LabelValue[];
}

export interface EventraInventory {
  events: number; upcoming: number; next_30_days: number; on_sale: number; drafts: number;
  pending_approval: number; without_seats: number; cancelled: number; past: number;
}

export interface EventraAnalytics extends EventraSections {
  window: AnalyticsWindow;
  kpis: Record<string, Kpi>;
  inventory: EventraInventory;
  organizers: { id: number; name: string; revenue: number; bookings: number; events: number }[];
  cities: LabelValue[];
}

export interface OrganizerAnalytics extends EventraSections {
  window: AnalyticsWindow;
  kpis: Record<string, Kpi>;
  scope: { event: number | null };
  inventory: EventraInventory;
  events: {
    id: number; name: string; category: string; date: string; status: 'on_sale' | 'pending' | 'draft' | 'cancelled' | 'no_seats' | 'ended';
    bookings: number; tickets: number; revenue: number; total_seats: number; sell_through: number | null; rating: number | null;
  }[];
}

const get = async <T,>(url: string, params: Record<string, unknown>): Promise<T> => {
  const response = await apiClient.get(url, { params });
  return response.data as T;
};

export const analyticsAPI = {
  platform: (range: AnalyticsRange) => get<PlatformAnalytics>('/analytics/platform', { range }),
  zesty: (range: AnalyticsRange) => get<ZestyAnalytics>('/analytics/zesty', { range }),
  eventra: (range: AnalyticsRange) => get<EventraAnalytics>('/analytics/eventra', { range }),
  restaurant: (id: number, range: AnalyticsRange) => get<RestaurantAnalytics>(`/analytics/restaurants/${id}`, { range }),
  organizer: (range: AnalyticsRange, event?: number | null) =>
    get<OrganizerAnalytics>('/analytics/organizer', event ? { range, event } : { range }),
};
