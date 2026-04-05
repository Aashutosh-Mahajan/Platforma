import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingAPI, eventAPI } from '../../api/eventra';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorMessage } from '../../components/shared/ErrorMessage';
import type { Booking, Event } from '../../types';

const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBookingDetails(parseInt(id));
    }
  }, [id]);

  const fetchBookingDetails = async (bookingId: number) => {
    try {
      setLoading(true);
      setError(null);
      const bookingData = await bookingAPI.retrieve(bookingId);
      setBooking(bookingData);

      // Fetch event details
      try {
        const eventData = await eventAPI.retrieve(bookingData.event);
        setEvent(eventData);
      } catch (eventErr) {
        console.log('Event details not available');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !id || !event) return;

    // Check if cancellation is allowed
    if (!canCancelBooking(booking.status, event.event_date)) {
      setError('This booking cannot be cancelled');
      return;
    }

    if (!window.confirm('Are you sure you want to cancel this booking? You will receive a refund according to our cancellation policy.')) {
      return;
    }

    setCancelling(true);
    try {
      const response = await bookingAPI.cancel(parseInt(id));
      setBooking(response.booking);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const canCancelBooking = (status: string, eventDate: string): boolean => {
    // Status must be pending or confirmed
    if (!['pending', 'confirmed'].includes(status)) {
      return false;
    }

    // Event must be at least 24 hours in the future
    const eventTime = new Date(eventDate).getTime();
    const now = Date.now();
    const hoursUntilEvent = (eventTime - now) / (1000 * 60 * 60);

    return hoursUntilEvent >= 24;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const handleDownloadBooking = () => {
    if (!booking || !event) return;

    // Create a simple text representation of the booking
    const bookingText = `
BOOKING CONFIRMATION
====================

Booking Reference: ${booking.booking_reference}
Event: ${event.name}
Venue: ${event.venue_name}
Date: ${new Date(event.event_date).toLocaleString()}

Seats:
${booking.booked_seats.map(bs => `${bs.seat.section} - Row ${bs.seat.row}, Seat ${bs.seat.seat_number}`).join('\n')}

Total Tickets: ${booking.total_tickets}
Subtotal: ₹${booking.subtotal.toFixed(2)}
Tax: ₹${booking.tax.toFixed(2)}
Total: ₹${booking.total.toFixed(2)}

Status: ${formatStatus(booking.status)}
Booked on: ${new Date(booking.booking_date).toLocaleString()}
    `.trim();

    // Create and download file
    const blob = new Blob([bookingText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-${booking.booking_reference}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareBooking = async () => {
    if (!booking || !event) return;

    const shareText = `My booking for ${event.name}\nBooking Reference: ${booking.booking_reference}\nDate: ${new Date(event.event_date).toLocaleDateString()}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Event Booking',
          text: shareText,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Booking details copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <LoadingSpinner size="lg" message="Loading booking details..." />
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="text-center max-w-md">
          <ErrorMessage 
            message={error} 
            onRetry={() => id && fetchBookingDetails(parseInt(id))}
          />
          <button
            onClick={() => navigate('/eventra/bookings')}
            className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/eventra/bookings')}
            className="text-purple-500 hover:text-purple-600 mb-4 flex items-center gap-2"
          >
            ← Back to Bookings
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Booking #{booking.booking_reference}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {new Date(booking.booking_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
              {formatStatus(booking.status)}
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

        {/* QR Code / Booking Reference */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            Entry Pass
          </h2>
          <div className="flex flex-col items-center">
            {/* Display booking reference prominently */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-500 rounded-lg p-8 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-2">
                Show this at the venue
              </p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 text-center tracking-wider">
                {booking.booking_reference}
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Present this booking reference at the venue for entry
            </p>
          </div>
        </div>

        {/* Event Details */}
        {event && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Event Details
            </h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                  {event.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  📍 {event.venue_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {event.address}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  📅 {new Date(event.event_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Booked Seats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Your Seats
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {booking.booked_seats.map((bookedSeat) => (
              <div
                key={bookedSeat.id}
                className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center"
              >
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {bookedSeat.seat.section}
                </p>
                <p className="font-bold text-purple-600 dark:text-purple-400">
                  {bookedSeat.seat.row}{bookedSeat.seat.seat_number}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  ₹{bookedSeat.seat.price}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Payment Summary
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Subtotal ({booking.total_tickets} tickets)</span>
              <span>₹{booking.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Tax (18%)</span>
              <span>₹{booking.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
              <span>Total</span>
              <span>₹{booking.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadBooking}
              className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
            >
              📥 Download Booking
            </button>
            <button
              onClick={handleShareBooking}
              className="flex-1 px-4 py-3 border border-purple-500 text-purple-500 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors font-medium"
            >
              📤 Share Booking
            </button>
          </div>

          {event && canCancelBooking(booking.status, event.event_date) && (
            <>
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Booking'}
              </button>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                You can cancel this booking up to 24 hours before the event
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingDetailPage;
