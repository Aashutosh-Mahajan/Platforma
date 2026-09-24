import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Bike, ChefHat, CircleCheck, ClipboardList, MapPin, PackageCheck, PartyPopper, Phone, RotateCcw, Tag, XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { orderAPI } from '../../api/zesty';
import { ErrorBanner } from '../../components/dashboard/primitives';
import { BillRows, FlowCard, FlowHeader, FlowPage, VegMark } from '../../components/zesty/OrderFlow';
import { fallbackFoodImage } from '../../utils/foodImagery';
import type { Order, DeliveryTracking } from '../../types';

type ApiLikeError = {
  response?: {
    data?: {
      detail?: string;
      message?: string;
    };
  };
};

type TimelineStep = {
  key: string;
  label: string;
  icon: LucideIcon;
  minute: number | null;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value: unknown): string => {
  return `₹${toNumber(value, 0).toFixed(2)}`;
};

const parseDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const readApiErrorMessage = (err: unknown, fallbackMessage: string): string => {
    if (typeof err !== 'object' || err === null) {
      return fallbackMessage;
    }

    const apiError = err as ApiLikeError;
    return apiError.response?.data?.detail || apiError.response?.data?.message || fallbackMessage;
  };

  const isActiveOrder = useCallback((status: string): boolean => {
    return !['delivered', 'cancelled'].includes(status);
  }, []);

  const startPolling = useCallback((orderId: string | number) => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 30 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const orderData = await orderAPI.retrieve(orderId);
        setOrder(orderData);

        try {
          const trackingData = await orderAPI.getTracking(orderId);
          setTracking(trackingData);
        } catch {
          setTracking(null);
        }

        if (!isActiveOrder(orderData.status)) {
          // Stop polling if order is no longer active
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 30000); // 30 seconds
  }, [isActiveOrder]);

  const fetchOrderDetails = useCallback(async (orderId: string | number) => {
    try {
      setLoading(true);
      setError(null);
      const orderData = await orderAPI.retrieve(orderId);
      setOrder(orderData);

      try {
        const trackingData = await orderAPI.getTracking(orderId);
        setTracking(trackingData);
      } catch {
        setTracking(null);
      }

      // Keep syncing while order is active to drive simulated status progression.
      if (isActiveOrder(orderData.status)) {
        startPolling(orderId);
      }
    } catch (err: unknown) {
      setError(readApiErrorMessage(err, 'Failed to load order details'));
    } finally {
      setLoading(false);
    }
  }, [isActiveOrder, startPolling]);

  useEffect(() => {
    if (id) {
      fetchOrderDetails(id);
    }

    return () => {
      // Cleanup polling on unmount
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [id, fetchOrderDetails]);

  const handleCancelOrder = async () => {
    if (!order || !id) return;

    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setCancelling(true);
    try {
      const updatedOrder = await orderAPI.cancel(id);
      setOrder(updatedOrder);
      
      // Stop polling after cancellation
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    } catch (err: unknown) {
      setError(readApiErrorMessage(err, 'Failed to cancel order'));
    } finally {
      setCancelling(false);
    }
  };

  const canCancelOrder = (status: string): boolean => {
    return status === 'pending';
  };

  const getStatusTimeline = () => {
    const statuses: TimelineStep[] = [
      { key: 'pending', label: 'Order placed', icon: ClipboardList, minute: 0 },
      { key: 'confirmed', label: 'Restaurant confirmed', icon: CircleCheck, minute: 2 },
      { key: 'preparing', label: 'Being prepared', icon: ChefHat, minute: 5 },
      { key: 'ready', label: 'Packed and ready', icon: PackageCheck, minute: 9 },
      { key: 'out_for_delivery', label: 'Out for delivery', icon: Bike, minute: 12 },
      { key: 'delivered', label: 'Delivered', icon: PartyPopper, minute: 15 },
    ];

    if (order?.status === 'cancelled') {
      return [
        { key: 'pending', label: 'Order placed', icon: ClipboardList, minute: 0 },
        { key: 'cancelled', label: 'Cancelled', icon: XCircle, minute: null },
      ];
    }

    return statuses;
  };

  const getStatusIndex = (status: string) => {
    const timeline = getStatusTimeline();
    return timeline.findIndex(s => s.key === status);
  };

  const restaurantImage = fallbackFoodImage(order?.restaurant ?? 0);

  if (loading) {
    return (
      <FlowPage>
        <FlowHeader step={2} title="Your order" image={restaurantImage} back={{ to: '/zesty/orders', label: 'All orders' }} />
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-5 py-8 sm:px-8 lg:grid-cols-3" aria-busy="true" aria-label="Loading order">
          <div className="h-80 animate-pulse rounded-2xl bg-[#f1e6da] lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-2xl bg-[#f1e6da]" />
        </div>
      </FlowPage>
    );
  }

  if (error && !order) {
    return (
      <FlowPage>
        <FlowHeader title="We couldn't load this order" back={{ to: '/zesty/orders', label: 'All orders' }} />
        <div className="mx-auto max-w-xl px-5 py-12 sm:px-8">
          <ErrorBanner world="zesty" message={error} onRetry={() => id && fetchOrderDetails(id)} />
        </div>
      </FlowPage>
    );
  }

  if (!order) return null;

  const currentStatusIndex = getStatusIndex(order.status);
  const timeline = getStatusTimeline();
  const createdAt = parseDate(order.created_at);
  const estimatedDeliveryAt = parseDate(order.estimated_delivery);
  const trackingTimeline = Array.isArray(tracking?.status_timeline) ? tracking.status_timeline : [];
  const reachedAt = (key: string) => {
    const hit = trackingTimeline.find((c) => c.status === key);
    return parseDate(hit?.at ?? null);
  };
  const deliveryAddress =
    order.delivery_address && typeof order.delivery_address === 'object' ? (order.delivery_address as Record<string, unknown>) : null;
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const field = (key: string): string => {
    const value = deliveryAddress?.[key];
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  };
  const time = (d: Date | null) => (d ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');
  const isLive = isActiveOrder(order.status);
  const isCancelled = order.status === 'cancelled';
  // The backend seeds a placeholder rider phone until a real rider is assigned; never show it.
  const riderPhone = tracking?.delivery_partner_phone && !/^\+?91?0{6,}$/.test(tracking.delivery_partner_phone.replace(/\s/g, '')) ? tracking.delivery_partner_phone : null;
  const heroTitle = isCancelled
    ? 'Order cancelled'
    : order.status === 'delivered'
      ? 'Delivered. Enjoy!'
      : order.status === 'out_for_delivery'
        ? 'On its way to you'
        : order.status === 'pending'
          ? 'Waiting for the restaurant'
          : 'Being prepared';

  return (
    <FlowPage>
      <FlowHeader
        step={2}
        image={restaurantImage}
        back={{ to: '/zesty/orders', label: 'All orders' }}
        title={heroTitle}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-white">{order.restaurant_name}</span>
            <span>#{String(order.id).slice(0, 8).toUpperCase()}</span>
            {createdAt && <span>{createdAt.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>}
          </span>
        }
        aside={
          isLive && estimatedDeliveryAt ? (
            <div className="rounded-2xl bg-white/10 px-5 py-3 text-right ring-1 ring-white/20 backdrop-blur">
              <p className="text-xs text-white/70">Arriving by</p>
              <p className="font-zesty-display text-2xl font-bold">{time(estimatedDeliveryAt)}</p>
            </div>
          ) : undefined
        }
      />

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-start gap-6 px-5 py-8 sm:px-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {error && <ErrorBanner world="zesty" message={error} onDismiss={() => setError(null)} />}

          <FlowCard
            title="Order status"
            action={isLive ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15784a]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#1fa463]" /> Live · updates every 30s</span> : undefined}
          >
            <ol className="relative">
              {timeline.map((step, index) => {
                const done = index <= currentStatusIndex;
                const current = index === currentStatusIndex;
                const Icon = step.icon;
                const at = reachedAt(step.key) ?? (index === 0 ? createdAt : null);
                return (
                  <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < timeline.length - 1 && (
                      <span className={`absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5 ${index < currentStatusIndex ? 'bg-zesty-red' : 'bg-[#efe2d4]'}`} aria-hidden="true" />
                    )}
                    <span
                      className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                        step.key === 'cancelled'
                          ? 'bg-rose-100 text-rose-700'
                          : current && isLive
                            ? 'bg-zesty-red text-white ring-4 ring-zesty-red/20'
                            : done
                              ? 'bg-zesty-red text-white'
                              : 'bg-[#f5ebe0] text-[#c9b6a4]'
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
                    </span>
                    <div className="pt-2">
                      <p className={`font-semibold ${done ? 'text-[#1c1c1c]' : 'text-[#b3a597]'}`}>
                        {step.label}
                        {current && isLive && <span className="ml-2 text-xs font-semibold text-zesty-redDark">Now</span>}
                      </p>
                      {done && at && <p className="text-xs text-[#a89a8e]">{time(at)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </FlowCard>

          <FlowCard title="Items">
            <ul className="-my-3 divide-y divide-[#f3e9de]">
              {orderItems.length === 0 && <li className="py-3 text-sm text-[#7a6d63]">No items recorded for this order.</li>}
              {orderItems.map((item) => (
                <li key={String(item.id)} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    {item.menu_item && <VegMark veg={!!item.menu_item.is_vegetarian} />}
                    <span className="truncate font-medium">{item.menu_item?.name || 'Menu item'}</span>
                    <span className="text-[#a89a8e]">× {toNumber(item.quantity, 1)}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{formatCurrency(item.total)}</span>
                </li>
              ))}
            </ul>
            {order.special_instructions && (
              <p className="mt-5 rounded-xl bg-zesty-gold/15 px-4 py-3 text-sm text-[#6b4a00]">
                <span className="font-semibold">Your note: </span>
                {order.special_instructions}
              </p>
            )}
          </FlowCard>
        </div>

        <div className="space-y-6 lg:sticky lg:top-20">
          <FlowCard title="Bill">
            <BillRows subtotal={order.subtotal} discount={order.discount} deliveryFee={order.delivery_fee} tax={order.tax} total={order.total} promoCode={order.promo_code} />
            <p className="mt-4 flex items-center justify-between text-xs text-[#a89a8e]">
              <span>Paid by {order.payment_method === 'cod' || order.payment_method === 'cash_on_delivery' ? 'cash on delivery' : 'card / online'}</span>
              {order.promo_code && (
                <span className="inline-flex items-center gap-1 text-[#15784a]">
                  <Tag className="h-3 w-3" aria-hidden="true" /> {order.promo_code}
                </span>
              )}
            </p>
          </FlowCard>

          <FlowCard title="Delivery">
            <div className="flex gap-3 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zesty-red" aria-hidden="true" />
              <div>
                {deliveryAddress ? (
                  <>
                    <p className="font-medium">{field('street') || 'Address'}</p>
                    <p className="text-[#7a6d63]">{[field('city'), field('state')].filter(Boolean).join(', ')} {field('postal_code')}</p>
                  </>
                ) : (
                  <p className="text-[#7a6d63]">Address not recorded</p>
                )}
              </div>
            </div>
            {tracking && !isCancelled && (
              <div className="mt-4 flex items-center gap-3 border-t border-[#efe2d4] pt-4 text-sm">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-zesty-red/10 text-zesty-redDark">
                  <Bike className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{tracking.delivery_partner_name || 'Delivery partner'}</p>
                  <p className="text-xs text-[#a89a8e]">{riderPhone ?? (order.status === 'delivered' ? 'Delivered your order' : 'Contact details appear once a rider is assigned')}</p>
                </div>
                {riderPhone && (
                  <a href={`tel:${riderPhone}`} className="grid h-9 w-9 place-items-center rounded-full border border-[#e7d9cb] hover:bg-[#fbf5ee]" aria-label="Call delivery partner">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
          </FlowCard>

          {canCancelOrder(order.status) ? (
            <div className="rounded-2xl border border-[#efe2d4] bg-white p-5">
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="w-full rounded-full border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Cancel order'}
              </button>
              <p className="mt-2 text-center text-xs text-[#a89a8e]">You can cancel until the restaurant confirms it.</p>
            </div>
          ) : (
            <Link
              to={`/zesty/restaurants/${order.restaurant}`}
              className="flex items-center justify-center gap-2 rounded-full bg-zesty-red px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-zesty-redDark"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Order from {order.restaurant_name} again
            </Link>
          )}
        </div>
      </div>
    </FlowPage>
  );
};

export default OrderDetailPage;
