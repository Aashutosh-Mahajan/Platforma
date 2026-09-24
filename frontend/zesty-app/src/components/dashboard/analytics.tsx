import React, { useId, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Lightbulb, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AnalyticsRange, Kpi, KpiKind, LabelValue } from '../../api/analytics';
import { Segmented } from './primitives';
import { formatINR, formatInt, humanize, themes, type DashWorld } from './theme';

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export const RANGE_OPTIONS: { value: AnalyticsRange; label: string; long: string }[] = [
  { value: '7d', label: '7D', long: 'last 7 days' },
  { value: '30d', label: '30D', long: 'last 30 days' },
  { value: '90d', label: '90D', long: 'last 90 days' },
  { value: '12m', label: '12M', long: 'last 12 months' },
  { value: 'all', label: 'All', long: 'all time' },
];

export const rangeLong = (range: AnalyticsRange) => RANGE_OPTIONS.find((r) => r.value === range)?.long ?? range;

export const formatKpi = (value: number | null | undefined, kind: KpiKind): string => {
  if (value === null || value === undefined) return '—';
  switch (kind) {
    case 'money':
    case 'money_inverse':
      return formatINR(value);
    case 'rate':
    case 'rate_inverse':
      return `${value.toFixed(value >= 10 || value === 0 ? 0 : 1)}%`;
    case 'days':
      return `${value.toFixed(1)} d`;
    case 'number':
      return value.toFixed(2);
    default:
      return formatInt(value);
  }
};

const compactINR = (v: number) => `₹${new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(v)}`;

/** Describe the change between two periods; `good` says whether it's a win. */
export const describeDelta = (
  kpi: Kpi
): { text: string; direction: 'up' | 'down' | 'flat'; good: boolean | null; isNew?: boolean } | null => {
  const { value, previous, kind } = kpi;
  if (previous === null || previous === undefined || value === null || value === undefined) return null;
  const inverse = kind.endsWith('_inverse');
  const isRate = kind === 'rate' || kind === 'rate_inverse';
  const diff = value - previous;
  if (Math.abs(diff) < 1e-9) return { text: 'No change', direction: 'flat', good: null };
  const direction = diff > 0 ? 'up' : 'down';
  const good = inverse ? diff < 0 : diff > 0;
  if (isRate) return { text: `${Math.abs(diff).toFixed(1)} pts`, direction, good };
  if (previous === 0) return { text: 'New this period', direction, good, isNew: true };
  const pct = (diff / Math.abs(previous)) * 100;
  return { text: `${Math.abs(pct) >= 100 ? Math.round(Math.abs(pct)) : Math.abs(pct).toFixed(1)}%`, direction, good };
};

/* ------------------------------------------------------------------ */
/* Range picker & KPI cards                                            */
/* ------------------------------------------------------------------ */

export const RangePicker: React.FC<{ world: DashWorld; value: AnalyticsRange; onChange: (r: AnalyticsRange) => void }> = ({
  world,
  value,
  onChange,
}) => <Segmented world={world} label="Reporting period" value={value} onChange={onChange} options={RANGE_OPTIONS} />;

export interface KpiSpec {
  key: string;
  label: string;
  icon?: LucideIcon;
  hint?: string;
}

