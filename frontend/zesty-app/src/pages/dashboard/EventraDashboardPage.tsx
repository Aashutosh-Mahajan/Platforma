import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingAPI } from '../../api/eventra';
import { ErrorMessage } from '../../components/shared/ErrorMessage';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import type { Booking } from '../../types';

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value: unknown): string => `₹${toNumber(value).toFixed(2)}`;

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatStatus = (status: string): string =>
  status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const EventraDashboardPage: React.FC = () => {
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

  const totalSpend = useMemo(
    () => bookings.reduce((total, booking) => total + toNumber(booking.total), 0),
    [bookings]
  );

  const activeBookings = useMemo(
    () => bookings.filter((booking) => ['pending', 'confirmed'].includes(booking.status)).length,
    [bookings]
  );

  const completedBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'completed').length,
    [bookings]
  );

  const recentBookings = useMemo(
    () => [...bookings].sort((a, b) => +new Date(b.booking_date) - +new Date(a.booking_date)).slice(0, 6),
    [bookings]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Loading Eventra dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f6ff] via-[#fff] to-[#f8f6ff] py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5e36ee]">Eventra</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Eventra Dashboard</h1>
            <p className="mt-2 text-gray-600">Track your bookings, ticket activity, and event spending.</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                void fetchBookings();
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
            >
              Refresh
            </button>
            <Link
              to="/eventra/bookings"
              className="rounded-lg bg-[#5e36ee] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4600d7]"
            >
              Full History
            </Link>
          </div>
        </div>

        {error && (
          <ErrorMessage
            message={error}
            onRetry={() => {
              void fetchBookings();
            }}
            onDismiss={() => setError(null)}
          />
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <article className="rounded-xl border border-[#e6ddff] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5e36ee]">Total Bookings</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{bookings.length}</p>
          </article>

          <article className="rounded-xl border border-[#e6ddff] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5e36ee]">Active</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{activeBookings}</p>
          </article>

          <article className="rounded-xl border border-[#e6ddff] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5e36ee]">Completed</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{completedBookings}</p>
          </article>

          <article className="rounded-xl border border-[#e6ddff] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5e36ee]">Total Spend</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{formatCurrency(totalSpend)}</p>
          </article>
        </div>

        <section className="mt-8 rounded-xl border border-[#e6ddff] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Recent Bookings</h2>
            <Link to="/dashboard" className="text-sm font-semibold text-[#5e36ee] hover:text-[#4600d7]">
              Unified Dashboard
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className="rounded-lg bg-[#f7f3ff] p-4 text-sm text-gray-700">No Eventra bookings found yet.</div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <Link
                  key={booking.id}
                  to={`/eventra/bookings/${booking.id}`}
                  className="block rounded-lg border border-[#eee7ff] p-4 transition-colors hover:bg-[#f9f7ff]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{booking.event_name || 'Event'}</p>
                      <p className="mt-1 text-sm text-gray-600">Booking #{booking.booking_reference}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatDateTime(booking.booking_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(booking.total)}</p>
                      <p className="mt-1 text-xs text-gray-600">{formatStatus(booking.status)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default EventraDashboardPage;
