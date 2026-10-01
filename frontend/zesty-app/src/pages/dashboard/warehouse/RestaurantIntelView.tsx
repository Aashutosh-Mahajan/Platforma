import React from 'react';
import { AlertTriangle, Clock, Link2, TicketPercent, TrendingUp } from 'lucide-react';
import { miningAPI } from '../../../api/warehouse';
import { ColumnBars } from '../../../components/dashboard/reportCharts';
import { ErrorBanner, Panel, SkeletonRows } from '../../../components/dashboard/primitives';
import { ForecastChart, ModelBadge, NotReady, ProbabilityBar } from '../../../components/dashboard/intelligence';
import { useLoad } from '../../../components/dashboard/intelligenceUtils';
import { shortRef, themes } from '../../../components/dashboard/theme';
import { StatTile } from '../reports/shared';
import { PromoTable } from './DemandIntelView';

const W = 'zesty' as const;

const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString('en-IN', { hour: 'numeric' });

/** Forecasts, combos, promo results and live risk for one restaurant (owner view). */
const RestaurantIntelView: React.FC<{ restaurantId: number; restaurantName: string }> = ({ restaurantId, restaurantName }) => {
  const t = themes[W];
  const forecast = useLoad(() => miningAPI.restaurantForecast(restaurantId), [restaurantId]);
  const combos = useLoad(() => miningAPI.combos(restaurantId), [restaurantId]);
  const promos = useLoad(() => miningAPI.promos(restaurantId), [restaurantId]);
  const risk = useLoad(() => miningAPI.orderRisk(restaurantId), [restaurantId]);
  const eta = useLoad(() => miningAPI.deliveryEstimate(restaurantId, 2), [restaurantId]);
  const f = forecast.data;
  const busiest = f?.hourly_tomorrow.reduce((best, h) => (h.share > best.share ? h : best), { hour: 0, share: 0, expected_orders: null as number | null });

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`${t.display} text-2xl sm:text-[28px] ${t.strong}`}>Forecasts & insights</h2>
        <p className={`mt-1 text-sm ${t.muted}`}>What the next two weeks look like for {restaurantName}, which dishes sell together and which promotions paid off.</p>
        <div className="mt-2"><ModelBadge world={W} model={f?.model} /></div>
      </div>
      {forecast.error && <ErrorBanner world={W} message={forecast.error} onRetry={forecast.reload} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile world={W} label="Expected orders, next 7 days" value={f?.next_7_days !== null && f?.next_7_days !== undefined ? `≈ ${Math.round(f.next_7_days)}` : '—'} />
        <StatTile world={W} label="Expected tomorrow" value={f?.forecast[0] ? `≈ ${f.forecast[0].predicted.toFixed(1)}` : '—'}
          note={f?.forecast[0] ? `likely ${f.forecast[0].lower.toFixed(0)}–${Math.ceil(f.forecast[0].upper)}` : undefined} />
        <StatTile world={W} label="Busiest hour" value={busiest && busiest.share > 0 ? hourLabel(busiest.hour) : '—'}
          note={busiest && busiest.share > 0 ? `${Math.round(busiest.share * 100)}% of your orders` : undefined} />
        <StatTile world={W} label="Delivery time right now" value={eta.data ? `${eta.data.low}–${eta.data.high} min` : '—'}
          note={eta.data?.source === 'model' ? 'Predicted from your past deliveries' : 'Your listed range'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Panel world={W} className="xl:col-span-3" title={<span className="inline-flex items-center gap-2"><TrendingUp className={`h-5 w-5 ${t.accentText}`} aria-hidden="true" />Orders: last 4 weeks and next 2</span>}>
          {forecast.loading && !f ? <SkeletonRows world={W} rows={3} />
            : f && !f.forecast.length ? <NotReady world={W} model={f.model.available ? { available: false, reason: 'This restaurant needs about six weeks of recent orders before it gets a forecast.' } : f.model} what="forecast" />
            : f && <ForecastChart world={W} unit="orders" actuals={f.actuals} forecast={f.forecast} />}
        </Panel>
        <Panel world={W} className="xl:col-span-2" title={<span className="inline-flex items-center gap-2"><Clock className={`h-5 w-5 ${t.accentText}`} aria-hidden="true" />Tomorrow by hour</span>}
          description="Staff for the tall bars">
          {f && f.hourly_tomorrow.some((h) => h.share > 0) ? (
            <ColumnBars world={W} height={140}
              data={f.hourly_tomorrow.filter((h) => h.hour >= 8).map((h) => ({ label: hourLabel(h.hour).replace(' ', ''), count: h.expected_orders ?? h.share * 100 }))}
              format={(v) => (f.hourly_tomorrow.some((h) => h.expected_orders !== null) ? (v < 0.05 ? '' : v.toFixed(1)) : `${Math.round(v)}%`)} />
          ) : (
            <p className={`text-sm ${t.muted}`}>Not enough orders yet to show a daily rhythm.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel world={W} title={<span className="inline-flex items-center gap-2"><Link2 className={`h-5 w-5 ${t.accentText}`} aria-hidden="true" />Ordered together</span>}
          description="Dish pairs your customers buy together far more than chance. Good candidates for a combo.">
          {combos.data?.combos.length ? (
            <ul className={`divide-y ${t.divide}`}>
              {combos.data.combos.slice(0, 8).map((c) => (
                <li key={`${c.antecedent.join()}-${c.consequent.join()}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0"><strong>{c.antecedent.join(' + ')}</strong> <span className={t.muted}>→</span> <strong>{c.consequent.join(' + ')}</strong></span>
                  <span className={`shrink-0 tabular-nums ${t.muted}`}>{Math.round(c.confidence * 100)}% of the time · {c.lift.toFixed(1)}×</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`text-sm ${t.muted}`}>No strong pairs yet. They show up once enough orders contain more than one dish.</p>
          )}
        </Panel>
        <Panel world={W} title={<span className="inline-flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />Live orders at risk of cancelling</span>}
          description="Orders still in progress, by predicted chance of cancellation">
          {risk.data?.orders.length ? (
            <ul className={`divide-y ${t.divide}`}>
              {risk.data.orders.slice(0, 8).map((o) => (
                <li key={o.order_id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="font-medium">Order #{shortRef(o.order_id)}</span>
                  <ProbabilityBar world={W} value={o.probability} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={`text-sm ${t.muted}`}>No live orders right now.</p>
          )}
        </Panel>
      </div>

      <Panel world={W} flush title={<span className="inline-flex items-center gap-2"><TicketPercent className={`h-5 w-5 ${t.accentText}`} aria-hidden="true" />Did your promotions work?</span>}
        description="Orders during each promotion against the weeks before, adjusted for the platform-wide trend">
        <PromoTable world={W} promotions={promos.data?.promotions ?? []} />
      </Panel>
    </div>
  );
};

export default RestaurantIntelView;
