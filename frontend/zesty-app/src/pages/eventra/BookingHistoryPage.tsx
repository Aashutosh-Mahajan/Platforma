import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ticket } from 'lucide-react';
import { bookingAPI } from '../../api/eventra';
import { ErrorBanner, Segmented, StatusPill } from '../../components/dashboard/primitives';
import type { Booking } from '../../types';
import { seatCode } from '../../utils';

const BookingHistoryPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingAPI.list(statusFilter || undefined);
      setBookings(response.results);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const FILTERS = [
    { value: '', label: 'All' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-eventra-body text-[#f5f0e8]">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-eventra-display text-4xl font-medium">My bookings</h1>
            <p className="mt-2 text-sm text-[#9a9a9a]">Every ticket you've booked on Eventra. Open one to see your seats and QR codes.</p>
          </div>
          <Segmented world="eventra" label="Filter bookings" value={statusFilter} onChange={setStatusFilter} options={FILTERS} />
        </div>

        {error && <ErrorBanner world="eventra" message={error} onRetry={fetchBookings} onDismiss={() => setError(null)} />}

        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading bookings">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/[0.06] bg-[#141414]" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-white/[0.07] bg-[#141414] px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#c4621a]/15 text-[#e8824a]">
              <Ticket className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
            </span>
            <p className="mt-5 font-eventra-display text-2xl">{statusFilter ? `No ${statusFilter} bookings` : 'No tickets yet'}</p>
            <p className="mt-2 max-w-sm text-sm text-[#9a9a9a]">
              {statusFilter ? 'Try another filter to see the rest of your bookings.' : 'Pick a show, choose your seats on the map and your tickets will appear here.'}
            </p>
            <Link to="/eventra/events" className="mt-6 rounded-full bg-[#c4621a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d8712a]">
              Browse events
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {bookings.map((booking) => (
              <li key={booking.id}>
                <Link
                  to={`/eventra/bookings/${booking.id}`}
                  className="group relative block overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(150deg,#1d1510_0%,#141414_55%)] transition-colors hover:border-[#c4621a]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8824a]"
                >
                  <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-eventra-display text-2xl leading-tight">{booking.event_name}</h2>
                        <StatusPill world="eventra" status={booking.status} />
                      </div>
                      <p className="mt-2 text-sm text-[#9a9a9a]">
                        <span className="font-mono tracking-wide text-[#c9c3ba]">{booking.booking_reference}</span> · booked{' '}
                        {new Date(booking.booking_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {booking.booked_seats.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {booking.booked_seats.slice(0, 6).map((bs) => (
                            <span key={bs.id} className="rounded-md bg-white/[0.05] px-2 py-1 font-mono text-xs text-[#f0a070] ring-1 ring-inset ring-white/[0.06]">
                              {bs.seat.section} · {seatCode(bs.seat.row, bs.seat.seat_number)}
                            </span>
                          ))}
                          {booking.booked_seats.length > 6 && <span className="px-1 py-1 text-xs text-[#9a9a9a]">+{booking.booked_seats.length - 6} more</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-5 sm:flex-col sm:items-end sm:gap-1">
                      <p className="text-xl font-semibold tabular-nums">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(booking.total) || 0)}
                      </p>
                      <p className="text-xs text-[#9a9a9a]">{booking.total_tickets} {booking.total_tickets === 1 ? 'ticket' : 'tickets'}</p>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#e8824a] sm:mt-2">
                        View tickets <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default BookingHistoryPage;
