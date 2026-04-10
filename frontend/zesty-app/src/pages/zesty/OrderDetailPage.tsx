import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../../api/zesty';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorMessage } from '../../components/shared/ErrorMessage';
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
  icon: string;
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
  const navigate = useNavigate();
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800',
      confirmed: 'bg-orange-100 text-orange-800',
      preparing: 'bg-rose-100 text-rose-800',
      ready: 'bg-red-100 text-red-700',
      out_for_delivery: 'bg-primary-fixed text-on-primary-fixed-variant',
      delivered: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-surface-container text-on-surface-variant';
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getStatusTimeline = () => {
    const statuses: TimelineStep[] = [
      { key: 'pending', label: 'Order Placed', icon: '📝', minute: 0 },
      { key: 'confirmed', label: 'Order Confirmed', icon: '✅', minute: 2 },
      { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', minute: 5 },
      { key: 'ready', label: 'Ready for Dispatch', icon: '📦', minute: 9 },
      { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🚚', minute: 12 },
      { key: 'delivered', label: 'Order Arrived', icon: '🎉', minute: 15 },
    ];

    if (order?.status === 'cancelled') {
      return [
        { key: 'pending', label: 'Order Placed', icon: '📝', minute: 0 },
        { key: 'cancelled', label: 'Cancelled', icon: '❌', minute: null },
      ];
    }

    return statuses;
  };

  const getStatusIndex = (status: string) => {
    const timeline = getStatusTimeline();
    return timeline.findIndex(s => s.key === status);
  };

  if (loading) {
    return (
      <div className="theme-zesty theme-zesty-page min-h-screen bg-gray-50 flex justify-center items-center">
        <LoadingSpinner size="lg" message="Loading order details..." />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="theme-zesty theme-zesty-page min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center max-w-md">
          <ErrorMessage 
            message={error || 'Order not found'} 
            onRetry={() => id && fetchOrderDetails(id)}
          />
          <button
            onClick={() => navigate('/zesty/orders')}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);
  const timeline = getStatusTimeline();
  const createdAt = parseDate(order.created_at);
  const estimatedDeliveryAt = parseDate(order.estimated_delivery);
  const trackingTimeline = Array.isArray(tracking?.status_timeline) ? tracking.status_timeline : [];
  const deliveryAddress =
    order.delivery_address && typeof order.delivery_address === 'object'
      ? (order.delivery_address as Record<string, unknown>)
      : null;
  const orderItems = Array.isArray(order.items) ? order.items : [];

  const getAddressField = (key: string): string => {
    if (!deliveryAddress) {
      return '';
    }

    const value = deliveryAddress[key];
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    return '';
  };

  const getScheduledTimeLabel = (offsetMinutes: number | null): string | null => {
    if (offsetMinutes === null || !createdAt) {
      return null;
    }

    const scheduled = new Date(createdAt.getTime() + offsetMinutes * 60 * 1000);
    return scheduled.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="theme-zesty theme-zesty-page min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/zesty/orders')}
            className="text-orange-500 hover:text-orange-600 mb-4 flex items-center gap-2"
          >
            ← Back to Orders
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Order #{order.id}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {createdAt
                  ? createdAt.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Order time unavailable'}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {formatStatus(order.status)}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <ErrorMessage 
            message={error} 
            onDismiss={() => setError(null)}
          />
        )}

        {/* Status Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Order Status
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Simulated 15-minute tracking flow: Confirmed (2m) → Preparing (5m) → Ready (9m) → Out for delivery (12m) → Delivered (15m).
          </p>
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
            
            {/* Timeline Steps */}
            <div className="space-y-6">
              {timeline.map((step, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                
                return (
                  <div key={step.key} className="relative flex items-start gap-4">
                    {/* Icon */}
                    <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full text-xl ${
                      isCompleted 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}>
                      {step.icon}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pt-2">
                      <h3 className={`font-semibold ${
                        isCurrent 
                          ? 'text-orange-500' 
                          : isCompleted 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-400 dark:text-gray-600'
                      }`}>
                        {step.label}
                      </h3>
                      {getScheduledTimeLabel(step.minute) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Scheduled: {getScheduledTimeLabel(step.minute)}
                        </p>
                      )}
                      {isCurrent && estimatedDeliveryAt && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Standard 15-min delivery. ETA: {estimatedDeliveryAt.toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Delivery Tracking */}
        {tracking && order.status !== 'cancelled' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Live Tracking
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚴</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {tracking.delivery_partner_name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {tracking.delivery_partner_phone}
                  </p>
                </div>
              </div>
              {estimatedDeliveryAt && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ETA: {estimatedDeliveryAt.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
              {trackingTimeline.length > 0 ? (
                <div className="pt-2">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Progress Checkpoints
                  </p>
                  <ul className="space-y-1">
                    {trackingTimeline.map((checkpoint, index) => {
                      const checkpointTime = parseDate(checkpoint.at);
                      return (
                        <li key={`${checkpoint.status}-${checkpoint.at}-${index}`} className="text-sm text-gray-600 dark:text-gray-400">
                          • {formatStatus(checkpoint.status)}
                          {checkpointTime ? ` at ${checkpointTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Progress checkpoints will appear automatically during the simulated 15-minute journey.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Order Details
          </h2>
          
          {/* Restaurant */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Restaurant
            </h3>
            <p className="text-gray-700 dark:text-gray-300">{order.restaurant_name}</p>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Items
            </h3>
            <div className="space-y-3">
              {orderItems.length > 0 ? (
                orderItems.map(item => (
                  <div key={String(item.id)} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white">
                        {toNumber(item.quantity, 1)}x {item.menu_item?.name || 'Menu Item'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(item.unit_price)} each
                      </p>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.total)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No items available for this order.</p>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Delivery Address
            </h3>
            <div className="text-gray-700 dark:text-gray-300">
              {deliveryAddress ? (
                <>
                  <p>{getAddressField('street') || 'Address line unavailable'}</p>
                  <p>
                    {[getAddressField('city'), getAddressField('state')].filter(Boolean).join(', ')} {getAddressField('postal_code')}
                  </p>
                </>
              ) : (
                <p>Address not available</p>
              )}
            </div>
          </div>

          {/* Special Instructions */}
          {order.special_instructions && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Special Instructions
              </h3>
              <p className="text-gray-700 dark:text-gray-300">{order.special_instructions}</p>
            </div>
          )}

          {/* Totals */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Delivery Fee</span>
              <span>{formatCurrency(order.delivery_fee)}</span>
            </div>
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Tax</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {canCancelOrder(order.status) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
              You can cancel this order only before it gets confirmed
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailPage;
