import React from 'react';
import { Database, Workflow } from 'lucide-react';
import { miningAPI, olapAPI, type ModuleStatus } from '../../../api/warehouse';
import { DataTable } from '../../../components/dashboard/reportCharts';
import { ErrorBanner, Panel, SkeletonRows, StatusPill } from '../../../components/dashboard/primitives';
import { VerticalSwitch } from '../../../components/dashboard/intelligence';
import { inVertical, relativeTime, useLoad, type Vertical } from '../../../components/dashboard/intelligenceUtils';
import { formatInt, humanize, themes, type Tone } from '../../../components/dashboard/theme';
import { StatTile } from '../reports/shared';

const W = 'platforma' as const;

const MODULE_NAMES: Record<string, string> = {
  basket: 'Frequently ordered together', segments: 'Customer segments', customers: 'Churn & customer value',
  anomaly: 'Anomaly detection', risk: 'No-show & cancellation risk', forecast: 'Demand forecast',
  sellout: 'Event sell-out', recommend: 'Recommendations', sequences: 'Cross-vertical habits',
  delivery: 'Delivery-time estimates', hotspots: 'Demand hotspots', search: 'Search demand',
  promos: 'Promotion effectiveness', pricing: 'Ticket price elasticity',
};

/** The single most telling number for each module, in words. */
const headline = (m: ModuleStatus): string => {
  const x = m.metrics ?? {};
  if (m.skipped) return x.reason ?? 'Not enough data';
  switch (m.module) {
    case 'basket': return `${formatInt(x.total_rules)} rules, average lift ${x.avg_lift}`;
    case 'segments': return `${x.k} segments, silhouette ${x.silhouette}`;
    case 'customers': return `Churn AUC ${x.churn?.roc_auc ?? '—'} · value error ₹${formatInt(x.value?.mae_rupees)}`;
    case 'anomaly': return `${formatInt((x.orders?.flagged ?? 0) + (x.bookings?.flagged ?? 0))} flagged${x.orders?.evaluation ? ` · precision@k ${x.orders.evaluation.precision_at_k}` : ''}`;
    case 'risk': return `No-show AUC ${x.booking_no_show?.roc_auc ?? '—'} · cancellation AUC ${x.booking_cancellation?.roc_auc ?? '—'}`;
    case 'forecast': return `Platform orders WAPE ${x.platform_orders?.wape ?? '—'} (naive ${x.platform_orders?.baseline_wape ?? '—'})`;
    case 'sellout': return `${formatInt(x.events_forecast)} events · MAPE ${x.mape_14d ?? '—'} at 14 days`;
    case 'recommend': return `Hit rate@10 ${x.food?.evaluation?.hit_rate_at_10 ?? '—'} (popularity ${x.food?.evaluation?.popularity_hit_rate_at_10 ?? '—'})`;
    case 'sequences': return `${formatInt(x.rules)} cross-vertical rules`;
    case 'delivery': return `MAE ${x.mae} min (restaurant average ${x.baseline_mae}) · ${Math.round((x.within_5_min ?? 0) * 100)}% within 5 min`;
    case 'hotspots': return `${formatInt(x.clusters)} clusters, ${formatInt(x.undersupplied)} undersupplied`;
    case 'search': return `${formatInt(x.searches)} searches · ${Math.round((x.zero_result_share ?? 0) * 100)}% found nothing`;
    case 'promos': return `${formatInt(x.promotions)} promotions, ${formatInt(x.judged)} judged`;
    case 'pricing': return `${formatInt(x.categories)} categories`;
    default: return '';
  }
};

const statusTone = (s: string): Tone => (s === 'succeeded' || s === 'pass' ? 'success' : s === 'failed' || s === 'fail' ? 'danger' : s === 'warn' || s === 'running' ? 'warn' : 'neutral');

