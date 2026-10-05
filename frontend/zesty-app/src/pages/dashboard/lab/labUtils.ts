import { labAPI, type LabKey, type LabResponse } from '../../../api/lab';
import { useLoad } from '../../../components/dashboard/intelligenceUtils';
import { themes } from '../../../components/dashboard/theme';

export const W = 'platforma' as const;
export const T = themes[W];

/*
 * Categorical series colours, validated (scripts/validate_palette.js, light
 * surface): lightness band, chroma, CVD and normal-vision separation pass;
 * contrast is below 3:1 for slots 3-5, so every chart using them also
 * labels its marks directly or sits next to a table.
 */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7'];
export const seriesColor = (i: number) => SERIES[((i % SERIES.length) + SERIES.length) % SERIES.length];
/** Diverging (correlation): blue for negative, orange for positive, gray at zero. */
export const divergingColor = (v: number) => {
  const a = Math.min(1, Math.abs(v));
  const [r, g, b] = v < 0 ? [42, 120, 214] : [235, 104, 52];
  const mix = (c: number) => Math.round(236 + (c - 236) * a);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};
/** Sequential (magnitude): one olive hue, light to dark. */
export const sequentialColor = (t: number) => {
  const a = Math.max(0, Math.min(1, t));
  const from = [244, 242, 232];
  const to = [70, 84, 42];
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * a));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
};

export const AXIS = { fontSize: 11, fill: '#6b6a63' };
export const GRID = '#ece9e0';

export const num = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
export const fixed = (v: number | null | undefined, digits = 3) =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toFixed(digits);
export const pctOf = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? '—' : `${(v * 100).toFixed(digits)}%`;
export const rupees = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `Rs ${num(v, 0)}`);

/** Loads one stored analytics result. */
export function useArtifact<D>(key: LabKey) {
  return useLoad<LabResponse<D>>(() => labAPI.artifact<D>(key), [key]);
}

