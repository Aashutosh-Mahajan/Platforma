import React, { useState } from 'react';
import { Flame, MapPin, SearchX, TicketPercent } from 'lucide-react';
import { miningAPI, type PromoEffect, type SearchTerm } from '../../../api/warehouse';
import { DataTable } from '../../../components/dashboard/reportCharts';
import { ErrorBanner, Panel, Segmented, SkeletonRows, StatusPill } from '../../../components/dashboard/primitives';
import { ForecastChart, ModelBadge, NotReady, VerticalSwitch } from '../../../components/dashboard/intelligence';
import { pct, useLoad, type Vertical } from '../../../components/dashboard/intelligenceUtils';
import { formatDate, formatINR, formatInt, humanize, themes, type DashWorld, type Tone } from '../../../components/dashboard/theme';

const W = 'platforma' as const;

const OPPORTUNITY_TONE: Record<string, Tone> = { undersupplied: 'warn', balanced: 'success', oversupplied: 'neutral' };
const VERDICT: Record<PromoEffect['verdict'], { label: string; tone: Tone }> = {
  worked: { label: 'Paid off', tone: 'success' },
  costly: { label: 'Lift, but costly', tone: 'warn' },
  no_lift: { label: 'No real lift', tone: 'neutral' },
  too_early: { label: 'Too early to tell', tone: 'info' },
};

export const PromoTable: React.FC<{ world: DashWorld; promotions: PromoEffect[]; showRestaurant?: boolean }> = ({ world, promotions, showRestaurant }) => (
  <DataTable
    world={world}
    rows={promotions}
    rowKey={(p) => p.code}
    empty="No promotions with a finished date range yet."
    columns={[
      { key: 'code', label: 'Promotion', render: (p) => (
        <div>
          <p className="font-medium">{p.code}</p>
          <p className={`text-xs ${themes[world].muted}`}>{showRestaurant && p.restaurant ? `${p.restaurant} · ` : ''}{formatDate(p.window_start)} – {formatDate(p.window_end)}</p>
        </div>
      ) },
      { key: 'orders', label: 'Orders/day before → during', align: 'right', render: (p) => `${p.orders_per_day_before.toFixed(1)} → ${p.orders_per_day_during.toFixed(1)}` },
      { key: 'uplift', label: 'Lift vs trend', align: 'right', render: (p) => (p.uplift_pct === null ? '—' : `${p.uplift_pct > 0 ? '+' : ''}${p.uplift_pct.toFixed(0)}%`) },
      { key: 'used', label: 'Redeemed', align: 'right', render: (p) => `${formatInt(p.redemptions)} · ${formatINR(p.discount_given)}` },
      { key: 'roi', label: 'Return per ₹1', align: 'right', render: (p) => (p.roi === null ? '—' : `₹${p.roi.toFixed(2)}`) },
      { key: 'verdict', label: 'Verdict', render: (p) => {
        // 'too_early' covers both a promotion still running and one with too few orders to judge.
        const ended = new Date(p.window_end) < new Date();
        const label = p.verdict === 'too_early' && ended ? 'Too few orders to judge' : VERDICT[p.verdict].label;
        return <StatusPill world={world} tone={VERDICT[p.verdict].tone} label={label} />;
      } },
    ]}
  />
);

const TermList: React.FC<{ terms: SearchTerm[]; empty: string; show: 'zero' | 'trend' }> = ({ terms, empty, show }) => {
  const t = themes[W];
  if (!terms.length) return <p className={`text-sm ${t.muted}`}>{empty}</p>;
  return (
    <ul className={`divide-y ${t.divide}`}>
      {terms.slice(0, 10).map((term) => (
        <li key={term.term} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <span className="min-w-0">
            <span className="font-medium">{term.term}</span>
            {term.group !== term.term && <span className={`ml-2 text-xs ${t.faint}`}>≈ {term.group}</span>}
          </span>
          <span className={`shrink-0 tabular-nums ${t.muted}`}>
            {formatInt(term.searches)} searches ·{' '}
            {show === 'zero'
              ? <span className="font-semibold text-rose-600">{pct(term.zero_result_rate)} found nothing</span>
              : <span className="font-semibold text-emerald-600">{term.trend.toFixed(1)}× usual</span>}
          </span>
        </li>
      ))}
    </ul>
  );
};

