'use client';

import React, { useEffect, useState } from 'react';
import ClientLayout from '@/components/ClientLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import api from '@/utils/api';
import type { ApiListResponse, Order } from '@/types/domain';

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get<ApiListResponse<Order>>('/zesty/orders/');
        setOrders(response.data.results);
      } catch {
        setError('Unable to load your orders right now.');
      } finally {
        setLoading(false);
      }
    };

    void fetchOrders();
  }, []);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', marginBottom: '18px' }}>Your Food Orders</h1>

      {error ? <p style={{ color: 'var(--error)', marginBottom: '14px' }}>{error}</p> : null}
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading orders...</p> : null}

      {!loading && !orders.length ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', color: 'var(--text-secondary)' }}>
          You have no orders yet. Visit Restaurants to place your first order.
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: '14px' }}>
        {orders.map((order) => (
          <div key={order.id} style={{
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '18px',
            background: 'var(--surface)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', gap: '12px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '17px' }}>{order.restaurant_name}</h2>
              <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>Status: {order.status.replaceAll('_', ' ')}</span>
            </div>

            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '10px' }}>
              {order.items.map((item) => `${item.menu_item.name} x${item.quantity}`).join(', ')}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <span>{new Date(order.created_at).toLocaleString()}</span>
              <strong style={{ color: 'var(--text-primary)' }}>INR {order.total}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <ClientLayout>
      <ProtectedRoute>
        <OrdersContent />
      </ProtectedRoute>
    </ClientLayout>
  );
}
