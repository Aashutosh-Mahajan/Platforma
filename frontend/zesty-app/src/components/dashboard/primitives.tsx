import React, { useEffect, useId, useState } from 'react';
import { AlertTriangle, RotateCw, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { humanize, themes, toneForStatus, type DashWorld, type Tone } from './theme';

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export const Panel: React.FC<{
  world: DashWorld;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ world, title, description, action, flush, className = '', children }) => {
  const t = themes[world];
  return (
    <section className={`min-w-0 ${t.panel} ${className}`}>
      {(title || action) && (
        <div className={`flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 ${flush ? `border-b pb-4 ${t.hairline}` : ''}`}>
          <div className="min-w-0">
            {title && <h2 className={`${t.display} text-xl ${t.strong}`}>{title}</h2>}
            {description && <p className={`mt-1 text-sm ${t.muted}`}>{description}</p>}
          </div>
          {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={flush ? '' : 'p-5 sm:p-6'}>{children}</div>
    </section>
  );
};

/** Section heading used between blocks on a page. */
export const SectionHeading: React.FC<{
  world: DashWorld;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ world, title, description, action }) => {
  const t = themes[world];
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className={`${t.display} text-2xl sm:text-[28px] ${t.strong}`}>{title}</h2>
        {description && <p className={`mt-1 text-sm ${t.muted}`}>{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* KPI ledger                                                          */
/* ------------------------------------------------------------------ */

export interface LedgerItem {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
}

export const KpiLedger: React.FC<{ world: DashWorld; items: LedgerItem[]; loading?: boolean }> = ({
  world,
  items,
  loading,
}) => {
  const t = themes[world];
  const cols = items.length >= 4 ? 'lg:grid-cols-4' : items.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';
  return (
    <div
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border ${t.hairline} ${t.hairlineBg} ${cols} ${
        t.dark ? 'shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]' : 'shadow-[0_24px_50px_-30px_rgba(40,25,10,0.35)]'
      }`}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={`${t.dark ? 'bg-[#141414]' : 'bg-white'} px-5 py-5 sm:px-6`}>
            <div className={`flex items-center gap-2 text-[13px] font-medium ${t.muted}`}>
              {Icon && <Icon className={`h-4 w-4 ${t.accentText}`} strokeWidth={1.8} aria-hidden="true" />}
              {item.label}
            </div>
            {loading ? (
              <div className={`mt-3 h-8 w-24 animate-pulse rounded-lg ${t.skeleton}`} />
            ) : (
              <div className={`mt-2 text-[28px] font-semibold leading-tight tracking-tight tabular-nums sm:text-[32px] ${t.strong}`}>
                {item.value}
              </div>
            )}
            {item.hint && !loading && <div className={`mt-1 text-xs ${t.muted}`}>{item.hint}</div>}
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export const StatusPill: React.FC<{ world: DashWorld; status?: string; tone?: Tone; label?: string }> = ({
  world,
  status = '',
  tone,
  label,
}) => {
  const t = themes[world];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        t.tones[tone ?? toneForStatus(status)]
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {label ?? humanize(status)}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export const EmptyState: React.FC<{
  world: DashWorld;
  icon: LucideIcon;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}> = ({ world, icon: Icon, title, body, action, compact }) => {
  const t = themes[world];
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'px-4 py-8' : 'px-6 py-14'}`}>
      <span className={`grid h-12 w-12 place-items-center rounded-2xl ${t.subtle} ${t.accentText}`}>
        <Icon className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
      </span>
      <p className={`mt-4 text-base font-semibold ${t.strong}`}>{title}</p>
      {body && <p className={`mt-1 max-w-sm text-sm leading-relaxed ${t.muted}`}>{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export const ErrorBanner: React.FC<{
  world: DashWorld;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}> = ({ world, message, onRetry, onDismiss }) => {
  const t = themes[world];
  return (
    <div
      role="alert"
      className={`mb-6 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ring-inset ${t.tones.danger}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
        </button>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="rounded p-0.5 opacity-70 hover:opacity-100">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export const Skeleton: React.FC<{ world: DashWorld; className?: string }> = ({ world, className = '' }) => (
  <div className={`animate-pulse rounded-lg ${themes[world].skeleton} ${className}`} />
);

export const SkeletonRows: React.FC<{ world: DashWorld; rows?: number }> = ({ world, rows = 4 }) => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex items-center gap-4">
        <Skeleton world={world} className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton world={world} className="h-3.5 w-2/5" />
          <Skeleton world={world} className="h-3 w-1/4" />
        </div>
        <Skeleton world={world} className="h-6 w-20 rounded-full" />
      </div>
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/* Forms & modal                                                       */
/* ------------------------------------------------------------------ */

export const Field: React.FC<{
  world: DashWorld;
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ world, label, htmlFor, hint, error, className = '', children }) => {
  const t = themes[world];
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={`mb-1.5 block text-[13px] font-semibold ${t.strong}`}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-rose-500" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className={`mt-1.5 text-xs ${t.faint}`}>{hint}</p>
      )}
    </div>
  );
};

export const DashModal: React.FC<{
  world: DashWorld;
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  size?: 'md' | 'lg';
  children: React.ReactNode;
}> = ({ world, open, title, description, onClose, size = 'md', children }) => {
  const t = themes[world];
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-sm" aria-label="Close dialog" onClick={onClose} />
      <div
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-b-none sm:rounded-b-3xl ${t.modalPanel} ${
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        <div className={`flex items-start justify-between gap-4 border-b px-6 py-5 ${t.hairline}`}>
          <div>
            <h2 id={titleId} className={`${t.display} text-2xl ${t.strong}`}>
              {title}
            </h2>
            {description && <p className={`mt-1 text-sm ${t.muted}`}>{description}</p>}
          </div>
          <button type="button" onClick={onClose} className={`${t.btnGhost} !px-2`} aria-label="Close">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

const niceCeil = (value: number): number => {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
};

const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

/** Area/line chart over an ordered series, with gridlines, axis labels and a hover readout. */
export const AreaChart: React.FC<{
  world: DashWorld;
  data: { label: string; value: number }[];
  format?: (value: number) => string;
  height?: number;
  ariaLabel: string;
}> = ({ world, data, format = (v) => compact.format(v), height = 220, ariaLabel }) => {
  const t = themes[world];
  const gradientId = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);
  const dataMax = Math.max(0, ...data.map((d) => d.value));
  const max = niceCeil(Math.max(dataMax, 4));
  const n = data.length;
  const x = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => 100 - (v / max) * 100;
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.value)}`).join(' ');
  const area = `${line} L${x(n - 1)},100 L${x(0)},100 Z`;
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  const labelEvery = Math.max(1, Math.ceil(n / 5));
  const active = hover !== null ? data[hover] : null;

  return (
    <figure aria-label={ariaLabel} className="w-full">
      <div className="flex gap-3">
        <div className="relative w-10 shrink-0 text-right text-[11px] tabular-nums" style={{ height }}>
          {ticks.map((tick) => (
            <span key={tick} className={`absolute right-0 -translate-y-1/2 ${t.faint}`} style={{ top: `${(1 - tick) * 100}%` }}>
              {format(max * tick)}
            </span>
          ))}
        </div>
        <div className="relative flex-1" style={{ height }} onMouseLeave={() => setHover(null)}>
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute inset-x-0 border-t border-dashed"
              style={{ top: `${(1 - tick) * 100}%`, borderColor: t.gridHex }}
            />
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={t.accentHex} stopOpacity={t.dark ? 0.35 : 0.22} />
                <stop offset="100%" stopColor={t.accentHex} stopOpacity={0} />
              </linearGradient>
            </defs>
            {n > 1 && <path d={area} fill={`url(#${gradientId})`} />}
            <path d={line} fill="none" stroke={t.accentHex} strokeWidth={2.25} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          {hover !== null && active && (
            <>
              <div className="pointer-events-none absolute inset-y-0 w-px" style={{ left: `${x(hover)}%`, background: t.accentHex, opacity: 0.35 }} />
              <div
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                style={{ left: `${x(hover)}%`, top: `${y(active.value)}%`, background: t.dark ? '#141414' : '#fff', borderColor: t.accentHex }}
              />
              <div
                className={`pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs shadow-lg ${
                  t.dark ? 'bg-[#f5f0e8] text-[#0a0a0a]' : 'bg-[#141414] text-white'
                }`}
                style={{
                  left: `clamp(48px, ${x(hover)}%, calc(100% - 48px))`,
                  top: `calc(${y(active.value)}% - 10px)`,
                }}
              >
                <span className="font-semibold tabular-nums">{format(active.value)}</span>
                <span className="ml-1.5 opacity-60">{active.label}</span>
              </div>
            </>
          )}
          {dataMax === 0 && (
            <p className={`pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm ${t.muted}`}>
              Nothing in this window yet
            </p>
          )}
          <div className="absolute inset-0 flex">
            {data.map((d, i) => (
              <div key={d.label + i} className="h-full flex-1" onMouseEnter={() => setHover(i)} />
            ))}
          </div>
        </div>
      </div>
      <div className="relative ml-[52px] mt-2 h-4 text-[11px]">
        {data.map((d, i) =>
          (i % labelEvery === 0 && n - 1 - i >= labelEvery) || i === n - 1 ? (
            <span
              key={d.label + i}
              className={`absolute whitespace-nowrap ${t.faint} ${i === 0 ? '' : i === n - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
              style={{ left: `${x(i)}%` }}
            >
              {d.label}
            </span>
          ) : null
        )}
      </div>
    </figure>
  );
};

/** Ranked horizontal bars, e.g. revenue by item. */
export const RankedBars: React.FC<{
  world: DashWorld;
  data: { label: string; value: number; sub?: string }[];
  format?: (value: number) => string;
}> = ({ world, data, format = (v) => compact.format(v) }) => {
  const t = themes[world];
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ol className="space-y-4">
      {data.map((d, i) => (
        <li key={d.label + i}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className={`min-w-0 truncate font-medium ${t.strong}`}>
              <span className={`mr-2 tabular-nums ${t.faint}`}>{String(i + 1).padStart(2, '0')}</span>
              {d.label}
            </span>
            <span className={`shrink-0 font-semibold tabular-nums ${t.strong}`}>{format(d.value)}</span>
          </div>
          <div className={`mt-2 h-2 overflow-hidden rounded-full ${t.subtle}`}>
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max(2, (d.value / max) * 100)}%`,
                background: i === 0 ? t.accentHex : t.accentSoftHex,
                opacity: i === 0 ? 1 : Math.max(0.45, 1 - i * 0.12),
              }}
            />
          </div>
          {d.sub && <p className={`mt-1 text-xs ${t.faint}`}>{d.sub}</p>}
        </li>
      ))}
    </ol>
  );
};

const TONE_HEX: Record<Tone, { light: string; dark: string }> = {
  success: { light: '#10b981', dark: '#34d399' },
  info: { light: '#0ea5e9', dark: '#e8824a' },
  warn: { light: '#f59e0b', dark: '#fbbf24' },
  danger: { light: '#f43f5e', dark: '#fb7185' },
  neutral: { light: '#a8a29e', dark: '#57534e' },
};

/** One stacked bar with a legend: how a set of records splits by status. */
export const StatusBreakdown: React.FC<{
  world: DashWorld;
  counts: Record<string, number>;
}> = ({ world, counts }) => {
  const t = themes[world];
  const entries = Object.entries(counts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const colorFor = (status: string) => {
    const tone = toneForStatus(status);
    if (tone === 'info' && world !== 'eventra') return t.accentHex;
    return t.dark ? TONE_HEX[tone].dark : TONE_HEX[tone].light;
  };
  if (total === 0) return <p className={`text-sm ${t.muted}`}>Nothing to break down yet.</p>;
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {entries.map(([status, value]) => (
          <div key={status} style={{ width: `${(value / total) * 100}%`, background: colorFor(status) }} title={`${humanize(status)}: ${value}`} />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
        {entries.map(([status, value]) => (
          <li key={status} className="flex items-center justify-between gap-2">
            <span className={`flex items-center gap-2 ${t.muted}`}>
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorFor(status) }} aria-hidden="true" />
              {humanize(status)}
            </span>
            <span className={`font-semibold tabular-nums ${t.strong}`}>{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Segmented control used for in-page filters. */
export const Segmented = <T extends string>({
  world,
  value,
  options,
  onChange,
  label,
}: {
  world: DashWorld;
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
  label: string;
}) => {
  const t = themes[world];
  return (
    <div role="tablist" aria-label={label} className={`inline-flex flex-wrap gap-1 rounded-full p-1 ring-1 ${t.subtle} ${t.dark ? 'ring-white/[0.06]' : 'ring-black/[0.06]'}`}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-150 ${
              selected
                ? t.dark
                  ? 'bg-[#f5f0e8] text-[#0a0a0a]'
                  : 'bg-white text-current shadow-sm'
                : t.dark
                  ? 'text-[#9a9a9a] hover:text-white'
                  : 'opacity-60 hover:opacity-100'
            }`}
          >
            {option.label}
            {option.count !== undefined && <span className="ml-1.5 tabular-nums opacity-60">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
};
