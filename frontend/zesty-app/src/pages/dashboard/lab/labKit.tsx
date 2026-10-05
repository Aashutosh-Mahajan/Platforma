import React, { useState } from 'react';
import { BookOpen, ChevronDown, Sparkles } from 'lucide-react';
import type { LabResponse } from '../../../api/lab';
import { ErrorBanner, Panel, SkeletonRows } from '../../../components/dashboard/primitives';
import { ModelBadge, NotReady } from '../../../components/dashboard/intelligence';
import { T, W, num, pctOf, sequentialColor } from './labUtils';

export interface Concept { term: string; meaning: string }

/** Page frame shared by the analytics pages: section, title, intro, "how it works", then content. */
export const LabPage: React.FC<{
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
  concepts?: Concept[];
  model?: LabResponse['model'] | null;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ eyebrow, title, intro, concepts, model, action, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <p className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${T.accentText}`}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {eyebrow}
          </p>
          <h2 className={`${T.display} mt-1 text-2xl sm:text-[28px] ${T.strong}`}>{title}</h2>
          <p className={`mt-1 text-sm ${T.muted}`}>{intro}</p>
          {model && <div className="mt-2"><ModelBadge world={W} model={model} /></div>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {action}
          {concepts && concepts.length > 0 && (
            <button type="button" onClick={() => setOpen((o) => !o)} className={T.btnSecondary} aria-expanded={open}>
              <BookOpen className="h-4 w-4" aria-hidden="true" /> How it works
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {open && concepts && (
        <Panel world={W}>
          <dl className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {concepts.map((c) => (
              <div key={c.term}>
                <dt className="text-sm font-semibold">{c.term}</dt>
                <dd className={`text-sm ${T.muted}`}>{c.meaning}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}
      {children}
    </div>
  );
};

/** Loading / error / not-yet-computed handling around an artifact's content. */
export function ArtifactGate<D>({ state, what, children }: {
  state: { data: LabResponse<D> | null; loading: boolean; error: string | null; reload: () => void };
  what: string;
  children: (data: D) => React.ReactNode;
}) {
  if (state.error) return <ErrorBanner world={W} message={state.error} onRetry={state.reload} />;
  if (state.loading && !state.data) return <Panel world={W}><SkeletonRows world={W} rows={6} /></Panel>;
  if (!state.data?.model.available || !state.data.data) return <NotReady world={W} model={state.data?.model} what={what} />;
  return <>{children(state.data.data)}</>;
}

export const Stat: React.FC<{ label: string; value: React.ReactNode; note?: React.ReactNode; strong?: boolean }> = ({ label, value, note, strong }) => (
  <div className={`rounded-2xl px-4 py-3.5 ${strong ? 'bg-[#0d0d0d] text-[#f5f2ea]' : T.subtle}`}>
    <p className={`text-xs ${strong ? 'text-white/60' : T.muted}`}>{label}</p>
    <p className={`mt-1 text-xl font-semibold tabular-nums ${strong ? 'text-[#c3d096]' : T.strong}`}>{value}</p>
    {note && <p className={`mt-0.5 text-[11px] ${strong ? 'text-white/50' : T.faint}`}>{note}</p>}
  </div>
);

export const StatRow: React.FC<{ children: React.ReactNode; cols?: number }> = ({ children, cols = 4 }) => (
  <div className={`grid grid-cols-2 gap-3 ${cols === 5 ? 'lg:grid-cols-5' : cols === 4 ? 'lg:grid-cols-4' : cols === 3 ? 'lg:grid-cols-3' : ''}`}>{children}</div>
);

/** A short "what this shows / how to read it" note under a chart. */
export const Reading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className={`mt-3 rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${T.subtle} ${T.muted}`}>{children}</p>
);

export interface Col<R> { key: string; label: React.ReactNode; align?: 'right'; render: (row: R, i: number) => React.ReactNode }

/** Compact table for lab results. */
export function MiniTable<R>({ rows, cols, rowKey, max, dense }: {
  rows: R[];
  cols: Col<R>[];
  rowKey?: (row: R, i: number) => string | number;
  max?: number;
  dense?: boolean;
}) {
  const shown = max ? rows.slice(0, max) : rows;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={`text-left text-xs ${T.muted}`}>
            {cols.map((c) => (
              <th key={c.key} className={`whitespace-nowrap px-2 py-2 font-medium first:pl-0 last:pr-0 ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className={`divide-y border-t ${T.hairline} ${T.divide}`}>
          {shown.map((row, i) => (
            <tr key={rowKey ? rowKey(row, i) : i} className={T.rowHover}>
              {cols.map((c) => (
                <td key={c.key} className={`px-2 ${dense ? 'py-1.5' : 'py-2.5'} tabular-nums first:pl-0 last:pr-0 ${c.align === 'right' ? 'text-right' : ''}`}>{c.render(row, i)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {max && rows.length > max && <p className={`mt-2 text-xs ${T.faint}`}>Showing {max} of {rows.length}.</p>}
    </div>
  );
}

/** Confusion matrix: rows are the actual class, columns the predicted one. */
export const ConfusionMatrix: React.FC<{ matrix: number[][]; labels: string[] }> = ({ matrix, labels }) => {
  const total = matrix.flat().reduce((a, b) => a + b, 0) || 1;
  const max = Math.max(...matrix.flat(), 1);
  return (
    <div className="overflow-x-auto">
      <table className="text-sm">
        <thead>
          <tr>
            <th />
            <th colSpan={labels.length} className={`pb-1 text-center text-xs font-medium ${T.muted}`}>Predicted</th>
          </tr>
          <tr>
            <th className={`pr-3 text-left text-xs font-medium ${T.muted}`}>Actual</th>
            {labels.map((l) => <th key={l} className={`px-2 pb-2 text-xs font-medium ${T.muted}`}>{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={labels[i]}>
              <th className="pr-3 text-left text-xs font-medium">{labels[i]}</th>
              {row.map((v, j) => (
                <td key={j} className="p-1">
                  <div
                    className="grid h-16 w-28 place-items-center rounded-xl text-center"
                    style={{ background: sequentialColor(v / max), color: v / max > 0.55 ? '#fff' : '#141414' }}
                    title={`${labels[i]} predicted as ${labels[j]}: ${v}`}
                  >
                    <span>
                      <span className="block text-lg font-semibold tabular-nums">{num(v, 0)}</span>
                      <span className="block text-[11px] opacity-80">{i === j ? (i === 1 ? 'TP' : 'TN') : i === 1 ? 'FN' : 'FP'} · {pctOf(v / total, 0)}</span>
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** Accuracy / precision / recall / F1 as stat tiles. */
export const ClassMetrics: React.FC<{ m: { accuracy: number; precision: number; recall: number; f1: number } }> = ({ m }) => (
  <StatRow>
    <Stat label="Accuracy" value={pctOf(m.accuracy)} note="(TP + TN) / all" />
    <Stat label="Precision" value={pctOf(m.precision)} note="TP / (TP + FP)" />
    <Stat label="Recall" value={pctOf(m.recall)} note="TP / (TP + FN)" />
    <Stat label="F1-score" value={pctOf(m.f1)} note="harmonic mean of P and R" />
  </StatRow>
);

/** A recharts tooltip body in the console's style. */
export const TipBox: React.FC<{ title?: React.ReactNode; rows: [React.ReactNode, React.ReactNode][] }> = ({ title, rows }) => (
  <div className="rounded-xl border border-[#e6e2d8] bg-white px-3 py-2 text-xs shadow-lg">
    {title && <p className="mb-1 font-semibold text-[#141414]">{title}</p>}
    {rows.map(([k, v], i) => (
      <p key={i} className="flex justify-between gap-4 text-[#52514e]"><span>{k}</span><span className="font-semibold tabular-nums text-[#141414]">{v}</span></p>
    ))}
  </div>
);

/** Legend chip: colour swatch + label (identity never carried by colour alone). */
export const Swatch: React.FC<{ color: string; label: React.ReactNode; shape?: 'dot' | 'square' }> = ({ color, label, shape = 'dot' }) => (
  <span className="inline-flex items-center gap-1.5 text-xs">
    <span className={`inline-block h-2.5 w-2.5 ${shape === 'dot' ? 'rounded-full' : 'rounded-sm'}`} style={{ background: color }} aria-hidden="true" />
    {label}
  </span>
);
