'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ClientLayout from '@/components/ClientLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import api from '@/utils/api';
import type { ApiListResponse, EventItem } from '@/types/domain';
import { HiCalendar, HiLocationMarker, HiSearch, HiTicket } from 'react-icons/hi';

type EventDetail = EventItem & {
  ticket_types: Array<{ id: number; quantity_available: number }>;
};

function EventsContent() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookingEventId, setBookingEventId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get<ApiListResponse<EventItem>>('/eventra/events/');
        setEvents(response.data.results);
      } catch {
        setError('Unable to load events. Please check backend connection and login session.');
      } finally {
        setLoading(false);
      }
    };

    void fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) return events;

    return events.filter((event) => {
      return event.name.toLowerCase().includes(lower) || event.venue_name.toLowerCase().includes(lower);
    });
  }, [events, query]);

  const quickBook = async (eventId: number) => {
    setBookingEventId(eventId);
    setError('');

    try {
      const eventRes = await api.get<EventDetail>(`/eventra/events/${eventId}/`);
      const firstAvailable = eventRes.data.ticket_types.find((ticketType) => ticketType.quantity_available > 0);

      if (!firstAvailable) {
        setError('No tickets are currently available for this event.');
        return;
      }

      await api.post('/eventra/bookings/', {
        event_id: eventId,
        payment_method: 'credit_card',
        tickets: [{ ticket_type_id: firstAvailable.id, quantity: 1 }],
      });

      window.location.href = '/eventra/bookings';
    } catch {
      setError('Could not complete booking right now. Please try again.');
    } finally {
      setBookingEventId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Live Events</h1>

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
            placeholder="Search by event or venue"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
          />
        </div>
      </div>

      {error ? <p style={{ color: 'var(--error)', marginBottom: '16px' }}>{error}</p> : null}
      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading events...</p> : null}

      {!loading && !filteredEvents.length ? (
        <div style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', background: 'var(--surface)', color: 'var(--text-secondary)' }}>
          No events found.
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filteredEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            style={{ borderRadius: '16px', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div style={{
              height: '170px',
              background: 'linear-gradient(135deg, rgba(155,89,182,0.22), rgba(233,30,99,0.08))',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--text-secondary)',
              fontWeight: 700,
              padding: '12px',
              textAlign: 'center',
            }}>
              {event.name}
            </div>

            <div style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{event.name}</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '6px', marginBottom: '10px', fontSize: '13px' }}>{event.category}</p>

              <div style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HiCalendar /> {new Date(event.event_date).toLocaleString()}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HiLocationMarker /> {event.venue_name}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                <span>Available seats: {event.available_seats}</span>
                <span>Rating: {event.rating}</span>
              </div>

              <button
                onClick={() => void quickBook(event.id)}
                disabled={bookingEventId === event.id}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  background: 'var(--gradient-primary)',
                  color: '#fff',
                  cursor: bookingEventId === event.id ? 'wait' : 'pointer',
                  opacity: bookingEventId === event.id ? 0.7 : 1,
                  fontWeight: 700,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <HiTicket /> {bookingEventId === event.id ? 'Booking...' : 'Quick Book'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <ClientLayout>
      <ProtectedRoute>
        <EventsContent />
      </ProtectedRoute>
    </ClientLayout>
  );
}
