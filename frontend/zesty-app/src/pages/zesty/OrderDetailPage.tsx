import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../../api/zesty';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorMessage } from '../../components/shared/ErrorMessage';
import type { Order, DeliveryTracking } from '../../types';

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrderDetails(parseInt(id));
    }

    return () => {
      // Cleanup polling on unmount
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [id]);

  const fetchOrderDetails = async (orderId: number) => {
    try {
      setLoading(true);
      setError(null);
      const orderData = await orderAPI.retrieve(orderId);
      setOrder(orderData);

      // Fetch tracking if order is active
      if (isActiveOrder(orderData.status)) {
        try {
          const trackingData = await orderAPI.getTracking(orderId);
          setTracking(trackingData);
        } catch (trackingErr) {
          // Tracking might not be available yet, that's okay
          console.log('Tracking not available yet');
        }

        // Start polling for active orders
        startPolling(orderId);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const isActiveOrder = (status: string): boolean => {
    return !['delivered', 'cancelled'].includes(status);
  };

  const startPolling = (orderId: number) => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 30 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const orderData = await orderAPI.retrieve(orderId);
        setOrder(orderData);

        // Try to fetch tracking
        if (isActiveOrder(orderData.status)) {
          try {
            const trackingData = await orderAPI.getTracking(orderId);
            setTracking(trackingData);
          } catch (trackingErr) {
            // Tracking might not be available
          }
        } else {
          // Stop polling if order is no longer active
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 30000); // 30 seconds
  };

  const handleCancelOrder = async () => {
    if (!order || !id) return;

    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setCancelling(true);
    try {
      const updatedOrder = await orderAPI.cancel(parseInt(id));
      setOrder(updatedOrder);
      
      // Stop polling after cancellation
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const canCancelOrder = (status: string): boolean => {
    return ['pending', 'confirmed'].includes(status);
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
    const statuses = [
      { key: 'pending', label: 'Order Placed', icon: '📝' },
      { key: 'confirmed', label: 'Confirmed', icon: '✅' },
      { key: 'preparing', label: 'Preparing', icon: '👨‍🍳' },
      { key: 'ready', label: 'Ready', icon: '📦' },
      { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🚚' },
      { key: 'delivered', label: 'Delivered', icon: '🎉' },
    ];

    if (order?.status === 'cancelled') {
      return [
        { key: 'pending', label: 'Order Placed', icon: '📝' },
        { key: 'cancelled', label: 'Cancelled', icon: '❌' },
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
            onRetry={() => id && fetchOrderDetails(parseInt(id))}
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
                {new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
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
                      {isCurrent && order.estimated_delivery && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Estimated delivery: {new Date(order.estimated_delivery).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
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
        {tracking && order.status === 'out_for_delivery' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Delivery Tracking
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
              {tracking.eta && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ETA: {new Date(tracking.eta).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
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
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white">
                      {item.quantity}x {item.menu_item.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ₹{item.unit_price.toFixed(2)} each
                    </p>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    ₹{item.total.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Delivery Address
            </h3>
            <div className="text-gray-700 dark:text-gray-300">
              <p>{order.delivery_address.street}</p>
              <p>{order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.postal_code}</p>
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
              <span>₹{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Delivery Fee</span>
              <span>₹{order.delivery_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Tax</span>
              <span>₹{order.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
              <span>Total</span>
              <span>₹{order.total.toFixed(2)}</span>
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
              You can cancel this order while it's pending or confirmed
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailPage;
