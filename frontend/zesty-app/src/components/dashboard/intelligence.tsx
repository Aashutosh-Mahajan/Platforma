import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { ActualPoint, ForecastPoint, ModelInfo } from '../../api/warehouse';
import { themes, type DashWorld } from './theme';
import { Segmented } from './primitives';
import { pct, relativeTime, VERTICAL_OPTIONS, type Vertical } from './intelligenceUtils';

/* ------------------------------------------------------------------ */
/* Model badge                                                         */
/* ------------------------------------------------------------------ */

/**
 * "Updated 3 h ago · reliability 0.76" — or why there's nothing yet.
 * `quality` is an optional plain-language reading of the model's own metric.
 */
/** Both / Zesty / Eventra filter shown at the top of every intelligence view. */
export const VerticalSwitch: React.FC<{ world: DashWorld; value: Vertical; onChange: (v: Vertical) => void }> = ({ world, value, onChange }) => (
  <Segmented world={world} label="Vertical" value={value} onChange={onChange} options={VERTICAL_OPTIONS} />
);

export const ModelBadge: React.FC<{ world: DashWorld; model?: ModelInfo | null; quality?: string }> = ({ world, model, quality }) => {
  const t = themes[world];
  if (!model) return null;
  if (!model.available) {
    return <p className={`text-xs ${t.muted}`}>{model.reason ?? 'Not enough data yet.'}</p>;
  }
  return (
    <p className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs ${t.muted}`}>
      <Sparkles className={`h-3.5 w-3.5 ${t.accentText}`} aria-hidden="true" />
      <span>Model v{model.version} · updated {relativeTime(model.as_of)}</span>
      {quality && <span className={t.faint}>· {quality}</span>}
    </p>
  );
};

export const NotReady: React.FC<{ world: DashWorld; model?: ModelInfo | null; what: string }> = ({ world, model, what }) => {
  const t = themes[world];
  return (
    <div className={`rounded-2xl px-5 py-6 text-sm ${t.subtle}`}>
      <p className={`font-semibold ${t.strong}`}>No {what} yet</p>
      <p className={`mt-1 ${t.muted}`}>{model?.reason ?? 'The nightly models have not produced this yet.'}</p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Probability bar                                                     */
/* ------------------------------------------------------------------ */

/** A 0-1 value as a bar. Risk bars warm up as they fill; `good` bars (sell-through, chance of selling out) stay in the accent colour. */
export const ProbabilityBar: React.FC<{ world: DashWorld; value: number; label?: string; good?: boolean }> = ({ world, value, label, good }) => {
  const t = themes[world];
  const tone = good ? t.accentHex : value >= 0.6 ? '#e11d48' : value >= 0.3 ? '#f59e0b' : t.accentHex;
  return (
    <span className="inline-flex min-w-[120px] items-center gap-2" title={label}>
      <span className={`h-1.5 flex-1 overflow-hidden rounded-full ${t.subtle}`}>
        <span className="block h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, value * 100))}%`, background: tone }} />
      </span>
      <span className="w-10 text-right text-xs font-semibold tabular-nums">{pct(value)}</span>
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Forecast chart                                                      */
/* ------------------------------------------------------------------ */

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/**
 * Recent actuals as columns, the forecast as a line with its likely range
 * shaded. Plain SVG so it scales with the panel.
 */
export const ForecastChart: React.FC<{
  world: DashWorld;
  actuals: ActualPoint[];
  forecast: ForecastPoint[];
  unit: string;
  height?: number;
}> = ({ world, actuals, forecast, unit, height = 220 }) => {
  const t = themes[world];
  const [hover, setHover] = useState<number | null>(null);
  const points = [
    ...actuals.map((a) => ({ date: a.date, actual: a.actual, predicted: null as number | null, lower: null as number | null, upper: null as number | null })),
    ...forecast.map((f) => ({ date: f.date, actual: null as number | null, predicted: f.predicted, lower: f.lower, upper: f.upper })),
  ];
  if (points.length === 0) return <p className={`py-8 text-center text-sm ${t.muted}`}>Nothing to show yet</p>;

  const W = 720;
  const H = height;
  const pad = { l: 34, r: 8, t: 10, b: 24 };
  const max = Math.max(1, ...points.map((p) => Math.max(p.actual ?? 0, p.upper ?? 0, p.predicted ?? 0)));
  const step = (W - pad.l - pad.r) / points.length;
  const x = (i: number) => pad.l + step * i + step / 2;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const firstForecast = actuals.length;
  const fIdx = points.map((p, i) => (p.predicted !== null ? i : -1)).filter((i) => i >= 0);
  const line = fIdx.map((i, k) => `${k ? 'L' : 'M'}${x(i)},${y(points[i].predicted!)}`).join(' ');
  const band = fIdx.length
    ? `M${fIdx.map((i) => `${x(i)},${y(points[i].upper!)}`).join(' L')} L${[...fIdx].reverse().map((i) => `${x(i)},${y(points[i].lower!)}`).join(' L')} Z`
    : '';
  const hovered = hover !== null ? points[hover] : null;

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Recent ${unit} and forecast`}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke={t.gridHex} strokeDasharray={f ? '3 4' : undefined} />
            <text x={pad.l - 6} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.5">
              {max < 10 ? (max * f).toFixed(1) : Math.round(max * f)}
            </text>
          </g>
        ))}
        {firstForecast > 0 && firstForecast < points.length && (
          <line x1={pad.l + step * firstForecast} x2={pad.l + step * firstForecast} y1={pad.t} y2={H - pad.b} stroke="currentColor" opacity="0.25" strokeDasharray="2 3" />
        )}
        {points.map((p, i) =>
          p.actual !== null ? (
            <rect key={i} x={x(i) - step * 0.32} width={step * 0.64} y={y(p.actual)} height={Math.max(0, H - pad.b - y(p.actual))} rx="2"
              fill={t.accentSoftHex} opacity={hover === i ? 1 : 0.7} />
          ) : null
        )}
        {band && <path d={band} fill={t.accentHex} opacity="0.14" />}
        {line && <path d={line} fill="none" stroke={t.accentHex} strokeWidth="2.5" strokeLinejoin="round" />}
        {fIdx.map((i) => <circle key={i} cx={x(i)} cy={y(points[i].predicted!)} r={hover === i ? 4.5 : 3} fill={t.accentHex} />)}
        {points.map((p, i) =>
          i % Math.ceil(points.length / 8) === 0 ? (
            <text key={`l${i}`} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.55">{shortDate(p.date)}</text>
          ) : null
        )}
        {points.map((_, i) => (
          <rect key={`h${i}`} x={pad.l + step * i} width={step} y={0} height={H} fill="transparent"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
      </svg>
      <figcaption className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${t.muted}`}>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: t.accentSoftHex }} />Actual</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: t.accentHex }} />Forecast</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm opacity-30" style={{ background: t.accentHex }} />Likely range</span>
        {hovered && (
          <span className={`ml-auto font-medium ${t.strong}`}>
            {shortDate(hovered.date)}:{' '}
            {hovered.actual !== null
              ? `${Math.round(hovered.actual)} ${unit}`
              : `~${hovered.predicted!.toFixed(1)} ${unit} (${hovered.lower!.toFixed(1)}–${hovered.upper!.toFixed(1)})`}
          </span>
        )}
      </figcaption>
    </figure>
  );
};
