import React from 'react';
import { HeartCrack, Repeat2, Users } from 'lucide-react';
import { miningAPI } from '../../../api/warehouse';
import { CATEGORY_COLORS, DataTable, Donut } from '../../../components/dashboard/reportCharts';
import { ErrorBanner, Panel, SkeletonRows, StatusPill } from '../../../components/dashboard/primitives';
import { ModelBadge, NotReady, ProbabilityBar, VerticalSwitch } from '../../../components/dashboard/intelligence';
import { aucQuality, useLoad, type Vertical } from '../../../components/dashboard/intelligenceUtils';
import { formatINR, formatInt, humanize, themes } from '../../../components/dashboard/theme';
import { StatTile } from '../reports/shared';

const W = 'platforma' as const;
const VALUE_BANDS = ['platinum', 'gold', 'silver', 'bronze'];
const CHURN_BANDS = ['low', 'medium', 'high'];

/** 'event:concert' -> 'go to a concert', 'food:North Indian' -> 'order North Indian food'. */
const describeToken = (token: string) => {
  const [domain, value] = token.split(':');
  return domain === 'event' ? `go to a ${humanize(value).toLowerCase()} event` : `order ${value} food`;
};

const SCOPE_TEXT: Record<Vertical, string> = {
  all: 'across Zesty and Eventra together',
  zesty: 'on Zesty only',
  eventra: 'on Eventra only',
};

