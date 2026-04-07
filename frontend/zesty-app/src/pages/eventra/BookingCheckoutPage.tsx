import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../contexts/BookingContext';
import { useAuth } from '../../contexts/AuthContext';
import { bookingAPI } from '../../api/eventra';
import type { Booking } from '../../types';

const BookingCheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { event, selectedSeats, ticketType, subtotal, tax, total, clearBooking } = useBooking();
  const { isAuthenticated } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<string>('credit_card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const isZoneBasedEvent = useMemo(() => {
    const category = String(event?.category || '').toLowerCase();
    return category === 'concert' || category === 'comedy' || category === 'expo' || category === 'dining';
  }, [event?.category]);

  const zoneSummary = useMemo(() => {
    return selectedSeats.reduce((acc, seat) => {
      acc[seat.section] = (acc[seat.section] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [selectedSeats]);

  useEffect(() => {
    if (confirmedBooking) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!event || selectedSeats.length === 0 || !ticketType) {
      navigate('/eventra/events');
      return;
    }
  }, [isAuthenticated, event, selectedSeats, ticketType, navigate, confirmedBooking]);

  const handleConfirmBooking = async () => {
    if (!event || !ticketType || selectedSeats.length === 0) {
      setError('Booking information is incomplete');
      return;
    }

    if (confirmedBooking) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bookingData = {
        event_id: event.id,
        payment_method: paymentMethod,
        tickets: [
          {
            ticket_type_id: ticketType.id,
            quantity: selectedSeats.length,
            seats: selectedSeats.map(seat => seat.id),
          },
        ],
      };

      const booking = await bookingAPI.create(bookingData);
      setConfirmedBooking(booking);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message ||
                          'Failed to create booking. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!event || !ticketType) {
    return null;
  }

  if (confirmedBooking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h1 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-1">Booking Confirmed</h1>
            <p className="text-green-700 dark:text-green-200">
              Your tickets are generated and ready to use.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Booking Reference</h2>
            <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 tracking-wide">
              {confirmedBooking.booking_reference}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Event: {confirmedBooking.event_name}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Tickets</h2>
            {confirmedBooking.booked_seats.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">Tickets are being prepared. Please open booking details.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {confirmedBooking.booked_seats.map((bookedSeat, index) => (
                  <div
                    key={bookedSeat.id}
                    className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20"
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      Ticket {index + 1}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {bookedSeat.seat.section} - Row {bookedSeat.seat.row}, Seat {bookedSeat.seat.seat_number}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      ₹{bookedSeat.seat.price}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-2">
              <span>Subtotal</span>
              <span>₹{confirmedBooking.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-2">
              <span>Tax</span>
              <span>₹{confirmedBooking.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <span>Total</span>
              <span>₹{confirmedBooking.total.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => {
                  clearBooking();
                  navigate(`/eventra/bookings/${confirmedBooking.id}`);
                }}
                className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
              >
                Open Booking Details
              </button>
              <button
                onClick={() => {
                  clearBooking();
                  navigate('/eventra/events');
                }}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Book Another Event
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-purple-500 hover:text-purple-600 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Confirm Booking
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review your booking details
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Event Details
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {event.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {event.venue_name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(event.event_date).toLocaleDateString('en-US', {
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

            {/* Selected Seats / Zones */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {isZoneBasedEvent ? 'Selected Zones' : 'Selected Seats'}
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {ticketType.name}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    ₹{ticketType.price} each
                  </span>
                </div>
                {isZoneBasedEvent ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(zoneSummary)
                      .sort(([left], [right]) => left.localeCompare(right))
                      .map(([zoneName, count]) => (
                        <div
                          key={zoneName}
                          className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm"
                        >
                          {zoneName} x {count}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedSeats.map(seat => (
                      <div
                        key={seat.id}
                        className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm"
                      >
                        {seat.section} - {seat.row}{seat.seat_number}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Total: {selectedSeats.length} ticket{selectedSeats.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Payment Method
              </h2>
              <div className="space-y-3">
                {[
                  { value: 'credit_card', label: 'Credit Card', icon: '💳' },
                  { value: 'debit_card', label: 'Debit Card', icon: '💳' },
                  { value: 'upi', label: 'UPI', icon: '📱' },
                  { value: 'wallet', label: 'Wallet', icon: '👛' },
                  { value: 'net_banking', label: 'Net Banking', icon: '🏦' },
                ].map(method => (
                  <label
                    key={method.value}
                    className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === method.value
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {method.label}
                        </span>
                      </div>
                      {paymentMethod === method.value && (
                        <span className="text-purple-500">✓</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Booking Summary
              </h2>

              {/* Totals */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>Subtotal ({selectedSeats.length} tickets)</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>Tax (18%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
                <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleConfirmBooking}
                disabled={loading}
                className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Processing...' : 'Confirm Booking'}
              </button>

              <button
                onClick={() => navigate(-1)}
                className="w-full mt-3 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Back to Seat Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCheckoutPage;
