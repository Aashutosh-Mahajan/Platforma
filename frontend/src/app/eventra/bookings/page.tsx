'use client';

import React, { useEffect, useState } from 'react';
import ClientLayout from '@/components/ClientLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import api from '@/utils/api';
import type { ApiListResponse, EventBooking } from '@/types/domain';

function BookingsContent() {
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get<ApiListResponse<EventBooking>>('/eventra/bookings/');
        setBookings(response.data.results);
      } catch {
        setError('Unable to load your event bookings right now.');
      } finally {
        setLoading(false);
      }
    };

    void fetchBookings();
  }, []);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', marginBottom: '18px' }}>Your Event Bookings</h1>

      {error ? <p style={{ color: 'var(--error)', marginBottom: '14px' }}>{error}</p> : null}
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading bookings...</p> : null}

      {!loading && !bookings.length ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', color: 'var(--text-secondary)' }}>
          You have no bookings yet. Visit Events to book your first ticket.
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: '14px' }}>
        {bookings.map((booking) => (
          <div key={booking.id} style={{
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '18px',
            background: 'var(--surface)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', gap: '12px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '17px' }}>{booking.event_name}</h2>
              <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>Status: {booking.status}</span>
            </div>

            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '10px' }}>
              Reference: {booking.booking_reference} | Tickets: {booking.total_tickets}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <span>{new Date(booking.booking_date).toLocaleString()}</span>
              <strong style={{ color: 'var(--text-primary)' }}>INR {booking.total}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <ClientLayout>
      <ProtectedRoute>
        <BookingsContent />
      </ProtectedRoute>
    </ClientLayout>
  );
}