const CustomerIntelView: React.FC<{ vertical: Vertical; onVerticalChange: (v: Vertical) => void }> = ({ vertical, onVerticalChange }) => {
  const t = themes[W];
  const scores = useLoad(() => miningAPI.customers(vertical), [vertical]);
  const habits = useLoad(() => miningAPI.sequences(), []);
  const segments = useLoad(() => miningAPI.segments(vertical), [vertical]);

  const data = scores.data;
  const cell = (value: string, churn: string) => data?.matrix.find((m) => m.value_band === value && m.churn_band === churn);
  const churnMetrics = data?.model.metrics?.churn;
  const valueMetrics = data?.model.metrics?.value;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={`${t.display} text-2xl sm:text-[28px] ${t.strong}`}>Customers</h2>
          <p className={`mt-1 text-sm ${t.muted}`}>Who is worth the most over the next 90 days and who is drifting away, {SCOPE_TEXT[vertical]}.</p>
          <div className="mt-2"><ModelBadge world={W} model={data?.model} quality={aucQuality(churnMetrics?.roc_auc)} /></div>
        </div>
        <VerticalSwitch world={W} value={vertical} onChange={onVerticalChange} />
      </div>

      {scores.error && <ErrorBanner world={W} message={scores.error} onRetry={scores.reload} />}

      {scores.loading && !data ? (
        <Panel world={W}><SkeletonRows world={W} rows={5} /></Panel>
      ) : !data?.model.available ? (
        <NotReady world={W} model={data?.model} what="customer scores" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile world={W} label="Customers scored" value={formatInt(data.totals?.customers)} />
            <StatTile world={W} label="Expected spend, next 90 days" value={formatINR(data.totals?.predicted_90d_value)}
              note={valueMetrics ? `Typical error ${formatINR(valueMetrics.mae_rupees)} vs ${formatINR(valueMetrics.baseline_mae_rupees)} for "same as last quarter"` : undefined} />
            <StatTile world={W} label="Spend at high risk" value={formatINR(data.totals?.high_risk_value)} tone={data.totals?.high_risk_value ? 'warn' : 'default'} />
            <StatTile world={W} label="Churn rate last quarter" value={churnMetrics ? `${Math.round((data.model.metrics?.churn_rate ?? 0) * 100)}%` : '—'}
              note="Customers who bought nothing in the 90 days after the cutoff" />
          </div>

          <div className="grid gap-6 xl:grid-cols-5">
            <Panel world={W} className="xl:col-span-2" title="Value × risk" description="Customers by predicted value and chance of not buying in 90 days">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-xs ${t.muted}`}>
                      <th className="py-2 text-left font-medium">Value</th>
                      {CHURN_BANDS.map((c) => <th key={c} className="py-2 text-right font-medium">{humanize(c)} risk</th>)}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${t.divide}`}>
                    {VALUE_BANDS.map((v) => (
                      <tr key={v}>
                        <td className="py-2.5 font-medium">{humanize(v)}</td>
                        {CHURN_BANDS.map((c) => {
                          const m = cell(v, c);
                          const urgent = (v === 'platinum' || v === 'gold') && c !== 'low' && m?.customers;
                          return (
                            <td key={c} className={`py-2.5 text-right tabular-nums ${urgent ? 'font-semibold text-rose-600' : ''}`}>
                              {m ? formatInt(m.customers) : <span className={t.faint}>0</span>}
                              {m?.predicted_value ? <span className={`block text-[11px] font-normal ${t.faint}`}>{formatINR(m.predicted_value)}</span> : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel world={W} flush className="xl:col-span-3" title={<span className="inline-flex items-center gap-2"><HeartCrack className="h-5 w-5 text-rose-500" aria-hidden="true" />Valuable customers drifting away</span>}
              description="Platinum and gold customers with a medium or high chance of not coming back. Worth a personal offer.">
              <DataTable
                world={W}
                rows={data.at_risk}
                rowKey={(r) => r.customer_id}
                empty="No high-value customers are at risk right now."
                columns={[
                  { key: 'who', label: 'Customer', render: (r) => (
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.customer?.name ?? `Customer ${r.customer_id}`}</p>
                      <p className={`truncate text-xs ${t.muted}`}>{r.reason}</p>
                    </div>
                  ) },
                  { key: 'band', label: 'Value', render: (r) => <StatusPill world={W} tone={r.value_band === 'platinum' ? 'info' : 'neutral'} label={humanize(r.value_band)} /> },
                  { key: 'value', label: 'Next 90 days', align: 'right', render: (r) => formatINR(r.predicted_90d_value) },
                  { key: 'risk', label: 'Risk of leaving', render: (r) => <ProbabilityBar world={W} value={r.churn_probability ?? 0} /> },
                ]}
              />
            </Panel>
          </div>
        </>
      )}

      <div className="grid gap-6 xl:grid-cols-5">
        <Panel world={W} className="xl:col-span-2" title="Segments" description="RFM clusters (recency, frequency, spend)">
          {segments.data && Object.keys(segments.data.segment_distribution ?? {}).length ? (
            <Donut world={W} data={Object.entries(segments.data.segment_distribution).map(([label, value], i) => ({ label, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))}
              center={<div><p className="text-2xl font-semibold tabular-nums">{formatInt(Object.values(segments.data.segment_distribution).reduce((a, b) => a + b, 0))}</p><p className={`text-[11px] ${t.muted}`}>customers</p></div>} />
          ) : (
            <p className={`text-sm ${t.muted}`}>{segments.data?.reason ?? 'Segments appear after the first mining run.'}</p>
          )}
        </Panel>

        <Panel world={W} className="xl:col-span-3" title={<span className="inline-flex items-center gap-2"><Repeat2 className={`h-5 w-5 ${t.accentText}`} aria-hidden="true" />Habits across Zesty and Eventra</span>}
          description="Things customers do within hours of each other, far more often than chance">
          <ModelBadge world={W} model={habits.data?.model} />
          {habits.data?.rules.length ? (
            <ul className="mt-4 space-y-3">
              {habits.data.rules.filter((r, i, all) => all.findIndex((o) => o.antecedent === r.antecedent && o.consequent === r.consequent) === i).slice(0, 8).map((r) => (
                <li key={`${r.antecedent}-${r.consequent}-${r.window_hours}`} className={`rounded-xl px-4 py-3 ${t.subtle}`}>
                  <p className="text-sm">
                    People who <strong>{describeToken(r.antecedent)}</strong> also <strong>{describeToken(r.consequent)}</strong> within {r.window_hours} hours of it
                  </p>
                  <p className={`mt-0.5 text-xs ${t.muted}`}>
                    {r.lift.toFixed(1)}× more often than usual · {Math.round(r.confidence * 100)}% of the time · seen {formatInt(r.occurrences)} times
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`mt-3 text-sm ${t.muted}`}>No strong cross-vertical habits found yet.</p>
          )}
          <p className={`mt-4 flex items-center gap-2 text-xs ${t.faint}`}>
            <Users className="h-3.5 w-3.5" aria-hidden="true" /> Use these for bundles, e.g. a dinner offer sent with concert tickets.
          </p>
        </Panel>
      </div>
    </div>
  );
};

export default CustomerIntelView;
