import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../../api/zesty';
import { ErrorMessage } from '../../components/shared/ErrorMessage';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import type { Order } from '../../types';

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

const ZestyDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderAPI.list();
      setOrders(response.results || []);
    } catch (_error) {
      setError('Unable to load your Zesty dashboard right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  const totalSpend = useMemo(
    () => orders.reduce((total, order) => total + toNumber(order.total), 0),
    [orders]
  );

  const activeOrders = useMemo(
    () =>
      orders.filter((order) =>
        ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(order.status)
      ).length,
    [orders]
  );

  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.status === 'delivered').length,
    [orders]
  );

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 6),
    [orders]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <LoadingSpinner size="lg" message="Loading Zesty dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff8f8] via-[#fff] to-[#fff8f8] py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b7122a]">Zesty</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Zesty Dashboard</h1>
            <p className="mt-2 text-gray-600">Track your food orders, status updates, and spending.</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                void fetchOrders();
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
            >
              Refresh
            </button>
            <Link
              to="/zesty/orders"
              className="rounded-lg bg-[#b7122a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#92001c]"
            >
              Full History
            </Link>
          </div>
        </div>

        {error && (
          <ErrorMessage
            message={error}
            onRetry={() => {
              void fetchOrders();
            }}
            onDismiss={() => setError(null)}
          />
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <article className="rounded-xl border border-[#f4d5d8] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#b7122a]">Total Orders</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{orders.length}</p>
          </article>

          <article className="rounded-xl border border-[#f4d5d8] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#b7122a]">Active</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{activeOrders}</p>
          </article>

          <article className="rounded-xl border border-[#f4d5d8] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#b7122a]">Delivered</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{deliveredOrders}</p>
          </article>

          <article className="rounded-xl border border-[#f4d5d8] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#b7122a]">Total Spend</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{formatCurrency(totalSpend)}</p>
          </article>
        </div>

        <section className="mt-8 rounded-xl border border-[#f4d5d8] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/dashboard" className="text-sm font-semibold text-[#b7122a] hover:text-[#92001c]">
              Unified Dashboard
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="rounded-lg bg-[#fff7f8] p-4 text-sm text-gray-700">No Zesty orders found yet.</div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/zesty/orders/${order.id}`}
                  className="block rounded-lg border border-[#f6e4e6] p-4 transition-colors hover:bg-[#fff7f8]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{order.restaurant_name || 'Restaurant'}</p>
                      <p className="mt-1 text-sm text-gray-600">Order #{order.id}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</p>
                      <p className="mt-1 text-xs text-gray-600">{formatStatus(order.status)}</p>
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

export default ZestyDashboardPage;
