import React from 'react';
import { Armchair, BadgeIndianRupee, UserX } from 'lucide-react';
import { miningAPI } from '../../../api/warehouse';
import { DataTable } from '../../../components/dashboard/reportCharts';
import { ErrorBanner, Panel, SkeletonRows } from '../../../components/dashboard/primitives';
import { ModelBadge, NotReady, ProbabilityBar } from '../../../components/dashboard/intelligence';
import { aucQuality, pct, useLoad } from '../../../components/dashboard/intelligenceUtils';
import { formatDate, formatINR, formatInt, humanize, plural, themes } from '../../../components/dashboard/theme';
import { StatTile } from '../reports/shared';

const W = 'eventra' as const;

/** Sell-out projections, expected no-shows and pricing advice for an organizer's events. */
const OrganizerIntelView: React.FC = () => {
  const t = themes[W];
  const sellout = useLoad(() => miningAPI.sellOut(), []);
  const risk = useLoad(() => miningAPI.eventRisk(), []);
  const pricing = useLoad(() => miningAPI.pricing(), []);
  const events = sellout.data?.events ?? [];
  const likelySellOuts = events.filter((e) => e.sell_out_probability >= 0.5).length;
  const noShowSeats = events.reduce((s, e) => s + (e.expected_no_show_seats ?? 0), 0);
  const noShowAuc = risk.data?.model.metrics?.booking_no_show?.roc_auc;

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`${t.display} text-2xl sm:text-[28px] ${t.strong}`}>Forecasts</h2>
        <p className={`mt-1 text-sm ${t.muted}`}>Where each upcoming show’s sales are heading, how many ticket holders probably won’t turn up, and how buyers react to price.</p>
        <div className="mt-2"><ModelBadge world={W} model={sellout.data?.model} /></div>
      </div>
      {sellout.error && <ErrorBanner world={W} message={sellout.error} onRetry={sellout.reload} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile world={W} label="Upcoming events forecast" value={formatInt(events.length)} />
        <StatTile world={W} label="Likely to sell out" value={formatInt(likelySellOuts)} tone={likelySellOuts ? 'good' : 'default'} />
        <StatTile world={W} label="Expected empty seats from no-shows" value={noShowSeats ? `≈ ${Math.round(noShowSeats)}` : '—'}
          note={aucQuality(noShowAuc)} />
        <StatTile world={W} label="Seats still to sell" value={formatInt(events.reduce((s, e) => s + Math.max(0, e.capacity - e.sold), 0))} />
      </div>

      <Panel world={W} flush title={<span className="inline-flex items-center gap-2"><Armchair className={`h-5 w-5 ${t.accentText}`} aria-hidden="true" />Sales outlook</span>}
        description="Projected from how past events in the same category sold in their final weeks">
        {sellout.loading && !sellout.data ? <div className="p-6"><SkeletonRows world={W} rows={4} /></div>
          : sellout.data?.model.available === false ? <div className="p-6"><NotReady world={W} model={sellout.data.model} what="sales forecast" /></div> : (
          <DataTable world={W} rows={events} rowKey={(e) => e.event_id} empty="No upcoming events with seats on sale."
            columns={[
              { key: 'event', label: 'Event', render: (e) => (
                <div><p className="font-medium">{e.event_name ?? `Event ${e.event_id}`}</p><p className={`text-xs ${t.muted}`}>{formatDate(e.event_date)} · {e.days_to_event === 0 ? 'today' : `in ${plural(e.days_to_event, 'day')}`}</p></div>
              ) },
              { key: 'sold', label: 'Sold now', align: 'right', render: (e) => `${formatInt(e.sold)} / ${formatInt(e.capacity)}` },
              { key: 'week', label: 'Last 7 days', align: 'right', render: (e) => `+${formatInt(e.sold_last_7d)}` },
              { key: 'proj', label: 'Projected', align: 'right', render: (e) => `${formatInt(e.projected_final)} (${pct(e.projected_sell_through)})` },
              { key: 'p', label: 'Chance of selling out', render: (e) => <ProbabilityBar world={W} value={e.sell_out_probability} good /> },
              { key: 'date', label: 'Sells out by', render: (e) => (e.projected_sell_out_date ? formatDate(e.projected_sell_out_date) : <span className={t.faint}>—</span>) },
              { key: 'ns', label: 'No-shows', align: 'right', render: (e) => (e.expected_no_show_seats !== null ? `≈ ${e.expected_no_show_seats.toFixed(1)}` : '—') },
            ]} />
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel world={W} title={<span className="inline-flex items-center gap-2"><UserX className="h-5 w-5 text-amber-400" aria-hidden="true" />Bookings most likely to no-show</span>}
          description="Long lead times, pay-later bookings and cheap tickets no-show most. A reminder the day before helps.">
          <ModelBadge world={W} model={risk.data?.model} quality={aucQuality(noShowAuc)} />
          {risk.data?.events.some((e) => e.riskiest.length) ? (
            <ul className={`mt-3 divide-y ${t.divide}`}>
              {risk.data.events.flatMap((e) => e.riskiest.slice(0, 2).map((b) => ({ ...b, event: e.event_name })))
                .sort((a, b) => b.probability - a.probability).slice(0, 10).map((b) => (
                  <li key={b.booking_id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{b.reference ?? `Booking ${b.booking_id}`}</span>
                      <span className={`ml-2 ${t.muted}`}>{b.customer ?? ''} · {b.seats !== null ? plural(b.seats, 'seat') : '? seats'} · {b.event}</span>
                    </span>
                    <ProbabilityBar world={W} value={b.probability} />
                  </li>
                ))}
            </ul>
          ) : (
            <p className={`mt-3 text-sm ${t.muted}`}>No upcoming bookings to score yet.</p>
          )}
        </Panel>

        <Panel world={W} title={<span className="inline-flex items-center gap-2"><BadgeIndianRupee className={`h-5 w-5 ${t.accentText}`} aria-hidden="true" />Price sensitivity by category</span>}
          description="How sell-through moves when the ticket price moves, comparing tiers of the same event">
          {pricing.data?.categories.length ? (
            <ul className={`divide-y ${t.divide}`}>
              {pricing.data.categories.map((c) => (
                <li key={c.category} className="py-3 text-sm">
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{humanize(c.category)}</span>
                    <span className={`tabular-nums ${t.muted}`}>elasticity {c.elasticity.toFixed(2)} · {pct(c.avg_sell_through)} sell-through · median {formatINR(c.median_price)}</span>
                  </p>
                  <p className={`mt-0.5 ${t.muted}`}>{c.advice}</p>
                </li>
              ))}
            </ul>
          ) : (
            <NotReady world={W} model={pricing.data?.model} what="price analysis" />
          )}
        </Panel>
      </div>

      {pricing.data?.my_tiers.length ? (
        <Panel world={W} flush title="Your ticket tiers" description="How each tier of your upcoming events is selling">
          <DataTable world={W} rows={pricing.data.my_tiers} rowKey={(r) => `${r.event_id}-${r.tier}`} empty=""
            columns={[
              { key: 'e', label: 'Event', render: (r) => <span className="font-medium">{r.event_name}</span> },
              { key: 'tier', label: 'Tier', render: (r) => r.tier },
              { key: 'price', label: 'Price', align: 'right', render: (r) => formatINR(r.price) },
              { key: 'sold', label: 'Sold', align: 'right', render: (r) => `${formatInt(r.sold)} / ${formatInt(r.capacity)}` },
              { key: 'st', label: 'Sell-through', render: (r) => <ProbabilityBar world={W} value={r.sell_through ?? 0} good /> },
            ]} />
        </Panel>
      ) : null}
    </div>
  );
};

export default OrganizerIntelView;
