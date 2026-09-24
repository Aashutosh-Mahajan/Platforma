import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarCheck, ClipboardList, RotateCw, Ticket, Wallet } from 'lucide-react';
import { bookingAPI } from '../../api/eventra';
import { useAuth } from '../../contexts';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { AreaChart, EmptyState, ErrorBanner, KpiLedger, Panel, RankedBars, SkeletonRows, StatusPill } from '../../components/dashboard/primitives';
import { customerNav } from '../../components/dashboard/roleNav';
import { bucketByDay, formatDate, formatINR, formatInt, themes, toNumber } from '../../components/dashboard/theme';
import type { Booking } from '../../types';
import { seatCode } from '../../utils';

const W = 'eventra' as const;
const t = themes[W];

const EventraDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingAPI.list();
      setBookings(response.results || []);
    } catch (_error) {
      setError('Unable to load your Eventra dashboard right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBookings();
  }, []);

  const sorted = useMemo(() => [...bookings].sort((a, b) => +new Date(b.booking_date) - +new Date(a.booking_date)), [bookings]);
  const totalSpend = useMemo(() => bookings.reduce((sum, b) => sum + toNumber(b.total), 0), [bookings]);
  const open = sorted.filter((b) => b.status === 'pending' || b.status === 'confirmed');
  const past = sorted.filter((b) => b.status === 'completed' || b.status === 'cancelled');
  const tickets = bookings.filter((b) => b.status !== 'cancelled').reduce((sum, b) => sum + toNumber(b.total_tickets), 0);
  const spendSeries = bucketByDay(bookings.filter((b) => b.status !== 'cancelled'), (b) => b.booking_date, (b) => toNumber(b.total), 30);
  const byEvent = Object.values(
    bookings
      .filter((b) => b.status !== 'cancelled')
      .reduce<Record<string, { label: string; value: number; tickets: number }>>((acc, b) => {
        const name = b.event_name || 'Event';
        acc[name] = acc[name] ?? { label: name, value: 0, tickets: 0 };
        acc[name].value += toNumber(b.total);
        acc[name].tickets += toNumber(b.total_tickets);
        return acc;
      }, {})
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((e) => ({ label: e.label, value: e.value, sub: `${e.tickets} ${e.tickets === 1 ? 'ticket' : 'tickets'}` }));

  const seatLine = (b: Booking) =>
    b.booked_seats?.length
      ? b.booked_seats.map((bs) => `${seatCode(bs.seat.row, bs.seat.seat_number)}`).join(' · ')
      : `${b.total_tickets} ${b.total_tickets === 1 ? 'ticket' : 'tickets'}`;

  return (
    <DashboardShell
      world={W}
      context="Your tickets"
      nav={customerNav}
      activeKey="eventra"
      image="https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1800&q=80"
      imagePosition="center 40%"
      title={
        <>
          Your nights out, <span className={t.titleAccent}>{user?.first_name || 'friend'}</span>
        </>
      }
      subtitle="Every ticket you've booked, the seats you picked and what's still to come."
      actions={
        <>
          <button type="button" onClick={() => void fetchBookings()} className={t.btnOnImage}>
            <RotateCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </button>
          <Link to="/eventra/events" className={t.btnOnImagePrimary}>
            Find events <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </>
      }
      ledger={
        <KpiLedger
          world={W}
          loading={loading}
          items={[
            { label: 'Bookings', icon: ClipboardList, value: formatInt(bookings.length), hint: 'All time' },
            { label: 'Open', icon: CalendarCheck, value: formatInt(open.length), hint: 'Pending or confirmed' },
            { label: 'Tickets', icon: Ticket, value: formatInt(tickets), hint: 'Excluding cancelled' },
            { label: 'Spent', icon: Wallet, value: formatINR(totalSpend) },
          ]}
        />
      }
    >
      {error && <ErrorBanner world={W} message={error} onRetry={() => void fetchBookings()} onDismiss={() => setError(null)} />}

      {loading ? (
        <Panel world={W}>
          <SkeletonRows world={W} rows={5} />
        </Panel>
      ) : bookings.length === 0 ? (
        <Panel world={W}>
          <EmptyState
            world={W}
            icon={Ticket}
            title="No tickets yet"
            body="Pick a show, choose your seats on the map and your tickets will live here."
            action={<Link to="/eventra/events" className={t.btnPrimary}>Explore events</Link>}
          />
        </Panel>
      ) : (
        <div className="space-y-8">
          {open.length > 0 && (
            <section>
              <h2 className={`${t.display} mb-5 text-2xl`}>Coming up</h2>
              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {open.map((b) => (
                  <Link
                    key={b.id}
                    to={`/eventra/bookings/${b.id}`}
                    className="group relative block overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(150deg,#221812_0%,#141414_60%)] transition-colors hover:border-[#c4621a]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8824a]"
                  >
                    <div className="px-6 pb-5 pt-6">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-eventra-display text-2xl leading-tight">{b.event_name}</p>
                        <StatusPill world={W} status={b.status} />
                      </div>
                      <p className={`mt-2 text-sm ${t.muted}`}>Booked {formatDate(b.booking_date)}</p>
                    </div>
                    <div className="relative flex items-end justify-between gap-3 border-t border-dashed border-white/12 px-6 py-4">
                      <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#0a0a0a]" aria-hidden="true" />
                      <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#0a0a0a]" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-xs text-[#9a9a9a]">Seats</p>
                        <p className="truncate font-mono text-sm tracking-wide text-[#f0a070]">{seatLine(b)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xs text-[#9a9a9a]">{b.booking_reference}</p>
                        <p className="font-semibold tabular-nums">{formatINR(b.total, true)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-6 xl:grid-cols-5">
            <Panel world={W} flush className="xl:col-span-3" title="Past bookings" description="Completed and cancelled">
              {past.length === 0 ? (
                <EmptyState world={W} compact icon={ClipboardList} title="No past bookings" body="Once an event is over it moves here." />
              ) : (
                <ul className={`divide-y ${t.divide}`}>
                  {past.slice(0, 10).map((b) => (
                    <li key={b.id}>
                      <Link to={`/eventra/bookings/${b.id}`} className={`flex items-center gap-4 px-5 py-4 transition-colors sm:px-6 ${t.rowHover}`}>
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.04] font-eventra-display text-lg text-[#e8824a]">
                          {new Date(b.booking_date).getDate() || '—'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{b.event_name}</p>
                          <p className={`truncate text-xs ${t.muted}`}>{b.booking_reference} · {seatLine(b)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-sm font-semibold tabular-nums">{formatINR(b.total, true)}</span>
                          <StatusPill world={W} status={b.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className={`border-t px-6 py-3 text-right ${t.hairline}`}>
                <Link to="/eventra/bookings" className={t.btnGhost}>All bookings</Link>
              </div>
            </Panel>
            <div className="space-y-6 xl:col-span-2">
              <Panel world={W} title="Most seen" description="By what you've spent">
                {byEvent.length === 0 ? <p className={`text-sm ${t.muted}`}>Nothing to rank yet.</p> : <RankedBars world={W} data={byEvent} format={(v) => formatINR(v)} />}
              </Panel>
              <Panel world={W} title="Spending" description={`${spendSeries[0]?.label} – ${spendSeries[spendSeries.length - 1]?.label}`}>
                <AreaChart world={W} data={spendSeries} height={160} ariaLabel="Daily ticket spending" format={(v) => `₹${new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)}`} />
              </Panel>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
};

export default EventraDashboardPage;
