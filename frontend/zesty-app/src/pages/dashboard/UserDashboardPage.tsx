import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingAPI } from '../../api/eventra';
import { orderAPI } from '../../api/zesty';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import type { Booking, Order } from '../../types';

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value: unknown): string => `₹${toNumber(value).toFixed(2)}`;

const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }

  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatStatus = (value: string): string =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const getOrderStatusClass = (status: Order['status']): string => {
  const classes: Record<Order['status'], string> = {
    pending: 'border border-amber-400/45 bg-amber-500/20 text-amber-100',
    confirmed: 'border border-sky-400/45 bg-sky-500/20 text-sky-100',
    preparing: 'border border-[#8a9a5b]/60 bg-[#8a9a5b]/25 text-[#e4edc6]',
    ready: 'border border-indigo-400/45 bg-indigo-500/20 text-indigo-100',
    out_for_delivery: 'border border-violet-400/45 bg-violet-500/20 text-violet-100',
    delivered: 'border border-emerald-400/45 bg-emerald-500/20 text-emerald-100',
    cancelled: 'border border-red-400/45 bg-red-500/20 text-red-100',
  };

  return classes[status] || 'border border-white/25 bg-white/10 text-white/85';
};

const getBookingStatusClass = (status: Booking['status']): string => {
  const classes: Record<Booking['status'], string> = {
    pending: 'border border-amber-400/45 bg-amber-500/20 text-amber-100',
    confirmed: 'border border-sky-400/45 bg-sky-500/20 text-sky-100',
    completed: 'border border-emerald-400/45 bg-emerald-500/20 text-emerald-100',
    cancelled: 'border border-red-400/45 bg-red-500/20 text-red-100',
  };

  return classes[status] || 'border border-white/25 bg-white/10 text-white/85';
};

const DashboardError: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="mb-4 rounded-xl border border-red-300/45 bg-red-500/10 p-4" role="alert" aria-live="assertive">
    <p className="text-sm text-red-100">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-3 rounded border border-red-200/45 bg-transparent px-3 py-1 text-xs font-semibold text-red-100 transition-colors duration-200 hover:bg-red-500/20"
    >
      Retry
    </button>
  </div>
);

