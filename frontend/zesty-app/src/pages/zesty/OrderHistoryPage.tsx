import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ReceiptText, RotateCw } from 'lucide-react';
import { orderAPI } from '../../api/zesty';
import { ErrorBanner, Segmented, StatusPill } from '../../components/dashboard/primitives';
import { FlowHeader, FlowPage, inr } from '../../components/zesty/OrderFlow';
import { fallbackFoodImage } from '../../utils/foodImagery';
import type { Order } from '../../types';

const ACTIVE = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'];

type Filter = 'all' | 'active' | 'delivered' | 'cancelled';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'In progress' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const OrderHistoryPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderAPI.list();
      setOrders(response.results);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  const counts: Record<Filter, number> = {
    all: orders.length,
    active: orders.filter((o) => ACTIVE.includes(o.status)).length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };
  const visible = [...orders]
    .filter((o) => (filter === 'all' ? true : filter === 'active' ? ACTIVE.includes(o.status) : o.status === filter))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const totalSpent = orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return (
    <FlowPage>
      <FlowHeader
        title="Your orders"
        subtitle={
          orders.length
            ? `${orders.length} ${orders.length === 1 ? 'order' : 'orders'} · ${inr(totalSpent, false)} spent`
            : 'Every Zesty order you place shows up here.'
        }
        back={{ to: '/dashboard/zesty', label: 'Food dashboard' }}
        aside={
          <Link to="/zesty" className="inline-flex items-center gap-2 rounded-full bg-zesty-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zesty-redDark">
            Order food <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />

      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Segmented
            world="zesty"
            label="Filter orders"
            value={filter}
            onChange={setFilter}
            options={FILTERS.map((f) => ({ ...f, count: counts[f.value] }))}
          />
          <button type="button" onClick={() => void fetchOrders()} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7a6d63] hover:text-[#1c1c1c]">
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
          </button>
        </div>

        {error && <ErrorBanner world="zesty" message={error} onRetry={() => void fetchOrders()} onDismiss={() => setError(null)} />}

        {loading && orders.length === 0 ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading orders">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-[#f1e6da]" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-[#efe2d4] bg-white px-6 py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-zesty-red/10 text-zesty-red">
              <ReceiptText className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
            </span>
            <p className="mt-4 font-zesty-display text-xl font-bold">
              {filter === 'all' ? 'No orders yet' : `No ${FILTERS.find((f) => f.value === filter)!.label.toLowerCase()} orders`}
            </p>
            <p className="mt-1 max-w-sm text-sm text-[#7a6d63]">
              {filter === 'all' ? 'Find a restaurant you like and your first order will appear here.' : 'Try another filter to see the rest.'}
            </p>
            {filter === 'all' && (
              <Link to="/zesty" className="mt-6 rounded-full bg-zesty-red px-6 py-3 text-sm font-semibold text-white hover:bg-zesty-redDark">
                Browse restaurants
              </Link>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((order) => {
              const items = Array.isArray(order.items) ? order.items : [];
              const count = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
              const names = items.map((i) => `${i.quantity}× ${i.menu_item?.name ?? 'Item'}`).join(', ');
              const live = ACTIVE.includes(order.status);
              return (
                <li key={order.id}>
                  <Link
                    to={`/zesty/orders/${order.id}`}
                    className={`group flex items-center gap-4 rounded-2xl border bg-white p-4 transition-colors hover:border-[#c9b6a4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zesty-red sm:p-5 ${
                      live ? 'border-zesty-red/40' : 'border-[#efe2d4]'
                    }`}
                  >
                    <img src={fallbackFoodImage(order.restaurant)} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-zesty-display text-lg font-bold">{order.restaurant_name || 'Restaurant'}</p>
                        <StatusPill world="zesty" status={order.status} />
                      </div>
                      <p className="mt-0.5 truncate text-sm text-[#7a6d63]">{names || `${count} items`}</p>
                      <p className="mt-1 text-xs text-[#a89a8e]">
                        #{String(order.id).slice(0, 8).toUpperCase()} ·{' '}
                        {new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums">{inr(order.total)}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-zesty-redDark">
                        {live ? 'Track' : 'Details'}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </FlowPage>
  );
};

export default OrderHistoryPage;
