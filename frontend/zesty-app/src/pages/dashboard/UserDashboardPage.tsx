import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Hourglass, RotateCw, Ticket, UtensilsCrossed, Wallet } from 'lucide-react';
import { bookingAPI } from '../../api/eventra';
import { orderAPI } from '../../api/zesty';
import { useAuth } from '../../contexts';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { AreaChart, EmptyState, ErrorBanner, KpiLedger, Panel, SkeletonRows, StatusPill } from '../../components/dashboard/primitives';
import { customerNav } from '../../components/dashboard/roleNav';
import { bucketByDay, formatDate, formatINR, formatInt, greeting, shortRef, themes, toNumber } from '../../components/dashboard/theme';
import type { Booking, Order } from '../../types';

const W = 'platforma' as const;
const t = themes[W];

const ACTIVE_ORDER = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'];

type Activity =
  | { kind: 'order'; id: string | number; date: string; title: string; detail: string; amount: unknown; status: string; to: string }
  | { kind: 'booking'; id: string | number; date: string; title: string; detail: string; amount: unknown; status: string; to: string };

const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const response = await orderAPI.list();
      setOrders(response.results || []);
      setOrderError(null);
    } catch {
      setOrderError('Unable to load Zesty orders right now.');
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const response = await bookingAPI.list();
      setBookings(response.results || []);
      setBookingError(null);
    } catch {
      setBookingError('Unable to load Eventra bookings right now.');
    } finally {
      setBookingsLoading(false);
    }
  };

  const fetchDashboardData = async (showRefreshState = true) => {
    if (showRefreshState) setIsRefreshing(true);
    await Promise.allSettled([fetchOrders(), fetchBookings()]);
    if (showRefreshState) setIsRefreshing(false);
  };

  useEffect(() => {
    void fetchDashboardData(false);
  }, []);

  const zestySpend = useMemo(() => orders.reduce((sum, o) => sum + toNumber(o.total), 0), [orders]);
  const eventraSpend = useMemo(() => bookings.reduce((sum, b) => sum + toNumber(b.total), 0), [bookings]);
  const activeOrders = orders.filter((o) => ACTIVE_ORDER.includes(o.status));
  const openBookings = bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed');
  const loading = ordersLoading || bookingsLoading;

  const activity: Activity[] = useMemo(
    () =>
      [
        ...orders.map<Activity>((o) => ({
          kind: 'order',
          id: o.id,
          date: o.created_at,
          title: o.restaurant_name || 'Restaurant',
          detail: `Order #${shortRef(o.id)} · ${o.items?.length ?? 0} ${o.items?.length === 1 ? 'item' : 'items'}`,
          amount: o.total,
          status: o.status,
          to: `/zesty/orders/${o.id}`,
        })),
        ...bookings.map<Activity>((b) => ({
          kind: 'booking',
          id: b.id,
          date: b.booking_date,
          title: b.event_name || 'Event',
          detail: `${b.booking_reference} · ${b.total_tickets} ${b.total_tickets === 1 ? 'ticket' : 'tickets'}`,
          amount: b.total,
          status: b.status,
          to: `/eventra/bookings/${b.id}`,
        })),
      ].sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [orders, bookings]
  );

  const spendSeries = bucketByDay(activity, (a) => a.date, (a) => toNumber(a.amount), 30);
  const lastOrder = activity.find((a) => a.kind === 'order');
  const lastBooking = activity.find((a) => a.kind === 'booking');

  return (
    <DashboardShell
      world={W}
      context="Your account"
      nav={customerNav}
      activeKey="overview"
      image="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1800&q=80"
      imagePosition="center 60%"
      title={
        <>
          {greeting()}, <span className={t.titleAccent}>{user?.first_name || 'there'}</span>
        </>
      }
      subtitle="Your tables and your tickets, in one place."
      actions={
        <button type="button" onClick={() => void fetchDashboardData()} disabled={isRefreshing} className={t.btnOnImage}>
          <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isRefreshing ? 'Refreshing' : 'Refresh'}
        </button>
      }
      ledger={
        <KpiLedger
          world={W}
          loading={loading}
          items={[
            { label: 'Total spent', icon: Wallet, value: formatINR(zestySpend + eventraSpend), hint: 'Across Zesty and Eventra' },
            { label: 'Food orders', icon: UtensilsCrossed, value: formatInt(orders.length), hint: `${formatINR(zestySpend)} spent` },
            { label: 'Event bookings', icon: Ticket, value: formatInt(bookings.length), hint: `${formatINR(eventraSpend)} spent` },
            { label: 'In progress', icon: Hourglass, value: formatInt(activeOrders.length + openBookings.length), hint: `${activeOrders.length} orders · ${openBookings.length} bookings` },
          ]}
        />
      }
    >
      {orderError && <ErrorBanner world={W} message={orderError} onRetry={() => void fetchOrders()} />}
      {bookingError && <ErrorBanner world={W} message={bookingError} onRetry={() => void fetchBookings()} />}

      {/* Two doors: one per vertical */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[
          {
            key: 'zesty',
            to: '/dashboard/zesty',
            browse: '/zesty',
            browseLabel: 'Order food',
            name: 'Zesty',
            line: 'Food from the kitchens you love, delivered.',
            image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=80',
            overlay: 'bg-[linear-gradient(180deg,rgba(23,17,15,0.15)_0%,rgba(23,17,15,0.9)_100%)]',
            accent: 'text-[#ffb302]',
            button: 'bg-[#e23744] hover:bg-[#b7122a]',
            nameClass: 'font-zesty-display font-extrabold',
            last: lastOrder,
            count: `${orders.length} orders`,
          },
          {
            key: 'eventra',
            to: '/dashboard/eventra',
            browse: '/eventra/events',
            browseLabel: 'Find events',
            name: 'Eventra',
            line: 'Concerts, theatre and nights worth dressing up for.',
            image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&q=80',
            overlay: 'bg-[linear-gradient(180deg,rgba(10,10,10,0.15)_0%,rgba(10,10,10,0.92)_100%)]',
            accent: 'text-[#e8824a]',
            button: 'bg-[#c4621a] hover:bg-[#d8712a]',
            nameClass: 'font-eventra-display italic',
            last: lastBooking,
            count: `${bookings.length} bookings`,
          },
        ].map((door) => (
          <article key={door.key} className="group relative isolate flex min-h-[300px] flex-col justify-end overflow-hidden rounded-3xl text-white">
            <img src={door.image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
            <div className={`absolute inset-0 -z-10 ${door.overlay}`} aria-hidden="true" />
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className={`${door.nameClass} text-4xl leading-none`}>{door.name}</h2>
                  <p className="mt-2 max-w-xs text-sm text-white/75">{door.line}</p>
                </div>
                <p className={`text-sm font-semibold ${door.accent}`}>{door.count}</p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/15 pt-5">
                {door.last ? (
                  <Link to={door.last.to} className="min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                    <p className="text-xs text-white/60">Most recent</p>
                    <p className="truncate font-semibold">{door.last.title}</p>
                    <p className="text-xs text-white/60">{formatDate(door.last.date)} · {formatINR(door.last.amount)}</p>
                  </Link>
                ) : (
                  <p className="min-w-0 flex-1 text-sm text-white/70">Nothing here yet.</p>
                )}
                <Link to={door.to} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-white/20">
                  History <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to={door.browse} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${door.button}`}>
                  {door.browseLabel} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Panel
          world={W}
          className="xl:col-span-2"
          title="Spending"
          description={`${spendSeries[0]?.label} – ${spendSeries[spendSeries.length - 1]?.label}`}
        >
          {loading ? (
            <SkeletonRows world={W} rows={3} />
          ) : (
            <AreaChart world={W} data={spendSeries} height={200} ariaLabel="Daily spending" format={(v) => `₹${new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)}`} />
          )}
        </Panel>

        <Panel world={W} flush className="xl:col-span-3" title="Recent activity" description="Orders and bookings, newest first">
          {loading ? (
            <div className="p-6">
              <SkeletonRows world={W} rows={5} />
            </div>
          ) : activity.length === 0 ? (
            <EmptyState
              world={W}
              icon={Wallet}
              title="Nothing yet"
              body="Order from a restaurant on Zesty or book a seat on Eventra. Everything you do shows up here."
              action={
                <Link to="/zesty" className={t.btnPrimary}>
                  Start with dinner
                </Link>
              }
            />
          ) : (
            <ul className={`divide-y ${t.divide}`}>
              {activity.slice(0, 7).map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link to={item.to} className={`flex items-center gap-4 px-5 py-4 transition-colors sm:px-6 ${t.rowHover}`}>
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                        item.kind === 'order' ? 'bg-[#e23744]/10 text-[#b7122a]' : 'bg-[#c4621a]/12 text-[#9a4a10]'
                      }`}
                    >
                      {item.kind === 'order' ? <UtensilsCrossed className="h-[18px] w-[18px]" aria-hidden="true" /> : <Ticket className="h-[18px] w-[18px]" aria-hidden="true" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{item.title}</p>
                      <p className={`truncate text-xs ${t.muted}`}>
                        {item.detail} · {formatDate(item.date)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-sm font-semibold tabular-nums">{formatINR(item.amount, true)}</span>
                      <StatusPill world={W} status={item.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </DashboardShell>
  );
};

export default UserDashboardPage;
