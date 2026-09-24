import React from 'react';
import {
  Banknote, CheckCircle2, IndianRupee, Percent, ReceiptText, Repeat, ShoppingBasket, TicketPercent, Users, XCircle,
} from 'lucide-react';
import { analyticsAPI, type RestaurantAnalytics, type ZestyAnalytics } from '../../../api/analytics';
import {
  CATEGORY_COLORS,
  ColumnBars,
  DataTable,
  Donut,
  Heatmap,
  InsightHeading,
  InsightList,
  KpiGrid,
  SplitBar,
  StackedColumns,
  describeDelta,
  leader,
  paymentName,
  type Insight,
  type KpiSpec,
} from '../../../components/dashboard/analytics';
import { EmptyState, Panel, RankedBars, StatusBreakdown } from '../../../components/dashboard/primitives';
import { formatINR, formatInt, plural, themes, type DashWorld } from '../../../components/dashboard/theme';
import { AnalyticsFrame, AnalyticsHeader, StatTile, downloadCsv, useAnalytics } from './shared';

type Props = { mode: 'admin' } | { mode: 'restaurant'; restaurantId: number; restaurantName?: string };

const ZestyAnalyticsView: React.FC<Props> = (props) => {
  const W: DashWorld = props.mode === 'admin' ? 'platforma' : 'zesty';
  const t = themes[W];
  const restaurantId = props.mode === 'restaurant' ? props.restaurantId : null;
  const { range, setRange, data, loading, error, reload } = useAnalytics<ZestyAnalytics | RestaurantAnalytics>(
    (r) => (restaurantId ? analyticsAPI.restaurant(restaurantId, r) : analyticsAPI.zesty(r)),
    [restaurantId]
  );
  const admin = data && 'catalog' in data ? (data as ZestyAnalytics) : null;
  const own = data && 'menu' in data ? (data as RestaurantAnalytics) : null;

  const specs: KpiSpec[] = [
    { key: 'gmv', label: props.mode === 'admin' ? 'Food GMV' : 'Sales', icon: IndianRupee, hint: 'Non-cancelled order totals' },
    { key: 'orders', label: 'Orders', icon: ReceiptText },
    { key: 'aov', label: 'Avg order value', icon: ShoppingBasket },
    { key: 'items_per_order', label: 'Items per order', icon: ShoppingBasket },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'repeat_rate', label: 'Repeat customers', icon: Repeat, hint: 'Customers who ordered 2+ times in the period' },
    { key: 'completion_rate', label: 'Delivered', icon: CheckCircle2, hint: 'Delivered ÷ (delivered + cancelled)' },
    { key: 'cancellation_rate', label: 'Cancellations', icon: XCircle },
    {
      key: 'commission',
      label: props.mode === 'admin' ? 'Commission earned' : 'Platform commission',
      icon: Percent,
      hint: props.mode === 'admin' ? 'On order subtotals' : `At ${own?.restaurant.commission_rate ?? '—'}% of subtotal`,
    },
    { key: 'discount_spend', label: 'Discounts given', icon: TicketPercent },
    { key: 'promo_share', label: 'Orders with a promo', icon: TicketPercent },
    { key: 'cod_share', label: 'Cash on delivery', icon: Banknote },
  ];

  const insights: Insight[] = [];
  if (data) {
    const k = data.kpis;
    const d = describeDelta(k.gmv);
    if (d && d.direction !== 'flat' && !d.isNew) {
      insights.push({ tone: d.good ? 'good' : 'warn', text: <>Sales are <strong>{d.direction} {d.text}</strong> on the previous period.</> });
    }
    const part = leader(data.dayparts, 'value');
    if (part) insights.push({ tone: 'info', text: <><strong>{part.label}</strong> brings {part.share}% of sales. Make sure the menu and prep are strongest then.</> });
    const day = leader(data.weekdays, 'value');
    if (day) insights.push({ tone: 'info', text: <><strong>{day.label}</strong> is the strongest day ({day.share}% of sales).</> });
    const mix = data.customer_mix;
    const totalOrders = mix.new_orders + mix.returning_orders;
    if (totalOrders) {
      const returning = Math.round((mix.returning_orders / totalOrders) * 100);
      insights.push({
        tone: returning >= 40 ? 'good' : 'warn',
        text: <>{returning}% of orders came from <strong>returning customers</strong>{returning < 40 ? '. A loyalty code could lift repeat orders.' : '. Loyalty is healthy.'}</>,
      });
    }
    const top = data.top_dishes[0];
    const total = k.gmv.value ?? 0;
    if (top && total) {
      insights.push({ tone: 'info', text: <><strong>{top.name}</strong> is the best seller: {formatInt(top.quantity)} sold, {Math.round((top.revenue / total) * 100)}% of sales.</> });
    }
    if (own && own.menu.unsold_count > 0) {
      insights.push({ tone: 'warn', text: <><strong>{own.menu.unsold_count} available dishes</strong> didn't sell once in this period. Consider reworking or retiring them.</> });
    }
    if (admin && admin.catalog.without_orders > 0) {
      insights.push({ tone: 'warn', text: <><strong>{admin.catalog.without_orders} active restaurants</strong> had no orders in this period.</> });
    }
    if ((k.cancellation_rate.value ?? 0) >= 10) {
      insights.push({ tone: 'warn', text: <>Cancellations are at <strong>{k.cancellation_rate.value}%</strong>. Check stock-outs and prep times.</> });
    }
    if ((k.promo_share.value ?? 0) === 0 && (k.orders.value ?? 0) > 0) {
      insights.push({ tone: 'info', text: <>No orders used a promo code. A first-order code is a cheap way to test demand.</> });
    }
  }

  const exportCsv = () =>
    data && downloadCsv(`zesty-${restaurantId ?? 'all'}-${range}.csv`, data.series.map((r) => ({ period: r.date, gmv: r.gmv, orders: r.orders, discounts: r.discount })));

  return (
    <div>
      <AnalyticsHeader
        world={W}
        title={props.mode === 'admin' ? 'Zesty performance' : 'Sales analytics'}
        subtitle={props.mode === 'admin' ? 'Every restaurant on Zesty' : props.restaurantName ?? 'Your restaurant'}
        range={range}
        onRange={setRange}
        onExport={data ? exportCsv : undefined}
      />
      <AnalyticsFrame world={W} loading={loading} error={error} hasData={!!data} onRetry={reload}>
        {data && (
          <>
            <KpiGrid world={W} range={range} kpis={data.kpis} specs={specs} />

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel world={W} className="xl:col-span-2" title="Sales over time" description={`Per ${data.window.granularity}, after discounts`}>
                <StackedColumns
                  world={W}
                  ariaLabel="Sales over time"
                  data={data.series}
                  series={[{ key: 'gmv', label: 'Sales', color: '#e23744' }, { key: 'discount', label: 'Discounts', color: '#ffb302' }]}
                />
              </Panel>
              <Panel world={W} title={<InsightHeading world={W} />}>
                <InsightList world={W} insights={insights} />
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel world={W} title="By time of day" description="Sales per daypart">
                <ColumnBars world={W} data={data.dayparts} metric="value" format={(v) => formatINR(v)} />
              </Panel>
              <Panel world={W} title="By weekday" description="Sales per day of week">
                <ColumnBars world={W} data={data.weekdays} metric="value" format={(v) => formatINR(v)} />
              </Panel>
              <Panel world={W} title="Order status" description="Every order placed in the period">
                <StatusBreakdown world={W} counts={data.status_mix} />
              </Panel>
            </div>

            <Panel world={W} title="Order heatmap" description="When orders are placed, by weekday and hour">
              <Heatmap world={W} grid={data.heatmap} unit="orders" />
            </Panel>

            {admin && (
              <Panel world={W} flush title="Restaurant leaderboard" description="Ranked by sales in the period">
                <DataTable
                  world={W}
                  rows={admin.top_restaurants}
                  rowKey={(r) => r.id}
                  empty="No orders in this period."
                  columns={[
                    { key: 'name', label: 'Restaurant', render: (r) => <><p className="font-medium">{r.name}</p><p className={`text-xs ${t.muted}`}>{r.city || '—'}</p></> },
                    { key: 'orders', label: 'Orders', align: 'right', render: (r) => formatInt(r.orders) },
                    { key: 'revenue', label: 'Sales', align: 'right', render: (r) => <span className="font-semibold">{formatINR(r.revenue)}</span> },
                    { key: 'aov', label: 'Avg order', align: 'right', render: (r) => (r.aov ? formatINR(r.aov) : '—') },
                    { key: 'cancel', label: 'Cancelled', align: 'right', render: (r) => (r.cancellation_rate === null ? '—' : `${r.cancellation_rate}%`) },
                    { key: 'rating', label: 'Rating', align: 'right', render: (r) => (r.rating ? r.rating.toFixed(1) : 'New') },
                  ]}
                />
              </Panel>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel world={W} flush title="Best-selling dishes" description="By sales in the period">
                <DataTable
                  world={W}
                  rows={data.top_dishes}
                  rowKey={(r) => r.id}
                  empty="No dishes sold in this period."
                  columns={[
                    {
                      key: 'name',
                      label: 'Dish',
                      render: (r) => (
                        <>
                          <p className="font-medium">{r.name}</p>
                          <p className={`text-xs ${t.muted}`}>{props.mode === 'admin' ? r.restaurant : r.category}{r.is_vegetarian ? ' · Veg' : ''}</p>
                        </>
                      ),
                    },
                    { key: 'qty', label: 'Sold', align: 'right', render: (r) => formatInt(r.quantity) },
                    { key: 'orders', label: 'Orders', align: 'right', render: (r) => formatInt(r.orders) },
                    { key: 'revenue', label: 'Sales', align: 'right', render: (r) => <span className="font-semibold">{formatINR(r.revenue)}</span> },
                  ]}
                />
              </Panel>
              {own ? (
                <Panel world={W} title="Dishes not selling" description={`${own.menu.unsold_count} of ${own.menu.available} available dishes had no orders`}>
                  {own.menu.unsold.length === 0 ? (
                    <EmptyState world={W} compact icon={CheckCircle2} title="Every dish sold" body="Each available dish was ordered at least once in this period." />
                  ) : (
                    <ul className={`divide-y ${t.divide}`}>
                      {own.menu.unsold.map((m) => (
                        <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{m.name}</span>
                            <span className={`text-xs ${t.muted}`}>{m.category}</span>
                          </span>
                          <span className="tabular-nums">{formatINR(m.price)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              ) : (
                <Panel world={W} title="Cuisines" description="Share of sales by primary cuisine">
                  <Donut
                    world={W}
                    format={(v) => formatINR(v)}
                    data={data.cuisines.map((c, i) => ({ label: c.label, value: c.value ?? 0, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))}
                  />
                </Panel>
              )}
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel world={W} title="Menu categories" description="Sales by category">
                {data.categories.length === 0 ? (
                  <p className={`text-sm ${t.muted}`}>Nothing sold in this period yet.</p>
                ) : (
                  <RankedBars world={W} format={(v) => formatINR(v)} data={data.categories.map((c) => ({ label: c.label, value: c.value ?? 0, sub: `${formatInt(c.count)} items sold` }))} />
                )}
              </Panel>
              <Panel world={W} title="Basket size" description="Items per order">
                <ColumnBars world={W} data={data.basket_sizes} format={(v) => formatInt(v)} />
              </Panel>
              <Panel world={W} title="Customers" description="First orders vs returning">
                <SplitBar
                  world={W}
                  parts={[
                    { label: 'New', value: data.customer_mix.new_orders, color: '#ffb302', detail: `${plural(data.customer_mix.new_orders, 'order')} · ${formatINR(data.customer_mix.new_value)}` },
                    { label: 'Returning', value: data.customer_mix.returning_orders, color: '#e23744', detail: `${plural(data.customer_mix.returning_orders, 'order')} · ${formatINR(data.customer_mix.returning_value)}` },
                  ]}
                />
                <div className={`mt-5 border-t pt-4 ${t.hairline}`}>
                  <p className={`mb-3 text-sm ${t.muted}`}>Veg vs non-veg items</p>
                  <SplitBar
                    world={W}
                    parts={[
                      { label: 'Veg', value: data.veg_split.veg, color: '#1fa463' },
                      { label: 'Non-veg', value: data.veg_split.non_veg, color: '#b7122a' },
                    ]}
                  />
                </div>
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel world={W} title="Payment methods" description="By number of orders">
                <Donut
                  world={W}
                  data={data.payment_methods.map((m, i) => ({ label: paymentName(m.label), value: m.count, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))}
                />
              </Panel>
              {admin ? (
                <>
                  <Panel world={W} title="Top cities" description="Sales by restaurant city">
                    {admin.cities.length === 0 ? (
                      <p className={`text-sm ${t.muted}`}>No sales in this period.</p>
                    ) : (
                      <RankedBars world={W} format={(v) => formatINR(v)} data={admin.cities.map((c) => ({ label: c.label, value: c.value ?? 0, sub: plural(c.count, 'order') }))} />
                    )}
                  </Panel>
                  <Panel world={W} title="Price tiers" description="Sales by restaurant price range">
                    <ColumnBars world={W} data={admin.price_tiers} metric="value" format={(v) => formatINR(v)} />
                  </Panel>
                </>
              ) : own ? (
                <>
                  <Panel world={W} title="Ratings" description={own.reviews.count ? `${own.reviews.count} reviews · ${own.reviews.average ?? '—'} average` : 'No reviews in this period'}>
                    <ColumnBars world={W} data={own.reviews.distribution} highlightMax={false} />
                  </Panel>
                  <Panel world={W} title="Promo codes" description="Codes used in this period">
                    {data.promo_codes.length === 0 ? (
                      <p className={`text-sm ${t.muted}`}>No promo codes were redeemed in this period.</p>
                    ) : (
                      <RankedBars world={W} format={(v) => `${formatInt(v)} uses`} data={data.promo_codes.map((p) => ({ label: p.code, value: p.orders, sub: `${formatINR(p.discount)} discount · ${formatINR(p.revenue)} sales` }))} />
                    )}
                  </Panel>
                </>
              ) : null}
            </div>

            {admin && (
              <Panel world={W} title="Catalog health" description="Current state of restaurants and menus">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                  <StatTile world={W} label="Restaurants" value={formatInt(admin.catalog.restaurants)} />
                  <StatTile world={W} label="Active" value={formatInt(admin.catalog.active)} />
                  <StatTile world={W} label="Verified" value={formatInt(admin.catalog.verified)} />
                  <StatTile world={W} label="Awaiting verification" value={formatInt(admin.catalog.pending_verification)} tone={admin.catalog.pending_verification ? 'warn' : 'default'} />
                  <StatTile world={W} label="Open now" value={formatInt(admin.catalog.open_now)} />
                  <StatTile world={W} label="No orders this period" value={formatInt(admin.catalog.without_orders)} tone={admin.catalog.without_orders ? 'warn' : 'default'} />
                  <StatTile world={W} label="Menu items available" value={admin.catalog.menu_available_rate === null ? '—' : `${admin.catalog.menu_available_rate}%`} note={`${formatInt(admin.catalog.menu_items)} items`} />
                  <StatTile world={W} label="Average rating" value={admin.catalog.avg_rating ?? '—'} note="Rated restaurants" />
                </div>
              </Panel>
            )}
          </>
        )}
      </AnalyticsFrame>
    </div>
  );
};

export default ZestyAnalyticsView;
