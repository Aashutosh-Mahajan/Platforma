import React from 'react';
import { IndianRupee, Percent, Receipt, Repeat, ShoppingBag, UserPlus, Users, XCircle } from 'lucide-react';
import { analyticsAPI } from '../../../api/analytics';
import {
  CATEGORY_COLORS,
  ColumnBars,
  Donut,
  Funnel,
  Heatmap,
  InsightHeading,
  InsightList,
  KpiGrid,
  SplitBar,
  StackedColumns,
  describeDelta,
  paymentName,
  type Insight,
} from '../../../components/dashboard/analytics';
import { Panel, RankedBars } from '../../../components/dashboard/primitives';
import { formatINR, formatInt, humanize, themes } from '../../../components/dashboard/theme';
import { AnalyticsFrame, AnalyticsHeader, StatTile, downloadCsv, useAnalytics } from './shared';

const W = 'platforma' as const;
const ZESTY = '#e23744';
const EVENTRA = '#c4621a';

const PlatformAnalyticsView: React.FC<{ onNavigate?: (tab: 'approvals' | 'payouts' | 'users') => void }> = ({ onNavigate }) => {
  const t = themes[W];
  const { range, setRange, data, loading, error, reload } = useAnalytics(analyticsAPI.platform, []);

  const insights: Insight[] = [];
  if (data) {
    const k = data.kpis;
    const orders = data.series.reduce((s, r) => s + r.orders, 0);
    const bookings = data.series.reduce((s, r) => s + r.bookings, 0);
    const zGmv = k.zesty_gmv.value ?? 0;
    const eGmv = k.eventra_gmv.value ?? 0;
    const gmv = zGmv + eGmv;
    const gmvDelta = describeDelta(k.gmv);
    if (gmvDelta && gmvDelta.direction !== 'flat' && !gmvDelta.isNew) {
      insights.push({
        tone: gmvDelta.good ? 'good' : 'warn',
        text: <>Gross volume is <strong>{gmvDelta.direction === 'up' ? 'up' : 'down'} {gmvDelta.text}</strong> on the previous period.</>,
      });
    }
    if (gmv > 0 && orders + bookings > 0) {
      const lead = eGmv >= zGmv ? 'Eventra' : 'Zesty';
      const share = Math.round((Math.max(eGmv, zGmv) / gmv) * 100);
      const txShare = Math.round(((lead === 'Eventra' ? bookings : orders) / (orders + bookings)) * 100);
      insights.push({
        tone: 'info',
        text: (
          <>
            <strong>{lead}</strong> brings {share}% of gross volume from {txShare}% of transactions
            {orders && bookings ? (
              <> (average {formatINR(eGmv / bookings)} per booking vs {formatINR(zGmv / orders)} per food order).</>
            ) : '.'}
          </>
        ),
      });
    }
    const flat = data.heatmap.flatMap((row, d) => row.map((n, h) => ({ n, d, h })));
    const peak = flat.reduce((best, c) => (c.n > best.n ? c : best), { n: 0, d: 0, h: 0 });
    if (peak.n > 0) {
      const day = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][peak.d];
      const hour = new Date(2000, 0, 1, peak.h).toLocaleTimeString('en-IN', { hour: 'numeric' });
      insights.push({ tone: 'info', text: <>The busiest slot is <strong>{day} around {hour}</strong>. Time campaigns and staffing to it.</> });
    }
    const funnelTop = data.funnel[0]?.count ?? 0;
    const purchased = data.funnel[1]?.count ?? 0;
    if (funnelTop > purchased) {
      insights.push({
        tone: 'warn',
        text: <><strong>{formatInt(funnelTop - purchased)} registered customers</strong> have never bought anything. A first-order offer could activate them.</>,
      });
    }
    const both = data.funnel[3]?.count ?? 0;
    if (purchased > 0) {
      insights.push({
        tone: both / purchased < 0.3 ? 'warn' : 'good',
        text: <>{Math.round((both / purchased) * 100)}% of paying customers use <strong>both Zesty and Eventra</strong>. Dinner-and-a-show bundles are the obvious cross-sell.</>,
      });
    }
    if ((k.cancellation_rate.value ?? 0) >= 10) {
      insights.push({ tone: 'warn', text: <>Cancellations are at <strong>{k.cancellation_rate.value}%</strong> of all transactions. Worth digging into by restaurant and event.</> });
    }
    if (data.health.stale_orders > 0) {
      insights.push({ tone: 'warn', text: <><strong>{data.health.stale_orders} orders</strong> have sat pending or confirmed for over two hours.</> });
    }
  }

  const exportCsv = () =>
    data &&
    downloadCsv(`platforma-platform-${range}.csv`, data.series.map((r) => ({
      period: r.date, zesty_gmv: r.zesty, eventra_gmv: r.eventra, orders: r.orders, bookings: r.bookings, signups: r.signups,
    })));

  return (
    <div>
      <AnalyticsHeader world={W} title="Platform performance" subtitle="Zesty and Eventra together" range={range} onRange={setRange} onExport={data ? exportCsv : undefined} />
      <AnalyticsFrame world={W} loading={loading} error={error} hasData={!!data} onRetry={reload}>
        {data && (
          <>
            <KpiGrid
              world={W}
              range={range}
              kpis={data.kpis}
              specs={[
                { key: 'gmv', label: 'Gross volume', icon: IndianRupee, hint: 'Non-cancelled orders and bookings' },
                { key: 'commission', label: 'Commission earned', icon: Percent, hint: 'Zesty commission on order subtotals' },
                { key: 'transactions', label: 'Transactions', icon: Receipt },
                { key: 'aov', label: 'Avg transaction', icon: ShoppingBag },
                { key: 'active_customers', label: 'Paying customers', icon: Users },
                { key: 'new_signups', label: 'New sign-ups', icon: UserPlus },
                { key: 'repeat_rate', label: 'Repeat customers', icon: Repeat, hint: 'Customers with 2+ purchases in the period' },
                { key: 'cancellation_rate', label: 'Cancellation rate', icon: XCircle },
              ]}
            />

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel world={W} className="xl:col-span-2" title="Gross volume by vertical" description={`Per ${data.window.granularity}`}>
                <StackedColumns
                  world={W}
                  ariaLabel="Gross volume by vertical over time"
                  data={data.series}
                  series={[
                    { key: 'zesty', label: 'Zesty', color: ZESTY },
                    { key: 'eventra', label: 'Eventra', color: EVENTRA },
                  ]}
                />
              </Panel>
              <Panel world={W} title={<InsightHeading world={W} />}>
                <InsightList world={W} insights={insights} />
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel world={W} title="Customer funnel" description="All time, customer accounts">
                <Funnel world={W} steps={data.funnel} />
              </Panel>
              <Panel world={W} title="Vertical split" description="Share of gross volume">
                <SplitBar
                  world={W}
                  parts={[
                    { label: 'Zesty', value: data.kpis.zesty_gmv.value ?? 0, color: ZESTY, detail: formatINR(data.kpis.zesty_gmv.value) },
                    { label: 'Eventra', value: data.kpis.eventra_gmv.value ?? 0, color: EVENTRA, detail: formatINR(data.kpis.eventra_gmv.value) },
                  ]}
                />
                <div className={`mt-5 border-t pt-4 text-sm ${t.hairline}`}>
                  <p className={t.muted}>Discounts given</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatINR(data.kpis.discount_spend.value)}</p>
                </div>
              </Panel>
              <Panel world={W} title="How people pay" description="By number of transactions">
                <Donut
                  world={W}
                  data={data.payment_methods.map((m, i) => ({ label: paymentName(m.label), value: m.count, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))}
                />
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel world={W} className="xl:col-span-2" title="When people buy" description="Orders and bookings by weekday and hour">
                <Heatmap world={W} grid={data.heatmap} unit="transactions" />
              </Panel>
              <Panel world={W} title="Busiest days" description="Gross volume by weekday">
                <ColumnBars world={W} data={data.weekdays} metric="value" format={(v) => formatINR(v)} />
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel world={W} title="Top cities" description="Combined gross volume">
                {data.regions.length === 0 ? (
                  <p className={`text-sm ${t.muted}`}>No geo-tagged sales in this period.</p>
                ) : (
                  <RankedBars
                    world={W}
                    format={(v) => formatINR(v)}
                    data={data.regions.slice(0, 6).map((r) => ({
                      label: r.label,
                      value: r.value ?? 0,
                      sub: `Zesty ${formatINR(r.zesty)} · Eventra ${formatINR(r.eventra)}`,
                    }))}
                  />
                )}
              </Panel>
              <Panel world={W} title="New sign-ups" description="By account type">
                <Donut
                  world={W}
                  center={
                    <div>
                      <p className="text-2xl font-semibold tabular-nums">{formatInt(data.kpis.new_signups.value)}</p>
                      <p className={`text-[11px] ${t.muted}`}>accounts</p>
                    </div>
                  }
                  data={data.signups_by_role.map((r, i) => ({ label: humanize(r.label), value: r.count, color: CATEGORY_COLORS[(i + 2) % CATEGORY_COLORS.length] }))}
                />
              </Panel>
              <Panel world={W} title="Search" description={`${formatInt(data.search.total)} searches · ${data.search.click_rate ?? 0}% led to a click`}>
                {data.search.top_queries.length === 0 ? (
                  <p className={`text-sm ${t.muted}`}>No searches logged in this period.</p>
                ) : (
                  <RankedBars
                    world={W}
                    format={(v) => `${formatInt(v)}×`}
                    data={data.search.top_queries.map((q) => ({ label: q.label, value: q.count, sub: `${q.clicks} clicked through` }))}
                  />
                )}
              </Panel>
            </div>

            <Panel world={W} title="Needs attention" description="Live operational status">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <StatTile world={W} label="Restaurants to verify" value={data.health.pending_restaurants} tone={data.health.pending_restaurants ? 'warn' : 'default'} onClick={onNavigate ? () => onNavigate('approvals') : undefined} />
                <StatTile world={W} label="Events to approve" value={data.health.pending_events} tone={data.health.pending_events ? 'warn' : 'default'} onClick={onNavigate ? () => onNavigate('approvals') : undefined} />
                <StatTile world={W} label="Payouts pending" value={data.health.pending_payouts} note={formatINR(data.health.pending_payout_amount)} onClick={onNavigate ? () => onNavigate('payouts') : undefined} />
                <StatTile world={W} label="Orders stuck > 2h" value={data.health.stale_orders} tone={data.health.stale_orders ? 'warn' : 'default'} />
                <StatTile world={W} label="Upcoming events without seats" value={data.health.events_without_seats} tone={data.health.events_without_seats ? 'warn' : 'default'} />
                <StatTile world={W} label="Suspended accounts" value={data.health.suspended_users} onClick={onNavigate ? () => onNavigate('users') : undefined} />
              </div>
            </Panel>
          </>
        )}
      </AnalyticsFrame>
    </div>
  );
};

export default PlatformAnalyticsView;
