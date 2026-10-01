import apiClient from './client';
import type { Event, Restaurant } from '../types';
import type { Vertical } from '../components/dashboard/intelligenceUtils';

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

/** Every mining response says how fresh it is and how good the model was. */
export interface ModelInfo {
  available: boolean;
  reason?: string;
  version?: string;
  as_of?: string;
  // Each module reports its own metric shape (AUCs, error rates, counts...).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metrics?: Record<string, any>;
}

const get = async <T,>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const response = await apiClient.get(url, { params });
  return response.data as T;
};

/* ------------------------------------------------------------------ */
/* OLAP                                                                */
/* ------------------------------------------------------------------ */

export interface OlapCuboid {
  name: string;
  /** 'both' data sets carry a 'domain' dimension that splits them by vertical. */
  vertical: 'zesty' | 'eventra' | 'both';
  measures: { key: string; label: string }[];
  dimensions: { key: string; label: string }[];
}

export interface OlapCatalog {
  cuboids: OlapCuboid[];
  scoped_to: 'restaurant' | 'event' | null;
}

export interface OlapRows {
  measure: string;
  dimensions: string[];
  rows: Record<string, string | number | null>[];
  source_cuboid: string;
  as_of: string;
}

export interface OlapPivot {
  measure: string;
  dimensions: [string, string];
  row_values: string[];
  column_values: string[];
  row_labels?: Record<string, string>;
  column_labels?: Record<string, string>;
  matrix: Record<string, Record<string, number>>;
  source_cuboid: string;
  as_of: string;
}

export type OlapFilters = Record<string, string | number | (string | number)[]>;

const filterParam = (filters?: OlapFilters) =>
  filters && Object.keys(filters).length ? JSON.stringify(filters) : undefined;

export interface WarehouseHealth {
  separate_database: boolean;
  last_run: { run_id: string; started_at: string } | null;
  tables: {
    table_name: string; status: string; rows_read: number; rows_loaded: number; rows_rejected: number;
    started_at: string; ended_at: string | null; error_message: string;
  }[];
  checks: {
    check_name: string; table_name: string; status: 'pass' | 'warn' | 'fail';
    observed: number | null; threshold: number | null; message: string; checked_at: string;
  }[];
  history: { run_id: string; started: string; loaded: number; rejected: number; failed: number }[];
  row_counts: Record<string, number>;
}

export const olapAPI = {
  catalog: () => get<OlapCatalog>('/olap/catalog'),
  breakdown: (measure: string, dimensions: string[], filters?: OlapFilters) =>
    get<OlapRows>('/olap/breakdown', { measure, dimensions: dimensions.join(','), filters: filterParam(filters) }),
  pivot: (measure: string, row: string, column: string, filters?: OlapFilters) =>
    get<OlapPivot>('/olap/pivot', { measure, row, column, filters: filterParam(filters) }),
  health: () => get<WarehouseHealth>('/olap/health'),
};

/* ------------------------------------------------------------------ */
/* Mining                                                              */
/* ------------------------------------------------------------------ */

export interface ModuleStatus {
  module: string;
  verticals: ('zesty' | 'eventra')[];
  status: 'succeeded' | 'failed' | 'running' | 'never_run';
  last_started: string | null;
  last_error: string;
  as_of: string | null;
  version: string | null;
  skipped: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metrics: Record<string, any>;
}

export interface Anomaly {
  id: number;
  domain: 'order' | 'booking';
  target_id: string;
  rank: number;
  score: number;
  amount: number;
  occurred_on: string;
  reasons: string[];
  customer: { name: string; email: string } | null;
  customer_id: number | null;
  entity_id: number | null;
  entity_name: string | null;
  review_status: 'open' | 'confirmed' | 'dismissed';
  reviewed_at: string | null;
}

export interface EventRisk {
  event_id: number;
  event_name: string | null;
  bookings: number;
  seats: number;
  expected_no_show_seats: number;
  expected_cancelled_seats: number;
  high_risk_bookings: number;
  riskiest: { booking_id: number; probability: number; reference: string | null; customer: string | null; seats: number | null }[];
}

export interface ForecastPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

export interface ActualPoint {
  date: string;
  actual: number;
}

export interface RestaurantForecast {
  model: ModelInfo;
  restaurant_id: number;
  forecast: ForecastPoint[];
  next_7_days: number | null;
  actuals: ActualPoint[];
  hourly_tomorrow: { hour: number; share: number; expected_orders: number | null }[];
}

export interface PlatformForecast {
  model: ModelInfo;
  orders: { forecast: ForecastPoint[]; actuals: ActualPoint[] };
  bookings: { forecast: ForecastPoint[]; actuals: ActualPoint[] };
}

export interface SellOut {
  event_id: number;
  event_name: string | null;
  event_date: string;
  capacity: number;
  sold: number;
  sold_last_7d: number;
  days_to_event: number;
  projected_final: number;
  projected_sell_through: number;
  sell_out_probability: number;
  projected_sell_out_date: string | null;
  expected_no_show_seats: number | null;
}

export interface Recommendations {
  personalised: boolean;
  as_of: string | null;
  restaurants: (Restaurant & { reason: string })[];
  events: (Event & { reason: string })[];
}