const DemandIntelView: React.FC<{ vertical: Vertical; onVerticalChange: (v: Vertical) => void }> = ({ vertical, onVerticalChange }) => {
  const t = themes[W];
  // With Both selected the hotspot table keeps its own Restaurants / Venues toggle.
  const [hotspotToggle, setHotspotToggle] = useState<'zesty' | 'eventra'>('zesty');
  const hotspotDomain = vertical === 'all' ? hotspotToggle : vertical;
  const forecast = useLoad(() => miningAPI.platformForecast(), []);
  const hotspots = useLoad(() => miningAPI.hotspots(hotspotDomain), [hotspotDomain]);
  const search = useLoad(() => miningAPI.search(vertical), [vertical]);
  const promos = useLoad(() => miningAPI.promos(), []);
  const series = (['orders', 'bookings'] as const).filter((s) => vertical === 'all' || (s === 'orders') === (vertical === 'zesty'));
  const fm = forecast.data?.model.metrics;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={`${t.display} text-2xl sm:text-[28px] ${t.strong}`}>Demand</h2>
          <p className={`mt-1 text-sm ${t.muted}`}>The next two weeks, where demand concentrates, what people search for and can’t find, and which promotions earned their discount.</p>
        </div>
        <VerticalSwitch world={W} value={vertical} onChange={onVerticalChange} />
      </div>

      {forecast.error && <ErrorBanner world={W} message={forecast.error} onRetry={forecast.reload} />}
      <div className={`grid gap-6 ${series.length > 1 ? 'xl:grid-cols-2' : ''}`}>
        {series.map((series) => {
          const m = fm?.[`platform_${series}`];
          return (
            <Panel key={series} world={W} title={series === 'orders' ? 'Food orders, next 14 days' : 'Event bookings, next 14 days'}
              description={m ? `Off by ${Math.round(m.wape * 100)}% of volume on the last two weeks (same-day-last-week guess: ${Math.round(m.baseline_wape * 100)}%)` : undefined}>
              {forecast.loading && !forecast.data ? <SkeletonRows world={W} rows={3} />
                : forecast.data?.model.available === false ? <NotReady world={W} model={forecast.data.model} what="forecast" />
                : forecast.data && <ForecastChart world={W} unit={series} actuals={forecast.data[series].actuals} forecast={forecast.data[series].forecast} />}
            </Panel>
          );
        })}
      </div>
      <ModelBadge world={W} model={forecast.data?.model} />

      <Panel world={W} flush
        title={<span className="inline-flex items-center gap-2"><MapPin className={`h-5 w-5 ${t.accentText}`} aria-hidden="true" />Demand hotspots</span>}
        description="Clusters of demand per city, last 180 days. Undersupplied areas have far more orders per outlet than usual: recruit partners there."
        action={vertical === 'all' ? <Segmented world={W} label="Outlets" value={hotspotToggle} onChange={setHotspotToggle}
          options={[{ value: 'zesty', label: 'Restaurants' }, { value: 'eventra', label: 'Venues' }]} /> : undefined}>
        {hotspots.data?.model.available === false ? <div className="p-6"><NotReady world={W} model={hotspots.data.model} what="hotspots" /></div> : (
          <DataTable
            world={W}
            rows={hotspots.data?.hotspots ?? []}
            rowKey={(h) => `${h.label}-${h.lat}`}
            empty={hotspots.loading ? 'Loading…' : 'No clusters yet.'}
            columns={[
              { key: 'where', label: 'Area', render: (h) => (
                <div><p className="font-medium">{h.label}</p><p className={`text-xs ${t.muted}`}>{h.lat.toFixed(3)}, {h.lng.toFixed(3)} · {h.radius_km} km across</p></div>
              ) },
              { key: 'demand', label: hotspotDomain === 'zesty' ? 'Orders' : 'Bookings', align: 'right', render: (h) => formatInt(h.demand) },
              { key: 'supply', label: hotspotDomain === 'zesty' ? 'Restaurants' : 'Venues', align: 'right', render: (h) => formatInt(h.supply) },
              { key: 'ratio', label: 'Per outlet', align: 'right', render: (h) => h.demand_per_supply.toFixed(1) },
              { key: 'eta', label: 'Avg delivery', align: 'right', render: (h) => (h.avg_delivery_minutes ? `${Math.round(h.avg_delivery_minutes)} min` : '—') },
              { key: 'opp', label: 'Supply', render: (h) => <StatusPill world={W} tone={OPPORTUNITY_TONE[h.opportunity]} label={humanize(h.opportunity)} /> },
            ]}
          />
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel world={W} title={<span className="inline-flex items-center gap-2"><SearchX className="h-5 w-5 text-rose-500" aria-hidden="true" />Searched for, not found</span>}
          description="Demand nobody on the platform serves yet">
          <TermList terms={search.data?.unmet ?? []} empty={search.data?.model.reason ?? 'Every popular search finds something.'} show="zero" />
        </Panel>
        <Panel world={W} title={<span className="inline-flex items-center gap-2"><Flame className="h-5 w-5 text-amber-500" aria-hidden="true" />Trending searches</span>}
          description="Last 7 days against the four weeks before">
          <TermList terms={search.data?.trending ?? []} empty="Nothing is spiking this week." show="trend" />
        </Panel>
      </div>

      {vertical !== 'eventra' && (
        <Panel world={W} flush
          title={<span className="inline-flex items-center gap-2"><TicketPercent className={`h-5 w-5 ${t.accentText}`} aria-hidden="true" />Did promotions work?</span>}
          description="Orders during each promotion against the weeks before, adjusted for the platform-wide trend">
          <PromoTable world={W} promotions={promos.data?.promotions ?? []} showRestaurant />
        </Panel>
      )}
    </div>
  );
};

export default DemandIntelView;