const PipelineHealthView: React.FC<{ vertical: Vertical; onVerticalChange: (v: Vertical) => void }> = ({ vertical, onVerticalChange }) => {
  const t = themes[W];
  const health = useLoad(() => olapAPI.health(), []);
  const models = useLoad(() => miningAPI.models(), []);
  const h = health.data;
  const failing = h?.checks.filter((c) => c.status !== 'pass').length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={`${t.display} text-2xl sm:text-[28px] ${t.strong}`}>Pipeline</h2>
          <p className={`mt-1 text-sm ${t.muted}`}>The nightly warehouse load, its data-quality checks, and how every model performed on its last run.</p>
        </div>
        <VerticalSwitch world={W} value={vertical} onChange={onVerticalChange} />
      </div>
      {(health.error || models.error) && <ErrorBanner world={W} message={(health.error || models.error)!} onRetry={() => { void health.reload(); void models.reload(); }} />}

      {health.loading && !h ? <Panel world={W}><SkeletonRows world={W} rows={4} /></Panel> : h && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile world={W} label="Warehouse database" value={h.separate_database ? 'Separate' : 'Shared'}
              note={h.separate_database ? 'Isolated from the main app' : 'Set WAREHOUSE_DATABASE_URL to isolate it'} tone={h.separate_database ? 'good' : 'warn'} />
            <StatTile world={W} label="Last load" value={relativeTime(h.last_run?.started_at)} />
            <StatTile world={W} label="Quality checks" value={h.checks.length ? `${h.checks.length - failing}/${h.checks.length} pass` : '—'} tone={failing ? 'warn' : 'default'} />
            <StatTile world={W} label="Orders in warehouse" value={formatInt(h.row_counts.fact_order)} note={`${formatInt(h.row_counts.fact_booking)} bookings`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel world={W} flush title={<span className="inline-flex items-center gap-2"><Database className={`h-5 w-5 ${t.accentText}`} aria-hidden="true" />Last load, table by table</span>}>
              <DataTable world={W} rows={h.tables} rowKey={(r) => r.table_name} empty="The warehouse has never been loaded."
                columns={[
                  { key: 'table', label: 'Table', render: (r) => <span className="font-mono text-xs">{r.table_name}</span> },
                  { key: 'read', label: 'Read', align: 'right', render: (r) => formatInt(r.rows_read) },
                  { key: 'loaded', label: 'Loaded', align: 'right', render: (r) => formatInt(r.rows_loaded) },
                  { key: 'rejected', label: 'Rejected', align: 'right', render: (r) => (r.rows_rejected ? <span className="font-semibold text-amber-600">{formatInt(r.rows_rejected)}</span> : '0') },
                  { key: 'status', label: '', render: (r) => <StatusPill world={W} tone={statusTone(r.status)} label={humanize(r.status)} /> },
                ]} />
            </Panel>
            <Panel world={W} flush title="Data-quality checks" description="Warehouse against the live database, after the last load">
              <DataTable world={W} rows={h.checks} rowKey={(r) => r.check_name} empty="No checks recorded yet."
                columns={[
                  { key: 'check', label: 'Check', render: (r) => (
                    <div><p className="font-medium">{humanize(r.check_name)}</p><p className={`text-xs ${t.muted}`}>{r.message}</p></div>
                  ) },
                  { key: 'status', label: '', render: (r) => <StatusPill world={W} tone={statusTone(r.status)} label={humanize(r.status)} /> },
                ]} />
            </Panel>
          </div>
        </>
      )}

      <Panel world={W} flush title={<span className="inline-flex items-center gap-2"><Workflow className={`h-5 w-5 ${t.accentText}`} aria-hidden="true" />Models</span>}
        description="Each model is evaluated on held-out data every run; numbers below are from the run currently being served.">
        {models.loading && !models.data ? <div className="p-6"><SkeletonRows world={W} rows={6} /></div> : (
          <DataTable world={W} rows={(models.data?.modules ?? []).filter((m) => inVertical(vertical, m.verticals))} rowKey={(m) => m.module} empty="No models have run."
            columns={[
              { key: 'name', label: 'Model', render: (m) => (
                <div><p className="font-medium">{MODULE_NAMES[m.module] ?? m.module}</p><p className={`text-xs ${t.muted}`}>{headline(m)}</p>{m.last_error && <p className="text-xs text-rose-600">{m.last_error}</p>}</div>
              ) },
              { key: 'when', label: 'Updated', render: (m) => <span className={t.muted}>{relativeTime(m.as_of)}</span> },
              { key: 'status', label: '', render: (m) => <StatusPill world={W} tone={m.skipped ? 'warn' : statusTone(m.status)} label={m.skipped ? 'Waiting for data' : humanize(m.status)} /> },
            ]} />
        )}
      </Panel>
    </div>
  );
};

export default PipelineHealthView;