export interface DeliveryEstimate {
  source: 'model' | 'restaurant';
  minutes: number;
  low: number;
  high: number;
}

export interface SequenceRule {
  antecedent: string;
  consequent: string;
  window_hours: number;
  occurrences: number;
  confidence: number;
  lift: number;
}

export interface CustomerScores {
  model: ModelInfo;
  totals?: { customers: number; predicted_90d_value: number | null; high_risk_value: number | null };
  matrix: { value_band: string; churn_band: string; customers: number; predicted_value: number | null }[];
  at_risk: {
    customer_id: number; customer: { name: string; email: string } | null; churn_probability: number | null;
    churn_band: string; predicted_90d_value: number | null; historic_value: number | null; value_band: string;
    days_since_last: number; reason: string;
  }[];
}

export interface Hotspot {
  domain: 'zesty' | 'eventra';
  city: string;
  label: string;
  lat: number;
  lng: number;
  radius_km: number;
  demand: number;
  revenue: number | null;
  supply: number;
  demand_per_supply: number;
  avg_delivery_minutes: number | null;
  opportunity: 'undersupplied' | 'balanced' | 'oversupplied';
}

export interface SearchTerm {
  term: string;
  group: string;
  vertical: 'zesty' | 'eventra' | 'unknown';
  searches: number;
  searches_7d: number;
  trend: number;
  zero_result_rate: number | null;
  click_rate: number | null;
  flag: '' | 'unmet' | 'trending' | 'unmet_trending';
}

export interface PromoEffect {
  code: string;
  restaurant_id: number | null;
  restaurant: string | null;
  window_start: string;
  window_end: string;
  redemptions: number;
  discount_given: number | null;
  orders_per_day_before: number;
  orders_per_day_during: number;
  uplift_pct: number | null;
  incremental_orders: number | null;
  incremental_revenue: number | null;
  roi: number | null;
  p_value: number | null;
  verdict: 'worked' | 'costly' | 'no_lift' | 'too_early';
}

export interface Pricing {
  model: ModelInfo;
  categories: { category: string; elasticity: number; r_squared: number; events: number; avg_sell_through: number; median_price: number | null; advice: string }[];
  my_tiers: { event_id: number; event_name: string; category: string; tier: string; price: number | null; capacity: number; sold: number; sell_through: number | null }[];
}

export interface Combo {
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
}

export const miningAPI = {
  models: () => get<{ modules: ModuleStatus[] }>('/insights/models'),
  anomalies: (params: { vertical?: Vertical; status?: string }) =>
    get<{ model: ModelInfo; counts: Record<string, number>; results: Anomaly[] }>('/insights/anomalies', params),
  reviewAnomaly: async (id: number, review_status: Anomaly['review_status']) => {
    const response = await apiClient.patch(`/insights/anomalies/${id}`, { review_status });
    return response.data as { id: number; review_status: Anomaly['review_status'] };
  },
  eventRisk: (eventId?: number | null) =>
    get<{ model: ModelInfo; events: EventRisk[] }>('/insights/risk/events', eventId ? { event_id: eventId } : undefined),
  orderRisk: (restaurantId: number) =>
    get<{ model: ModelInfo; orders: { order_id: string; probability: number; band: string }[] }>('/insights/risk/orders', { restaurant_id: restaurantId }),
  restaurantForecast: (restaurantId: number) => get<RestaurantForecast>(`/insights/forecast/restaurants/${restaurantId}`),
  platformForecast: () => get<PlatformForecast>('/insights/forecast/platform'),
  sellOut: (eventId?: number | null) =>
    get<{ model: ModelInfo; events: SellOut[] }>('/insights/sellout', eventId ? { event_id: eventId } : undefined),
  recommendations: () => get<Recommendations>('/insights/recommendations'),
  deliveryEstimate: (restaurantId: number, items: number) =>
    get<DeliveryEstimate>('/insights/delivery-estimate', { restaurant_id: restaurantId, items }),
  sequences: () => get<{ model: ModelInfo; rules: SequenceRule[] }>('/insights/sequences'),
  customers: (vertical: Vertical = 'all') => get<CustomerScores>('/insights/customers', { vertical }),
  segments: (vertical: Vertical = 'all') =>
    get<{ segment_distribution: Record<string, number>; silhouette: number | null; reason?: string | null }>('/insights/segments', { vertical }),
  hotspots: (domain?: 'zesty' | 'eventra') => get<{ model: ModelInfo; hotspots: Hotspot[] }>('/insights/hotspots', domain ? { domain } : undefined),
  search: (vertical: Vertical = 'all') =>
    get<{ model: ModelInfo; unmet: SearchTerm[]; trending: SearchTerm[]; top: SearchTerm[] }>('/insights/search', { vertical }),
  promos: (restaurantId?: number) =>
    get<{ model: ModelInfo; promotions: PromoEffect[] }>('/insights/promos', restaurantId ? { restaurant_id: restaurantId } : undefined),
  pricing: () => get<Pricing>('/insights/pricing'),
  combos: (restaurantId: number) => get<{ combos: Combo[] }>('/insights/combos', { restaurant_id: restaurantId }),
};
