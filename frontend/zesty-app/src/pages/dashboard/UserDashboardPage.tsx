import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingAPI } from '../../api/eventra';
import { orderAPI } from '../../api/zesty';
import { ErrorMessage } from '../../components/shared/ErrorMessage';
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
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-orange-100 text-orange-800',
    preparing: 'bg-rose-100 text-rose-800',
    ready: 'bg-red-100 text-red-700',
    out_for_delivery: 'bg-purple-100 text-purple-700',
    delivered: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return classes[status] || 'bg-gray-100 text-gray-700';
};

const getBookingStatusClass = (status: Booking['status']): string => {
  const classes: Record<Booking['status'], string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return classes[status] || 'bg-gray-100 text-gray-700';
};

const UserDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);

    const [ordersResult, bookingsResult] = await Promise.allSettled([
      orderAPI.list(),
      bookingAPI.list(),
    ]);

    if (ordersResult.status === 'fulfilled') {
      setOrders(ordersResult.value.results || []);
      setOrderError(null);
    } else {
      setOrderError('Unable to load Zesty orders right now.');
    }

    if (bookingsResult.status === 'fulfilled') {
      setBookings(bookingsResult.value.results || []);
      setBookingError(null);
    } else {
      setBookingError('Unable to load Eventra bookings right now.');
    }

    setLoading(false);
  };

  useEffect(() => {
    void fetchDashboardData();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f7f7] via-[#f9f6ff] to-[#fff8f3] py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Unified snapshot of your Zesty orders and Eventra bookings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/dashboard/zesty"
              className="rounded-lg border border-[#f4d5d8] bg-white px-4 py-2 text-sm font-semibold text-[#b7122a] transition-colors hover:bg-[#fff8f8]"
            >
              Zesty Dashboard
            </Link>
            <Link
              to="/dashboard/eventra"
              className="rounded-lg border border-[#e6ddff] bg-white px-4 py-2 text-sm font-semibold text-[#5e36ee] transition-colors hover:bg-[#f8f6ff]"
            >
              Eventra Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                void fetchDashboardData();
              }}
              className="w-fit rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-[#ffe0e3] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b7122a]">Zesty Orders</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{orders.length}</p>
            <p className="mt-2 text-sm text-gray-600">Total spent: {formatCurrency(zestySpend)}</p>
          </article>

          <article className="rounded-xl border border-[#e6dcff] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5e36ee]">Eventra Bookings</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{bookings.length}</p>
            <p className="mt-2 text-sm text-gray-600">Total spent: {formatCurrency(eventraSpend)}</p>
          </article>

          <article className="rounded-xl border border-[#e4e4e7] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-700">Combined Activity</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{orders.length + bookings.length}</p>
            <p className="mt-2 text-sm text-gray-600">Total spent: {formatCurrency(combinedSpend)}</p>
          </article>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-[#ffd7db] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Zesty Order History</h2>
              <Link
                to="/zesty/orders"
                className="text-sm font-semibold text-[#b7122a] hover:text-[#92001c]"
              >
                View All
              </Link>
            </div>

            {orderError && (
              <ErrorMessage
                message={orderError}
                onRetry={() => {
                  void fetchDashboardData();
                }}
              />
            )}

            {!orderError && orders.length === 0 && (
              <div className="rounded-lg bg-[#fff7f8] p-4 text-sm text-gray-700">
                No Zesty orders yet.
              </div>
            )}

            {!orderError && orders.length > 0 && (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <Link
                    key={order.id}
                    to={`/zesty/orders/${order.id}`}
                    className="block rounded-lg border border-[#f4e4e6] p-4 transition-colors hover:bg-[#fff8f8]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{order.restaurant_name || 'Restaurant'}</p>
                        <p className="mt-1 text-sm text-gray-600">Order #{order.id}</p>
                        <p className="mt-1 text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getOrderStatusClass(order.status)}`}>
                          {formatStatus(order.status)}
                        </span>
                        <p className="mt-2 text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#e2d9ff] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Eventra Booking History</h2>
              <Link
                to="/eventra/bookings"
                className="text-sm font-semibold text-[#5e36ee] hover:text-[#4600d7]"
              >
                View All
              </Link>
            </div>

            {bookingError && (
              <ErrorMessage
                message={bookingError}
                onRetry={() => {
                  void fetchDashboardData();
                }}
              />
            )}

            {!bookingError && bookings.length === 0 && (
              <div className="rounded-lg bg-[#f6f3ff] p-4 text-sm text-gray-700">
                No Eventra bookings yet.
              </div>
            )}

            {!bookingError && bookings.length > 0 && (
              <div className="space-y-3">
                {bookings.slice(0, 5).map((booking) => (
                  <Link
                    key={booking.id}
                    to={`/eventra/bookings/${booking.id}`}
                    className="block rounded-lg border border-[#e9e2ff] p-4 transition-colors hover:bg-[#faf8ff]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{booking.event_name || 'Event'}</p>
                        <p className="mt-1 text-sm text-gray-600">Booking #{booking.booking_reference}</p>
                        <p className="mt-1 text-xs text-gray-500">{formatDateTime(booking.booking_date)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getBookingStatusClass(booking.status)}`}>
                          {formatStatus(booking.status)}
                        </span>
                        <p className="mt-2 text-sm font-semibold text-gray-900">{formatCurrency(booking.total)}</p>
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
  );
};

export default UserDashboardPage;