export const KpiGrid: React.FC<{
  world: DashWorld;
  kpis: Record<string, Kpi> | undefined;
  specs: KpiSpec[];
  range: AnalyticsRange;
  loading?: boolean;
  columns?: 3 | 4;
}> = ({ world, kpis, specs, range, loading, columns = 4 }) => {
  const t = themes[world];
  const cardBg = t.dark ? 'bg-[#141414]' : 'bg-white';
  return (
    <div
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border ${t.hairline} ${t.hairlineBg} ${
        columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
      }`}
    >
      {specs.map((spec) => {
        const kpi = kpis?.[spec.key];
        const delta = kpi ? describeDelta(kpi) : null;
        const Icon = spec.icon;
        const DeltaIcon = delta?.direction === 'up' ? ArrowUpRight : delta?.direction === 'down' ? ArrowDownRight : Minus;
        const deltaTone =
          delta?.good === true
            ? t.dark ? 'text-emerald-300' : 'text-emerald-700'
            : delta?.good === false
              ? t.dark ? 'text-rose-300' : 'text-rose-700'
              : t.muted;
        return (
          <div key={spec.key} className={`${cardBg} min-w-0 px-5 py-4 sm:px-6`}>
            <div className={`flex items-center gap-2 text-[13px] font-medium ${t.muted}`} title={spec.hint}>
              {Icon && <Icon className={`h-4 w-4 shrink-0 ${t.accentText}`} strokeWidth={1.8} aria-hidden="true" />}
              <span className="truncate">{spec.label}</span>
            </div>
            {loading || !kpi ? (
              <div className={`mt-3 h-7 w-24 animate-pulse rounded-lg ${t.skeleton}`} />
            ) : (
              <p className={`mt-1.5 truncate text-[26px] font-semibold leading-tight tracking-tight tabular-nums ${t.strong}`}>
                {formatKpi(kpi.value, kpi.kind)}
              </p>
            )}
            {!loading && kpi && (
              <p className={`mt-1 flex items-center gap-1 text-xs ${deltaTone}`}>
                {delta ? (
                  <>
                    <DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="font-semibold tabular-nums">{delta.text}</span>
                    <span className={t.faint}>vs previous</span>
                  </>
                ) : (
                  <span className={t.faint}>{range === 'all' ? 'All time' : spec.hint ?? 'No earlier data'}</span>
                )}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Stacked / grouped column chart                                      */
/* ------------------------------------------------------------------ */

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

export const StackedColumns: React.FC<{
  world: DashWorld;
  data: Record<string, number | string>[];
  series: SeriesDef[];
  format?: (v: number) => string;
  height?: number;
  ariaLabel: string;
}> = ({ world, data, series, format = compactINR, height = 240, ariaLabel }) => {
  const t = themes[world];
  const [hover, setHover] = useState<number | null>(null);
  const totals = data.map((d) => series.reduce((s, def) => s + Number(d[def.key] || 0), 0));
  const rawMax = Math.max(0, ...totals);
  const max = niceCeil(Math.max(rawMax, 1));
  const ticks = [1, 0.5, 0];
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));
  const active = hover !== null ? data[hover] : null;

  return (
    <figure aria-label={ariaLabel}>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {series.map((s) => (
          <span key={s.key} className={`inline-flex items-center gap-1.5 ${t.muted}`}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </div>
      <div className="flex gap-3">
        <div className="relative w-12 shrink-0 text-right text-[11px] tabular-nums" style={{ height }}>
          {ticks.map((tick) => (
            <span key={tick} className={`absolute right-0 -translate-y-1/2 ${t.faint}`} style={{ top: `${(1 - tick) * 100}%` }}>
              {rawMax === 0 ? '' : format(max * tick)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height }} onMouseLeave={() => setHover(null)}>
          {ticks.map((tick) => (
            <div key={tick} className="absolute inset-x-0 border-t border-dashed" style={{ top: `${(1 - tick) * 100}%`, borderColor: t.gridHex }} />
          ))}
          {rawMax === 0 && (
            <p className={`absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm ${t.muted}`}>Nothing in this period yet</p>
          )}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div key={i} className="flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)}>
                <div
                  className={`flex flex-col-reverse overflow-hidden rounded-t-[3px] transition-opacity ${hover !== null && hover !== i ? 'opacity-50' : ''}`}
                  style={{ height: `${(totals[i] / max) * 100}%` }}
                >
                  {series.map((s) => (
                    <div key={s.key} style={{ height: totals[i] ? `${(Number(d[s.key] || 0) / totals[i]) * 100}%` : 0, background: s.color }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {active && hover !== null && (
            <div
              className={`pointer-events-none absolute top-0 z-10 min-w-[150px] -translate-x-1/2 rounded-xl px-3 py-2 text-xs shadow-xl ${
                t.dark ? 'bg-[#f5f0e8] text-[#0a0a0a]' : 'bg-[#141414] text-white'
              }`}
              style={{ left: `clamp(80px, ${((hover + 0.5) / data.length) * 100}%, calc(100% - 80px))` }}
            >
              <p className="mb-1 font-semibold">{String(active.label)}</p>
              {series.map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 opacity-75">
                    <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-semibold tabular-nums">{format(Number(active[s.key] || 0))}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="relative ml-[60px] mt-2 h-4 text-[11px]">
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <span key={i} className={`absolute -translate-x-1/2 whitespace-nowrap ${t.faint}`} style={{ left: `${((i + 0.5) / data.length) * 100}%` }}>
              {String(d.label)}
            </span>
          ) : null
        )}
      </div>
    </figure>
  );
};

const niceCeil = (value: number): number => {
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
};

/* ------------------------------------------------------------------ */
/* Column bars for small categorical sets (weekday, daypart, buckets)  */
/* ------------------------------------------------------------------ */

export const ColumnBars: React.FC<{
  world: DashWorld;
  data: LabelValue[];
  metric?: 'count' | 'value';
  format?: (v: number) => string;
  height?: number;
  highlightMax?: boolean;
}> = ({ world, data, metric = 'count', format = (v) => formatInt(v), height = 150, highlightMax = true }) => {
  const t = themes[world];
  const values = data.map((d) => Number(metric === 'value' ? d.value ?? 0 : d.count));
  const max = Math.max(0, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return <p className={`py-8 text-center text-sm ${t.muted}`}>Nothing in this period yet</p>;
  return (
    <div className="flex items-end gap-2" style={{ height: height + 40 }}>
      {data.map((d, i) => {
        const v = values[i];
        const isMax = highlightMax && v === max && v > 0;
        return (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${d.label}: ${format(v)}`}>
            <span className={`text-[11px] font-semibold tabular-nums ${isMax ? t.strong : t.faint}`}>{v ? format(v) : ''}</span>
            <div
              className="w-full max-w-[44px] rounded-t-md transition-[height] duration-500"
              style={{
                height: `${max ? Math.max((v / max) * height, v ? 4 : 2) : 2}px`,
                background: isMax ? t.accentHex : t.accentSoftHex,
                opacity: isMax ? 1 : v ? 0.55 : 0.2,
              }}
            />
            <span className={`w-full truncate text-center text-[11px] ${t.muted}`}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Heatmap                                                             */
/* ------------------------------------------------------------------ */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const Heatmap: React.FC<{ world: DashWorld; grid: number[][]; unit: string }> = ({ world, grid, unit }) => {
  const t = themes[world];
  const max = Math.max(0, ...grid.flat());
  if (max === 0) return <p className={`py-8 text-center text-sm ${t.muted}`}>Nothing in this period yet</p>;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="grid grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-[3px]">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className={`text-center text-[10px] ${t.faint}`}>
              {h % 3 === 0 ? (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`) : ''}
            </span>
          ))}
          {grid.map((row, d) => (
            <React.Fragment key={d}>
              <span className={`self-center text-[11px] ${t.muted}`}>{DAYS[d]}</span>
              {row.map((n, h) => (
                <span
                  key={h}
                  title={`${DAYS[d]} ${h}:00 – ${n} ${unit}`}
                  className="aspect-square rounded-[3px]"
                  style={{
                    background: n ? t.accentHex : t.gridHex,
                    opacity: n ? 0.25 + (n / max) * 0.75 : 1,
                  }}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
        <div className={`mt-3 flex items-center justify-end gap-2 text-[11px] ${t.faint}`}>
          Fewer
          {[0.25, 0.5, 0.75, 1].map((o) => (
            <span key={o} className="h-3 w-3 rounded-[3px]" style={{ background: t.accentHex, opacity: o }} />
          ))}
          More {unit}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Donut                                                               */
/* ------------------------------------------------------------------ */

export const Donut: React.FC<{
  world: DashWorld;
  data: { label: string; value: number; color: string }[];
  center?: React.ReactNode;
  format?: (v: number) => string;
}> = ({ world, data, center, format = (v) => formatInt(v) }) => {
  const t = themes[world];
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  if (total === 0) return <p className={`py-8 text-center text-sm ${t.muted}`}>Nothing in this period yet</p>;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={r} fill="none" stroke={t.gridHex} strokeWidth="12" />
          {data.map((d) => {
            const len = (d.value / total) * c;
            const el = (
              <circle
                key={d.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth="12"
                strokeDasharray={`${Math.max(len - 1, 0)} ${c}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        {center && <div className="absolute inset-0 grid place-items-center text-center">{center}</div>}
      </div>
      <ul className="min-w-[160px] flex-1 space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center justify-between gap-3">
            <span className={`flex min-w-0 items-center gap-2 ${t.muted}`}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} aria-hidden="true" />
              <span className="truncate">{d.label}</span>
            </span>
            <span className={`shrink-0 tabular-nums ${t.strong}`}>
              <span className="font-semibold">{format(d.value)}</span>
              <span className={`ml-1.5 text-xs ${t.faint}`}>{Math.round((d.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Palette for categorical charts, picked to read on both light and dark panels. */
export const CATEGORY_COLORS = ['#e23744', '#c4621a', '#6f7f42', '#2f6f8f', '#b08a2e', '#8a4f7d', '#4b8b6a', '#9a9a9a'];

/* ------------------------------------------------------------------ */
/* Funnel                                                              */
/* ------------------------------------------------------------------ */

export const Funnel: React.FC<{ world: DashWorld; steps: LabelValue[] }> = ({ world, steps }) => {
  const t = themes[world];
  const top = Math.max(1, steps[0]?.count ?? 0);
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => {
        const prev = i > 0 ? steps[i - 1].count : null;
        const conversion = prev ? Math.round((step.count / prev) * 100) : null;
        return (
          <li key={step.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={t.strong}>{step.label}</span>
              <span className="tabular-nums">
                <span className={`font-semibold ${t.strong}`}>{formatInt(step.count)}</span>
                {conversion !== null && <span className={`ml-2 text-xs ${t.faint}`}>{conversion}% of previous</span>}
              </span>
            </div>
            <div className={`mt-1.5 h-3 overflow-hidden rounded-full ${t.subtle}`}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, (step.count / top) * 100)}%`, background: t.accentHex, opacity: 1 - i * 0.18 }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
};

/* ------------------------------------------------------------------ */
/* Split bar (two-part share)                                          */
/* ------------------------------------------------------------------ */

export const SplitBar: React.FC<{
  world: DashWorld;
  parts: { label: string; value: number; color: string; detail?: string }[];
}> = ({ world, parts }) => {
  const t = themes[world];
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (total === 0) return <p className={`py-4 text-sm ${t.muted}`}>Nothing in this period yet</p>;
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4">
        {parts.map((p) => (
          <div key={p.label}>
            <dt className={`flex items-center gap-2 text-sm ${t.muted}`}>
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
              {p.label}
            </dt>
            <dd className={`mt-0.5 text-2xl font-semibold tabular-nums ${t.strong}`}>{Math.round((p.value / total) * 100)}%</dd>
            {p.detail && <dd className={`text-xs ${t.faint}`}>{p.detail}</dd>}
          </div>
        ))}
      </dl>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Insights                                                            */
/* ------------------------------------------------------------------ */

export interface Insight {
  tone: 'good' | 'warn' | 'info';
  text: React.ReactNode;
}

export const InsightList: React.FC<{ world: DashWorld; insights: Insight[] }> = ({ world, insights }) => {
  const t = themes[world];
  const id = useId();
  if (insights.length === 0) return <p className={`text-sm ${t.muted}`}>Not enough activity in this period to draw conclusions yet.</p>;
  const dot = { good: 'bg-emerald-500', warn: 'bg-amber-500', info: t.dark ? 'bg-[#e8824a]' : 'bg-[#6f7f42]' };
  return (
    <ul className="space-y-3" aria-labelledby={id}>
      {insights.map((insight, i) => (
        <li key={i} className={`flex gap-3 text-sm leading-relaxed ${t.strong}`}>
          <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${dot[insight.tone]}`} aria-hidden="true" />
          <span>{insight.text}</span>
        </li>
      ))}
    </ul>
  );
};

export const InsightHeading: React.FC<{ world: DashWorld }> = ({ world }) => (
  <span className="inline-flex items-center gap-2">
    <Lightbulb className={`h-5 w-5 ${themes[world].accentText}`} strokeWidth={1.8} aria-hidden="true" />
    What stands out
  </span>
);

/** Largest item by a metric, with its share of the total. */
export const leader = (rows: LabelValue[], metric: 'count' | 'value' = 'count') => {
  const total = rows.reduce((s, r) => s + Number(metric === 'value' ? r.value ?? 0 : r.count), 0);
  if (!total) return null;
  const top = [...rows].sort((a, b) => Number(metric === 'value' ? (b.value ?? 0) - (a.value ?? 0) : b.count - a.count))[0];
  const v = Number(metric === 'value' ? top.value ?? 0 : top.count);
  return { label: top.label, share: Math.round((v / total) * 100), value: v };
};

/* ------------------------------------------------------------------ */
/* Simple data table                                                   */
/* ------------------------------------------------------------------ */

export interface Column<T> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  render: (row: T) => React.ReactNode;
}

export function DataTable<T>({ world, rows, columns, rowKey, empty }: {
  world: DashWorld;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  empty: string;
}) {
  const t = themes[world];
  if (rows.length === 0) return <p className={`px-6 py-10 text-center text-sm ${t.muted}`}>{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className={`text-left text-xs ${t.muted}`}>
            {columns.map((c, i) => (
              <th
                key={c.key}
                className={`py-3 font-medium ${c.align === 'right' ? 'text-right' : ''} ${i === 0 ? 'pl-6 pr-3' : i === columns.length - 1 ? 'pl-3 pr-6' : 'px-3'}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={`divide-y border-t ${t.hairline} ${t.divide}`}>
          {rows.map((row) => (
            <tr key={rowKey(row)} className={t.rowHover}>
              {columns.map((c, i) => (
                <td
                  key={c.key}
                  className={`py-3 tabular-nums ${c.align === 'right' ? 'text-right' : ''} ${i === 0 ? 'pl-6 pr-3' : i === columns.length - 1 ? 'pl-3 pr-6' : 'px-3'}`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const labelOf = (value: string) => humanize(value);

const PAYMENT_NAMES: Record<string, string> = {
  card: 'Card',
  cash_on_delivery: 'Cash on delivery',
  upi: 'UPI',
  wallet: 'Wallet',
  net_banking: 'Net banking',
  unknown: 'Not recorded',
};

export const paymentName = (value: string) => PAYMENT_NAMES[value] ?? humanize(value);
