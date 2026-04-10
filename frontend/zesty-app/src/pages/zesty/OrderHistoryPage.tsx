import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../../api/zesty';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorMessage } from '../../components/shared/ErrorMessage';
import type { Order } from '../../types';

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value: unknown): string => `₹${toNumber(value, 0).toFixed(2)}`;

const OrderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderAPI.list(statusFilter || undefined);
      setOrders(response.results);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="theme-zesty theme-zesty-page min-h-screen bg-gray-50 flex justify-center items-center">
        <LoadingSpinner size="lg" message="Loading your orders..." />
      </div>
    );
  }

  return (
    <div className="theme-zesty theme-zesty-page min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Order History
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and track all your food orders
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <ErrorMessage 
            message={error} 
            onRetry={fetchOrders}
            onDismiss={() => setError(null)}
          />
        )}

        {/* Status Filter */}
        <div className="mb-6">
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter by Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          >
            <option value="">All Orders</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No orders found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {statusFilter ? 'No orders with this status' : 'You haven\'t placed any orders yet'}
            </p>
            <button
              onClick={() => navigate('/zesty/restaurants')}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Browse Restaurants
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div
                key={order.id}
                onClick={() => navigate(`/zesty/orders/${order.id}`)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {order.restaurant_name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''} • {formatCurrency(order.total)}
                      </p>
                      <p>
                        Order #{order.id} • {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="flex-1 max-w-md">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {order.items.slice(0, 2).map((item) => (
                        <div key={item.id}>
                          {toNumber(item.quantity, 1)}x {item.menu_item?.name || 'Menu Item'}
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <div className="text-gray-500 dark:text-gray-400">
                          +{order.items.length - 2} more item{order.items.length - 2 !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div>
                    <button
                      className="px-4 py-2 text-orange-500 hover:text-orange-600 font-medium"
                      aria-label="View order details"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistoryPage;
