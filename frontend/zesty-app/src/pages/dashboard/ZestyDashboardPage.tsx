import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bike, CheckCircle2, ChefHat, CookingPot, PackageCheck, ReceiptText, RotateCw, UtensilsCrossed, Wallet } from 'lucide-react';
import { orderAPI } from '../../api/zesty';
import { useAuth } from '../../contexts';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import {
  AreaChart,
  EmptyState,
  ErrorBanner,
  KpiLedger,
  Panel,
  RankedBars,
  Segmented,
  SkeletonRows,
  StatusPill,
} from '../../components/dashboard/primitives';
import { customerNav } from '../../components/dashboard/roleNav';
import { bucketByDay, formatDate, formatINR, formatInt, shortRef, themes, toNumber } from '../../components/dashboard/theme';
import { fallbackFoodImage } from '../../utils/foodImagery';
import type { Order } from '../../types';

const W = 'zesty' as const;
const t = themes[W];

const ACTIVE = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'];
const STEPS: { status: Order['status']; label: string; icon: typeof ChefHat }[] = [
  { status: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { status: 'preparing', label: 'Cooking', icon: CookingPot },
  { status: 'ready', label: 'Ready', icon: PackageCheck },
  { status: 'out_for_delivery', label: 'On the way', icon: Bike },
  { status: 'delivered', label: 'Delivered', icon: UtensilsCrossed },
];

const ZestyDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'delivered' | 'cancelled'>('all');

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

  const sorted = useMemo(() => [...orders].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)), [orders]);
  const totalSpend = useMemo(() => orders.reduce((sum, o) => sum + toNumber(o.total), 0), [orders]);
  const active = sorted.filter((o) => ACTIVE.includes(o.status));
  const delivered = orders.filter((o) => o.status === 'delivered').length;
  const history = sorted.filter((o) => (filter === 'all' ? !ACTIVE.includes(o.status) : o.status === filter));
  const spendSeries = bucketByDay(orders.filter((o) => o.status !== 'cancelled'), (o) => o.created_at, (o) => toNumber(o.total), 30);
  const favourites = Object.values(
    orders
      .filter((o) => o.status !== 'cancelled')
      .reduce<Record<string, { label: string; value: number; count: number }>>((acc, o) => {
        const name = o.restaurant_name || 'Restaurant';
        acc[name] = acc[name] ?? { label: name, value: 0, count: 0 };
        acc[name].value += toNumber(o.total);
        acc[name].count += 1;
        return acc;
      }, {})
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((f) => ({ label: f.label, value: f.value, sub: `${f.count} ${f.count === 1 ? 'order' : 'orders'}` }));

  return (
    <DashboardShell
      world={W}
      context="Your food orders"
      nav={customerNav}
      activeKey="zesty"
      image="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1800&q=80"
      title={
        <>
          What's cooking, <span className={t.titleAccent}>{user?.first_name || 'friend'}</span>?
        </>
      }
      subtitle="Track live orders, reorder favourites and keep an eye on what you spend."
      actions={
        <>
          <button type="button" onClick={() => void fetchOrders()} className={t.btnOnImage}>
            <RotateCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </button>
          <Link to="/zesty" className={t.btnOnImagePrimary}>
            Order food <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </>
      }
      ledger={
        <KpiLedger
          world={W}
          loading={loading}
          items={[
            { label: 'Orders', icon: ReceiptText, value: formatInt(orders.length), hint: 'All time' },
            { label: 'On the way', icon: Bike, value: formatInt(active.length), hint: active.length ? 'Live below' : 'Nothing cooking' },
            { label: 'Delivered', icon: PackageCheck, value: formatInt(delivered) },
            { label: 'Spent', icon: Wallet, value: formatINR(totalSpend), hint: orders.length ? `${formatINR(totalSpend / orders.length)} per order` : undefined },
          ]}
        />
      }
    >
      {error && <ErrorBanner world={W} message={error} onRetry={() => void fetchOrders()} onDismiss={() => setError(null)} />}

      {loading ? (
        <Panel world={W}>
          <SkeletonRows world={W} rows={5} />
        </Panel>
      ) : orders.length === 0 ? (
        <Panel world={W}>
          <EmptyState
            world={W}
            icon={UtensilsCrossed}
            title="No orders yet"
            body="Find a restaurant nearby, fill your cart and your order will be tracked here from kitchen to door."
            action={<Link to="/zesty" className={t.btnPrimary}>Browse restaurants</Link>}
          />
        </Panel>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-2">
              {active.map((order) => {
                const stepIndex = Math.max(0, STEPS.findIndex((s) => s.status === order.status));
                return (
                  <Link
                    key={order.id}
                    to={`/zesty/orders/${order.id}`}
                    className="group block rounded-2xl bg-[#17110f] p-6 text-white transition-shadow hover:shadow-[0_24px_48px_-24px_rgba(226,55,68,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zesty-red"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-zesty-display text-xl font-bold">{order.restaurant_name}</p>
                        <p className="mt-0.5 text-sm text-white/60">Order #{shortRef(order.id)} · {formatDate(order.created_at, true)}</p>
                      </div>
                      <p className="font-semibold tabular-nums">{formatINR(order.total, true)}</p>
                    </div>
                    <ol className="mt-6 grid grid-cols-5 gap-2">
                      {STEPS.map((step, i) => {
                        const done = i <= stepIndex && order.status !== 'pending';
                        const Icon = step.icon;
                        return (
                          <li key={step.status} className="flex flex-col items-center text-center">
                            <span className={`h-1 w-full rounded-full ${done ? 'bg-zesty-red' : 'bg-white/10'}`} />
                            <Icon className={`mt-3 h-5 w-5 ${i === stepIndex && order.status !== 'pending' ? 'text-zesty-gold' : done ? 'text-white' : 'text-white/30'}`} aria-hidden="true" />
                            <span className={`mt-1 text-[11px] ${done ? 'text-white/85' : 'text-white/35'}`}>{step.label}</span>
                          </li>
                        );
                      })}
                    </ol>
                    {order.status === 'pending' && <p className="mt-4 text-sm text-zesty-gold">Waiting for the restaurant to confirm.</p>}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-5">
            <Panel
              world={W}
              flush
              className="xl:col-span-3"
              title="Order history"
              action={
                <Segmented
                  world={W}
                  label="Filter history"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'all', label: 'Past' },
                    { value: 'delivered', label: 'Delivered' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              }
            >
              {history.length === 0 ? (
                <EmptyState world={W} compact icon={ReceiptText} title="Nothing in this view" body="Orders move here once they're delivered or cancelled." />
              ) : (
                <ul className={`divide-y ${t.divide}`}>
                  {history.slice(0, 10).map((order) => (
                    <li key={order.id}>
                      <Link to={`/zesty/orders/${order.id}`} className={`flex items-center gap-4 px-5 py-4 transition-colors sm:px-6 ${t.rowHover}`}>
                        <img src={fallbackFoodImage(order.restaurant)} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{order.restaurant_name || 'Restaurant'}</p>
                          <p className={`truncate text-xs ${t.muted}`}>
                            {order.items?.map((i) => i.menu_item?.name).filter(Boolean).slice(0, 3).join(', ') || `Order #${shortRef(order.id)}`} · {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-sm font-semibold tabular-nums">{formatINR(order.total, true)}</span>
                          <StatusPill world={W} status={order.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {history.length > 10 && (
                <div className={`border-t px-6 py-3 text-right ${t.hairline}`}>
                  <Link to="/zesty/orders" className={t.btnGhost}>Full history</Link>
                </div>
              )}
            </Panel>

            <div className="space-y-6 xl:col-span-2">
              <Panel world={W} title="Your regulars" description="Where your money goes">
                {favourites.length === 0 ? (
                  <p className={`text-sm ${t.muted}`}>Your favourite kitchens will rank here.</p>
                ) : (
                  <RankedBars world={W} data={favourites} format={(v) => formatINR(v)} />
                )}
              </Panel>
              <Panel world={W} title="Spending" description={`${spendSeries[0]?.label} – ${spendSeries[spendSeries.length - 1]?.label}`}>
                <AreaChart world={W} data={spendSeries} height={160} ariaLabel="Daily food spending" format={(v) => `₹${new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)}`} />
              </Panel>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
};

export default ZestyDashboardPage;
