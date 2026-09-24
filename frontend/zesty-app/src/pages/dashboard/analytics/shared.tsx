import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import type { AnalyticsRange } from '../../../api/analytics';
import { RangePicker, rangeLong } from '../../../components/dashboard/analytics';
import { ErrorBanner, Panel, SkeletonRows } from '../../../components/dashboard/primitives';
import { themes, type DashWorld } from '../../../components/dashboard/theme';

/**
 * Loads an analytics report for the selected range. Keeps the previous
 * report on screen while a new range loads so the page doesn't flash.
 */
export function useAnalytics<T>(fetcher: (range: AnalyticsRange) => Promise<T>, deps: unknown[], initial: AnalyticsRange = '12m') {
  const [range, setRange] = useState<AnalyticsRange>(initial);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher(range);
      if (id === request.current) setData(result);
    } catch (err: any) {
      if (id === request.current) {
        setError(err?.response?.data?.detail || err?.response?.data?.error?.message || 'Could not load analytics right now.');
      }
    } finally {
      if (id === request.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, ...deps]);

  useEffect(() => {
    void load();
  }, [load]);

  return { range, setRange, data, loading, error, reload: load };
}

/** Download rows as a CSV file (client-side, no server round trip). */
export const downloadCsv = (filename: string, rows: Record<string, unknown>[]) => {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/** Title row shared by every analytics view: heading, period picker, export. */
export const AnalyticsHeader: React.FC<{
  world: DashWorld;
  title: string;
  subtitle: string;
  range: AnalyticsRange;
  onRange: (r: AnalyticsRange) => void;
  onExport?: () => void;
  extra?: React.ReactNode;
}> = ({ world, title, subtitle, range, onRange, onExport, extra }) => {
  const t = themes[world];
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className={`${t.display} text-2xl sm:text-[28px] ${t.strong}`}>{title}</h2>
        <p className={`mt-1 text-sm ${t.muted}`}>
          {subtitle} · {rangeLong(range)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        <RangePicker world={world} value={range} onChange={onRange} />
        {onExport && (
          <button type="button" onClick={onExport} className={t.btnSecondary} title="Download the time series as CSV">
            <Download className="h-4 w-4" aria-hidden="true" /> CSV
          </button>
        )}
      </div>
    </div>
  );
};

/** First-load skeleton and error handling around an analytics body. */
export const AnalyticsFrame: React.FC<{
  world: DashWorld;
  loading: boolean;
  error: string | null;
  hasData: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}> = ({ world, loading, error, hasData, onRetry, children }) => {
  if (!hasData) {
    return error ? (
      <ErrorBanner world={world} message={error} onRetry={onRetry} />
    ) : (
      <Panel world={world}>
        <SkeletonRows world={world} rows={6} />
      </Panel>
    );
  }
  return (
    <>
      {error && <ErrorBanner world={world} message={error} onRetry={onRetry} />}
      <div className={`space-y-6 transition-opacity duration-200 ${loading ? 'pointer-events-none opacity-60' : ''}`} aria-busy={loading}>
        {children}
      </div>
    </>
  );
};

/** A small stat tile used for operational counts. */
export const StatTile: React.FC<{
  world: DashWorld;
  label: string;
  value: React.ReactNode;
  note?: string;
  tone?: 'default' | 'warn' | 'good';
  onClick?: () => void;
}> = ({ world, label, value, note, tone = 'default', onClick }) => {
  const t = themes[world];
  const toneRing = tone === 'warn' ? 'ring-1 ring-inset ring-amber-500/40' : '';
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`rounded-2xl px-4 py-3.5 text-left ${t.subtle} ${toneRing} ${onClick ? `transition-colors ${t.rowHover}` : ''}`}
    >
      <p className={`text-xs ${t.muted}`}>{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone === 'warn' ? (t.dark ? 'text-amber-300' : 'text-amber-700') : t.strong}`}>{value}</p>
      {note && <p className={`mt-0.5 text-[11px] ${t.faint}`}>{note}</p>}
    </Comp>
  );
};
