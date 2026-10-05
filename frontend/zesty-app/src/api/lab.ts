import apiClient, { API_BASE_URL, getAccessToken } from './client';
import type { ModelInfo } from './warehouse';

/*
 * Data Mining Lab + Mumbai map (admin only). Each experiment is computed by
 * the nightly mining run and served whole; the shapes mirror the backend
 * modules in backend/mining/modules/lab_*.py and areas.py.
 */

// The payloads are wide, experiment-specific documents. They are typed
// where the console reads them field by field and left open elsewhere.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export interface LabResponse<T = Any> {
  model: ModelInfo;
  data: T | null;
}

export type LabKey =
  | 'mumbai_areas' | 'mumbai_points' | 'area_hierarchy' | 'lab_visualization' | 'lab_preprocessing'
  | 'lab_regression' | 'lab_decision_tree' | 'lab_naive_bayes' | 'lab_customer_kmeans' | 'lab_apriori';

export interface MumbaiArea {
  area: string;
  zone: string;
  district: string;
  pincode: string;
  lat: number;
  lng: number;
  affluence: number;
  residents: number;
  orders_placed: number;
  orders_per_resident: number;
  avg_order_value: number;
  restaurants: number;
  demand_per_kitchen: number;
  orders_served: number;
  revenue: number;
  avg_delivery_min: number;
  cancel_rate: number;
  venues: number;
  bookings: number;
  ticket_revenue: number;
  top_cuisine: string;
  cluster: number;
  cluster_name: string;
  ward_cluster: number;
  pc1: number;
  pc2: number;
  distance_to_centroid: number;
  [feature: string]: Any;
}

export interface AreaCluster {
  cluster: number;
  name: string;
  action: string;
  size: number;
  areas: string[];
  centroid_z: Record<string, number>;
  centroid_2d: [number, number];
  means: Record<string, number>;
  lat: number;
  lng: number;
}

export interface MumbaiAreasPayload {
  city: string;
  zones: Record<string, { district: string; order: number }>;
  features: { key: string; label: string }[];
  areas: MumbaiArea[];
  clusters: AreaCluster[];
  k: number;
  elbow: { k: number; wcss: number; silhouette: number; davies_bouldin: number; iterations: number }[];
  pca: { explained_variance: number[]; loadings: Record<string, number[]> };
  trace: {
    step: number;
    labels: number[];
    centroids_before: [number, number][];
    centroids_after: [number, number][];
    wcss: number;
    max_shift: number;
  }[];
  totals: { areas: number; residents: number; orders: number; restaurants: number; venues: number };
}

export interface MapPoint {
  id: number;
  name: string;
  area: string;
  lat: number;
  lng: number;
  orders?: number;
  bookings?: number;
  revenue: number;
  cuisine?: string;
}

export interface MapHotspot {
  domain: 'zesty' | 'eventra';
  label: string;
  lat: number;
  lng: number;
  radius_km: number;
  demand: number;
  supply: number;
  demand_per_supply: number;
  opportunity: 'undersupplied' | 'oversupplied' | 'balanced';
}

export interface MumbaiMapResponse {
  model: ModelInfo;
  areas: MumbaiAreasPayload | null;
  points: { restaurants: MapPoint[]; venues: MapPoint[] } | null;
  hotspots: MapHotspot[];
}

/* ---- OLAP cube ---- */

export interface CubeLevel { key: string; label: string }
export interface CubeDimension { key: string; label: string; levels: CubeLevel[] }
export interface CubeCatalog {
  cubes: Record<string, { label: string; measures: { key: string; label: string }[]; dimensions: CubeDimension[] }>;
}

export interface CubeResult {
  fact: string;
  measure: string;
  measure_label: string;
  rows: string;
  rows_label: string;
  cols: string | null;
  cols_label: string | null;
  filters: Record<string, string[]>;
  can_drill: boolean;
  can_roll_up: boolean;
  finer: string | null;
  coarser: string | null;
  sql: string;
  additive: boolean;
  row_members: string[];
  values?: { member: string; value: number }[];
  col_members?: string[];
  matrix?: Record<string, Record<string, number>>;
  row_totals?: Record<string, number>;
  col_totals?: Record<string, number>;
  total?: number | null;
}

const get = async <T,>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const response = await apiClient.get(url, { params });
  return response.data as T;
};

export const labAPI = {
  artifact: <T = Any>(key: LabKey) => get<LabResponse<T>>(`/insights/lab/${key}`),
  mumbaiMap: () => get<MumbaiMapResponse>('/insights/mumbai-map'),
  cubeCatalog: () => get<CubeCatalog>('/olap/cube'),
  cube: (fact: string, measure: string, rows: string, cols: string | null, filters: Record<string, string[]>) =>
    get<CubeResult>('/olap/cube', { fact, measure, rows, cols: cols ?? undefined, filters: JSON.stringify(filters) }),
  schema: () => get<Any>('/olap/schema'),
  oltpVsOlap: () => get<Any>('/olap/oltp-vs-olap'),
  /** Downloads a mining dataset as CSV or ARFF (for WEKA / R). */
  download: async (dataset: string, format: 'csv' | 'arff') => {
    const response = await fetch(`${API_BASE_URL}/insights/lab/export/${dataset}?format=${format}`, {
      headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
    });
    if (!response.ok) throw new Error(`Export failed (${response.status})`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platforma_${dataset}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
