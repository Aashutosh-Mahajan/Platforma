'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ClientLayout from '@/components/ClientLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import api from '@/utils/api';
import type { ApiListResponse, Restaurant } from '@/types/domain';
import { HiClock, HiTruck, HiSearch } from 'react-icons/hi';

type RestaurantDetail = Restaurant & {
  menu_items: Array<{ id: number }>;
};

function RestaurantsContent() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [orderingRestaurantId, setOrderingRestaurantId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get<ApiListResponse<Restaurant>>('/zesty/restaurants/');
        setRestaurants(response.data.results);
      } catch {
        setError('Unable to load restaurants. Please check backend connection and login session.');
      } finally {
        setLoading(false);
      }
    };

    void fetchRestaurants();
  }, []);

  const filteredRestaurants = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) return restaurants;

    return restaurants.filter((restaurant) => {
      return restaurant.name.toLowerCase().includes(lower) || restaurant.cuisine_types.toLowerCase().includes(lower);
    });
  }, [query, restaurants]);

  const createQuickOrder = async (restaurantId: number) => {
    setOrderingRestaurantId(restaurantId);
    setError('');

    try {
      const detailRes = await api.get<RestaurantDetail>(`/zesty/restaurants/${restaurantId}/`);
      const firstMenuItem = detailRes.data.menu_items.find((item) => Boolean(item.id));

      if (!firstMenuItem) {
        setError('This restaurant has no available menu items yet.');
        return;
      }

      await api.post('/zesty/orders/', {
        restaurant_id: restaurantId,
        payment_method: 'credit_card',
        items: [{ menu_item_id: firstMenuItem.id, quantity: 1 }],
      });

      window.location.href = '/zesty/orders';
    } catch {
      setError('Could not place order right now. Try again in a moment.');
    } finally {
      setOrderingRestaurantId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Restaurants Near You
        </h1>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          minWidth: '260px',
        }}>
          <HiSearch style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Search by name or cuisine"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
              width: '100%',
              fontFamily: 'var(--font-body)',
            }}
          />
        </div>
      </div>

      {error ? <p style={{ color: 'var(--error)', marginBottom: '16px' }}>{error}</p> : null}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading restaurants...</p>
      ) : null}

      {!loading && !filteredRestaurants.length ? (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
          background: 'var(--surface)',
          color: 'var(--text-secondary)',
        }}>
          No restaurants found.
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredRestaurants.map((restaurant, index) => (
          <motion.div
            key={restaurant.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            style={{
              borderRadius: '16px',
              overflow: 'hidden',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{
              height: '150px',
              background: 'linear-gradient(135deg, rgba(255,90,31,0.2), rgba(247,147,30,0.08))',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--text-secondary)',
              fontWeight: 700,
              padding: '12px',
              textAlign: 'center',
            }}>
              {restaurant.name}
            </div>

            <div style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{restaurant.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 12px' }}>{restaurant.cuisine_types}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '10px' }}>{restaurant.address}</p>

              <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '14px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <HiClock /> {restaurant.delivery_time_min}-{restaurant.delivery_time_max} min
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <HiTruck /> {Number(restaurant.delivery_fee) ? `INR ${restaurant.delivery_fee}` : 'FREE'}
                </span>
                <span>{restaurant.review_count} reviews</span>
              </div>

              <button
                onClick={() => void createQuickOrder(restaurant.id)}
                disabled={orderingRestaurantId === restaurant.id}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  background: 'var(--gradient-primary)',
                  color: '#fff',
                  cursor: orderingRestaurantId === restaurant.id ? 'wait' : 'pointer',
                  opacity: orderingRestaurantId === restaurant.id ? 0.7 : 1,
                  fontWeight: 700,
                }}
              >
                {orderingRestaurantId === restaurant.id ? 'Placing order...' : 'Quick Order'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function RestaurantsPage() {
  return (
    <ClientLayout>
      <ProtectedRoute>
        <RestaurantsContent />
      </ProtectedRoute>
    </ClientLayout>
  );
}