const UserDashboardPage: React.FC = () => {
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
    if (showRefreshState) {
      setIsRefreshing(true);
    }

    await Promise.allSettled([fetchOrders(), fetchBookings()]);

    if (showRefreshState) {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData(false);
  }, []);

  const zestySpend = useMemo(
    () => orders.reduce((total, order) => total + toNumber(order.total), 0),
    [orders]
  );

  const eventraSpend = useMemo(
    () => bookings.reduce((total, booking) => total + toNumber(booking.total), 0),
    [bookings]
  );

  const combinedSpend = zestySpend + eventraSpend;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d0d0d] text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,13,18,0.76)_0%,rgba(10,13,18,0.9)_42%,rgba(10,13,18,0.95)_100%)]" />

      <div className="relative z-10 py-8">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/20 bg-[rgba(12,16,22,0.62)] p-6 shadow-[0_20px_36px_rgba(0,0,0,0.36)] backdrop-blur-md md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">Platforma</p>
                <h1
                  className="mt-3 text-4xl font-semibold leading-tight text-white md:text-5xl"
                  style={{ fontFamily: '"Playfair Display", serif' }}
                >
                  My Dashboard
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
                  Unified snapshot of your Zesty orders and Eventra bookings.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/dashboard/zesty"
                  className="rounded-lg border border-white/45 bg-transparent px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-white hover:text-[#111111]"
                >
                  Zesty Dashboard
                </Link>
                <Link
                  to="/dashboard/eventra"
                  className="rounded-lg border border-white/45 bg-transparent px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-white hover:text-[#111111]"
                >
                  Eventra Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void fetchDashboardData();
                  }}
                  disabled={isRefreshing}
                  className="w-fit rounded-lg border border-white/45 bg-transparent px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-white hover:text-[#111111]"
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
          </section>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/15 bg-[rgba(15,19,25,0.72)] p-5 shadow-[0_16px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c7d39f]">Zesty Orders</p>
              <p className="mt-3 text-4xl font-semibold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
                {ordersLoading ? '...' : orders.length}
              </p>
              <p className="mt-2 text-sm text-white/75">
                Total spent: {ordersLoading ? 'Loading...' : formatCurrency(zestySpend)}
              </p>
            </article>

            <article className="rounded-2xl border border-white/15 bg-[rgba(15,19,25,0.72)] p-5 shadow-[0_16px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">Eventra Bookings</p>
              <p className="mt-3 text-4xl font-semibold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
                {bookingsLoading ? '...' : bookings.length}
              </p>
              <p className="mt-2 text-sm text-white/75">
                Total spent: {bookingsLoading ? 'Loading...' : formatCurrency(eventraSpend)}
              </p>
            </article>

            <article className="rounded-2xl border border-white/15 bg-[rgba(15,19,25,0.72)] p-5 shadow-[0_16px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Combined Activity</p>
              <p className="mt-3 text-4xl font-semibold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
                {ordersLoading || bookingsLoading ? '...' : orders.length + bookings.length}
              </p>
              <p className="mt-2 text-sm text-white/75">
                Total spent: {ordersLoading || bookingsLoading ? 'Loading...' : formatCurrency(combinedSpend)}
              </p>
            </article>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/15 bg-[rgba(15,19,25,0.72)] p-5 shadow-[0_16px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
                  Zesty Order History
                </h2>
                <Link
                  to="/zesty/orders"
                  className="text-sm font-semibold text-[#c7d39f] transition-colors duration-200 hover:text-[#e4edc6]"
                >
                  View All
                </Link>
              </div>

              {orderError && (
                <DashboardError
                  message={orderError}
                  onRetry={() => {
                    void fetchOrders();
                  }}
                />
              )}

              {ordersLoading && !orderError && (
                <div className="rounded-xl border border-white/12 bg-white/5 p-4">
                  <LoadingSpinner size="sm" />
                  <p className="mt-3 text-center text-sm text-white/75">Loading Zesty orders...</p>
                </div>
              )}

              {!ordersLoading && !orderError && orders.length === 0 && (
                <div className="rounded-xl border border-white/12 bg-white/5 p-4 text-sm text-white/80">
                  No Zesty orders yet.
                </div>
              )}

              {!ordersLoading && !orderError && orders.length > 0 && (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <Link
                      key={order.id}
                      to={`/zesty/orders/${order.id}`}
                      className="block rounded-xl border border-white/12 bg-[rgba(255,255,255,0.04)] p-4 transition-colors duration-200 hover:bg-[rgba(255,255,255,0.08)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{order.restaurant_name || 'Restaurant'}</p>
                          <p className="mt-1 text-sm text-white/70">Order #{order.id}</p>
                          <p className="mt-1 text-xs text-white/60">{formatDateTime(order.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getOrderStatusClass(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                          <p className="mt-2 text-sm font-semibold text-white">{formatCurrency(order.total)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/15 bg-[rgba(15,19,25,0.72)] p-5 shadow-[0_16px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
                  Eventra Booking History
                </h2>
                <Link
                  to="/eventra/bookings"
                  className="text-sm font-semibold text-[#c7d39f] transition-colors duration-200 hover:text-[#e4edc6]"
                >
                  View All
                </Link>
              </div>

              {bookingError && (
                <DashboardError
                  message={bookingError}
                  onRetry={() => {
                    void fetchBookings();
                  }}
                />
              )}

              {bookingsLoading && !bookingError && (
                <div className="rounded-xl border border-white/12 bg-white/5 p-4">
                  <LoadingSpinner size="sm" />
                  <p className="mt-3 text-center text-sm text-white/75">Loading Eventra bookings...</p>
                </div>
              )}

              {!bookingsLoading && !bookingError && bookings.length === 0 && (
                <div className="rounded-xl border border-white/12 bg-white/5 p-4 text-sm text-white/80">
                  No Eventra bookings yet.
                </div>
              )}

              {!bookingsLoading && !bookingError && bookings.length > 0 && (
                <div className="space-y-3">
                  {bookings.slice(0, 5).map((booking) => (
                    <Link
                      key={booking.id}
                      to={`/eventra/bookings/${booking.id}`}
                      className="block rounded-xl border border-white/12 bg-[rgba(255,255,255,0.04)] p-4 transition-colors duration-200 hover:bg-[rgba(255,255,255,0.08)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{booking.event_name || 'Event'}</p>
                          <p className="mt-1 text-sm text-white/70">Booking #{booking.booking_reference}</p>
                          <p className="mt-1 text-xs text-white/60">{formatDateTime(booking.booking_date)}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getBookingStatusClass(booking.status)}`}>
                            {formatStatus(booking.status)}
                          </span>
                          <p className="mt-2 text-sm font-semibold text-white">{formatCurrency(booking.total)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboardPage;
