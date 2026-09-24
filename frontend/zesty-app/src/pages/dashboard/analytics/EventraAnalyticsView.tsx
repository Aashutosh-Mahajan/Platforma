import React, { useState } from 'react';
import {
  Armchair, CalendarClock, ClipboardList, IndianRupee, Repeat, ScanLine, Ticket, Users, Wallet, XCircle,
} from 'lucide-react';
import { analyticsAPI, type EventraAnalytics, type OrganizerAnalytics } from '../../../api/analytics';
import {
  CATEGORY_COLORS,
  ColumnBars,
  DataTable,
  Donut,
  Heatmap,
  InsightHeading,
  InsightList,
  KpiGrid,
  StackedColumns,
  describeDelta,
  leader,
  type Insight,
} from '../../../components/dashboard/analytics';
import { Panel, RankedBars, StatusBreakdown, StatusPill } from '../../../components/dashboard/primitives';
import { formatDate, formatINR, formatInt, humanize, plural, themes, type DashWorld } from '../../../components/dashboard/theme';
import { AnalyticsFrame, AnalyticsHeader, StatTile, downloadCsv, useAnalytics } from './shared';

type Props = { mode: 'admin' } | { mode: 'organizer'; events: { id: number; name: string }[] };

const STATUS_LABEL: Record<string, { label: string; tone: 'success' | 'warn' | 'neutral' | 'danger' }> = {
  on_sale: { label: 'On sale', tone: 'success' },
  pending: { label: 'Awaiting approval', tone: 'warn' },
  draft: { label: 'Draft', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  no_seats: { label: 'No seats yet', tone: 'warn' },
  ended: { label: 'Ended', tone: 'neutral' },
};

const SellThrough: React.FC<{ world: DashWorld; value: number | null }> = ({ world, value }) => {
  const t = themes[world];
  if (value === null) return <span className={t.faint}>No seats</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-1.5 w-16 overflow-hidden rounded-full ${t.subtle}`}>
        <span className="block h-full rounded-full" style={{ width: `${value}%`, background: t.accentHex }} />
      </span>
      <span className="w-10 text-right">{value}%</span>
    </span>
  );
};

const EventraAnalyticsView: React.FC<Props> = (props) => {
  const W: DashWorld = props.mode === 'admin' ? 'platforma' : 'eventra';
  const t = themes[W];
  const [eventId, setEventId] = useState<number | null>(null);
  const { range, setRange, data, loading, error, reload } = useAnalytics<EventraAnalytics | OrganizerAnalytics>(
    (r) => (props.mode === 'organizer' ? analyticsAPI.organizer(r, eventId) : analyticsAPI.eventra(r)),
    [props.mode, eventId]
  );
  const admin = data && 'organizers' in data ? (data as EventraAnalytics) : null;
  const org = data && 'events' in data ? (data as OrganizerAnalytics) : null;

  const kpis = data
    ? { ...data.kpis, on_sale: { value: data.inventory.on_sale, previous: null, kind: 'count' as const } }
    : undefined;

  const insights: Insight[] = [];
  if (data) {
    const k = data.kpis;
    const d = describeDelta(k.revenue);
    if (d && d.direction !== 'flat' && !d.isNew) {
      insights.push({ tone: d.good ? 'good' : 'warn', text: <>Ticket revenue is <strong>{d.direction} {d.text}</strong> on the previous period.</> });
    }
    const cat = leader(data.categories, 'value');
    if (cat && data.categories.length > 1) {
      insights.push({ tone: 'info', text: <><strong>{humanize(cat.label)}</strong> events bring {cat.share}% of ticket revenue.</> });
    }
    const lead = leader(data.lead_times);
    if (lead) {
      insights.push({
        tone: 'info',
        text: <>Most bookings ({lead.share}%) land <strong>{lead.label.toLowerCase()}</strong> before the show{k.avg_lead_days.value !== null ? `, ${k.avg_lead_days.value} days out on average` : ''}. Time reminders and ads to that window.</>,
      });
    }
    const day = leader(data.event_weekdays);
    if (day) insights.push({ tone: 'info', text: <>Events on <strong>{day.label}</strong> draw the most bookings ({day.share}%).</> });
    const risky = data.upcoming.filter((e) => e.days_out <= 14 && (e.sell_through ?? 0) < 30);
    if (risky.length) {
      insights.push({
        tone: 'warn',
        text: <><strong>{risky.length} upcoming {risky.length === 1 ? 'event is' : 'events are'}</strong> under 30% sold with two weeks or less to go{risky[0] ? ` (e.g. ${risky[0].name})` : ''}. Consider a push or price change.</>,
      });
    }
    if (data.inventory.without_seats > 0) {
      insights.push({ tone: 'warn', text: <><strong>{data.inventory.without_seats} upcoming {data.inventory.without_seats === 1 ? 'event has' : 'events have'} no seats</strong> laid out, so nobody can book {data.inventory.without_seats === 1 ? 'it' : 'them'} yet.</> });
    }
    if (data.inventory.pending_approval > 0) {
      insights.push({ tone: 'warn', text: <><strong>{data.inventory.pending_approval}</strong> {data.inventory.pending_approval === 1 ? 'event is' : 'events are'} waiting for admin approval.</> });
    }
    if ((k.checkin_rate.value ?? null) !== null && (k.checkin_rate.value ?? 0) < 70) {
      insights.push({ tone: 'warn', text: <>Only <strong>{k.checkin_rate.value}%</strong> of tickets for past events were scanned at the door. No-shows are high.</> });
    }
  }

  const exportCsv = () =>
    data && downloadCsv(`eventra-${range}.csv`, data.series.map((r) => ({ period: r.date, revenue: r.revenue, bookings: r.bookings, tickets: r.tickets })));

  const eventPicker =
    props.mode === 'organizer' && props.events.length > 1 ? (
      <label className="inline-flex items-center">
        <span className="sr-only">Event</span>
        <select value={eventId ?? ''} onChange={(e) => setEventId(e.target.value ? Number(e.target.value) : null)} className={`${t.input} !w-auto !rounded-full !py-1.5 [&>option]:bg-[#141414]`}>
          <option value="">All events</option>
          {props.events.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </label>
    ) : null;

  return (
    <div>
      <AnalyticsHeader
        world={W}
        title={props.mode === 'admin' ? 'Eventra performance' : 'Box office analytics'}
        subtitle={props.mode === 'admin' ? 'Every event and organizer' : eventId ? props.events.find((e) => e.id === eventId)?.name ?? 'One event' : 'All your events'}
        range={range}
        onRange={setRange}
        onExport={data ? exportCsv : undefined}
        extra={eventPicker}
      />
      <AnalyticsFrame world={W} loading={loading} error={error} hasData={!!data} onRetry={reload}>
        {data && (
          <>
            <KpiGrid
              world={W}
              range={range}
              kpis={kpis}
              specs={[
                { key: 'revenue', label: 'Ticket revenue', icon: IndianRupee },
                { key: 'bookings', label: 'Bookings', icon: ClipboardList },
                { key: 'tickets', label: 'Tickets sold', icon: Ticket },
                { key: 'avg_ticket_price', label: 'Avg ticket price', icon: Wallet },
                { key: 'avg_booking_value', label: 'Avg booking value', icon: Wallet },
                { key: 'sell_through', label: 'Seats sold', icon: Armchair, hint: 'All events with a seat map, right now' },
                { key: 'customers', label: 'Customers', icon: Users },
                { key: 'repeat_rate', label: 'Repeat bookers', icon: Repeat },
                { key: 'avg_lead_days', label: 'Booking lead time', icon: CalendarClock, hint: 'Days between booking and the event' },
                { key: 'cancellation_rate', label: 'Cancellations', icon: XCircle },
                { key: 'checkin_rate', label: 'Check-in rate', icon: ScanLine, hint: 'Scanned tickets for past events' },
                { key: 'on_sale', label: 'Events on sale', icon: Ticket, hint: 'Upcoming, published and approved' },
              ]}
            />

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel world={W} className="xl:col-span-2" title="Ticket sales over time" description={`Revenue per ${data.window.granularity}`}>
                <StackedColumns world={W} ariaLabel="Ticket revenue over time" data={data.series} series={[{ key: 'revenue', label: 'Revenue', color: '#c4621a' }]} />
              </Panel>
              <Panel world={W} title={<InsightHeading world={W} />}>
                <InsightList world={W} insights={insights} />
              </Panel>
            </div>

            {org && (
              <Panel world={W} flush title="Your events" description="Lifetime performance of every event">
                <DataTable
                  world={W}
                  rows={org.events}
                  rowKey={(r) => r.id}
                  empty="You haven't created any events yet."
                  columns={[
                    { key: 'name', label: 'Event', render: (r) => <><p className="font-medium">{r.name}</p><p className={`text-xs ${t.muted}`}>{humanize(r.category)} · {formatDate(r.date)}</p></> },
                    { key: 'status', label: 'Status', render: (r) => <StatusPill world={W} tone={STATUS_LABEL[r.status].tone} label={STATUS_LABEL[r.status].label} /> },
                    { key: 'bookings', label: 'Bookings', align: 'right', render: (r) => formatInt(r.bookings) },
                    { key: 'tickets', label: 'Tickets', align: 'right', render: (r) => formatInt(r.tickets) },
                    { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => <span className="font-semibold">{formatINR(r.revenue)}</span> },
                    { key: 'sold', label: 'Seats sold', align: 'right', render: (r) => <SellThrough world={W} value={r.sell_through} /> },
                  ]}
                />
              </Panel>
            )}

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel world={W} title="Booking lead time" description="How far ahead people book">
                <ColumnBars world={W} data={data.lead_times} />
              </Panel>
              <Panel world={W} title="Event day" description="Bookings by the weekday of the event">
                <ColumnBars world={W} data={data.event_weekdays} />
              </Panel>
              <Panel world={W} title="Booking status" description="Every booking in the period">
                <StatusBreakdown world={W} counts={data.status_mix} />
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel world={W} className="xl:col-span-2" title="When people book" description="Bookings by weekday and hour">
                <Heatmap world={W} grid={data.heatmap} unit="bookings" />
              </Panel>
              <Panel world={W} title="Ticket tiers" description="Seats sold per tier">
                {data.tiers.length === 0 ? (
                  <p className={`text-sm ${t.muted}`}>No seated tickets sold in this period.</p>
                ) : (
                  <RankedBars world={W} format={(v) => `${formatInt(v)} seats`} data={data.tiers.map((tier) => ({ label: tier.label, value: tier.count, sub: formatINR(tier.value) }))} />
                )}
              </Panel>
            </div>

            <Panel world={W} flush title="Upcoming 60 days" description="Sales pace for events coming up">
              <DataTable
                world={W}
                rows={data.upcoming}
                rowKey={(r) => r.id}
                empty="Nothing scheduled in the next 60 days."
                columns={[
                  { key: 'name', label: 'Event', render: (r) => <><p className="font-medium">{r.name}</p><p className={`text-xs ${t.muted}`}>{humanize(r.category)}</p></> },
                  { key: 'date', label: 'Date', render: (r) => <>{formatDate(r.date)}<p className={`text-xs ${t.muted}`}>in {r.days_out} {r.days_out === 1 ? 'day' : 'days'}</p></> },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (r) =>
                      !r.is_published ? <StatusPill world={W} tone="neutral" label="Draft" /> : !r.is_approved ? <StatusPill world={W} tone="warn" label="Awaiting approval" /> : r.total_seats === 0 ? <StatusPill world={W} tone="warn" label="No seats" /> : <StatusPill world={W} tone="success" label="On sale" />,
                  },
                  { key: 'bookings', label: 'Bookings', align: 'right', render: (r) => formatInt(r.bookings) },
                  { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => formatINR(r.revenue) },
                  { key: 'sold', label: 'Seats sold', align: 'right', render: (r) => <SellThrough world={W} value={r.sell_through} /> },
                ]}
              />
            </Panel>

            {admin && (
              <Panel world={W} flush title="Event leaderboard" description="Ranked by ticket revenue in the period">
                <DataTable
                  world={W}
                  rows={admin.top_events}
                  rowKey={(r) => r.id}
                  empty="No bookings in this period."
                  columns={[
                    { key: 'name', label: 'Event', render: (r) => <><p className="font-medium">{r.name}</p><p className={`text-xs ${t.muted}`}>{humanize(r.category)} · {r.city || r.venue || '—'}</p></> },
                    { key: 'bookings', label: 'Bookings', align: 'right', render: (r) => formatInt(r.bookings) },
                    { key: 'tickets', label: 'Tickets', align: 'right', render: (r) => formatInt(r.tickets) },
                    { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => <span className="font-semibold">{formatINR(r.revenue)}</span> },
                    { key: 'sold', label: 'Seats sold', align: 'right', render: (r) => <SellThrough world={W} value={r.sell_through} /> },
                    { key: 'rating', label: 'Rating', align: 'right', render: (r) => (r.rating ? r.rating.toFixed(1) : 'New') },
                  ]}
                />
              </Panel>
            )}

            <div className="grid gap-6 xl:grid-cols-3">
              <Panel world={W} title="Categories" description="Share of ticket revenue">
                <Donut
                  world={W}
                  format={(v) => formatINR(v)}
                  data={data.categories.map((c, i) => ({ label: humanize(c.label), value: c.value ?? 0, color: CATEGORY_COLORS[(i + 1) % CATEGORY_COLORS.length] }))}
                />
              </Panel>
              {admin ? (
                <>
                  <Panel world={W} title="Top organizers" description="By ticket revenue">
                    {admin.organizers.length === 0 ? (
                      <p className={`text-sm ${t.muted}`}>No bookings in this period.</p>
                    ) : (
                      <RankedBars world={W} format={(v) => formatINR(v)} data={admin.organizers.map((o) => ({ label: o.name, value: o.revenue, sub: `${plural(o.events, 'event')} · ${plural(o.bookings, 'booking')}` }))} />
                    )}
                  </Panel>
                  <Panel world={W} title="Top cities" description="By venue city">
                    {admin.cities.length === 0 ? (
                      <p className={`text-sm ${t.muted}`}>No bookings in this period.</p>
                    ) : (
                      <RankedBars world={W} format={(v) => formatINR(v)} data={admin.cities.map((c) => ({ label: c.label, value: c.value ?? 0, sub: plural(c.count, 'booking') }))} />
                    )}
                  </Panel>
                </>
              ) : (
                <>
                  <Panel world={W} title="Ratings" description="Reviews across these events">
                    <ColumnBars world={W} data={data.rating_distribution} highlightMax={false} />
                  </Panel>
                  <Panel world={W} title="By time of day" description="When bookings are made">
                    <ColumnBars world={W} data={data.dayparts} />
                  </Panel>
                </>
              )}
            </div>

            <Panel world={W} title="Inventory" description="Current state of events">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                <StatTile world={W} label="Events" value={formatInt(data.inventory.events)} />
                <StatTile world={W} label="Upcoming" value={formatInt(data.inventory.upcoming)} note={`${data.inventory.next_30_days} in next 30 days`} />
                <StatTile world={W} label="On sale" value={formatInt(data.inventory.on_sale)} />
                <StatTile world={W} label="Drafts" value={formatInt(data.inventory.drafts)} />
                <StatTile world={W} label="Awaiting approval" value={formatInt(data.inventory.pending_approval)} tone={data.inventory.pending_approval ? 'warn' : 'default'} />
                <StatTile world={W} label="Upcoming without seats" value={formatInt(data.inventory.without_seats)} tone={data.inventory.without_seats ? 'warn' : 'default'} />
                <StatTile world={W} label="Past" value={formatInt(data.inventory.past)} />
                <StatTile world={W} label="Cancelled" value={formatInt(data.inventory.cancelled)} />
              </div>
            </Panel>
          </>
        )}
      </AnalyticsFrame>
    </div>
  );
};

export default EventraAnalyticsView;
