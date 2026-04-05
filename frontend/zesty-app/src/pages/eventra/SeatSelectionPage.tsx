import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { eventAPI } from '../../api/eventra';
import { useBooking } from '../../contexts/BookingContext';
import type { Seat } from '../../types';

interface SeatSection {
  name: string;
  seats: Seat[];
}

const SeatSelectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ticketTypeId = searchParams.get('ticketType');
  
  const { event, ticketType, selectedSeats, addSeat, removeSeat, subtotal, tax, total } = useBooking();

  const [sections, setSections] = useState<SeatSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchSeats(parseInt(id));
    }
  }, [id, ticketTypeId]);

  const fetchSeats = async (eventId: number) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (ticketTypeId) {
        params.ticket_type_id = parseInt(ticketTypeId);
      }

      const response = await eventAPI.getSeats(eventId, params);
      setSections(response.sections || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load seats');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seat: Seat) => {
    // Check if seat is already selected
    const isSelected = selectedSeats.some(s => s.id === seat.id);

    if (isSelected) {
      removeSeat(seat.id);
    } else {
      // Check if seat is available
      if (seat.status !== 'available') {
        return;
      }

      // Add seat
      addSeat(seat);
    }
  };

  const isSeatSelected = (seatId: number): boolean => {
    return selectedSeats.some(s => s.id === seatId);
  };

  const getSeatColor = (seat: Seat): string => {
    if (isSeatSelected(seat.id)) {
      return 'bg-purple-500 text-white border-purple-600';
    }

    switch (seat.status) {
      case 'available':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-800 cursor-pointer';
      case 'booked':
        return 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 border-gray-400 dark:border-gray-500 cursor-not-allowed';
      case 'reserved':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700 cursor-not-allowed';
      case 'blocked':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700 cursor-not-allowed';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    }
  };

  const renderCinemaSeatMap = () => {
    return (
      <div className="space-y-8">
        {/* Screen */}
        <div className="flex justify-center mb-8">
          <div className="w-3/4 h-2 bg-gray-300 dark:bg-gray-600 rounded-t-full relative">
            <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-sm text-gray-500 dark:text-gray-400">
              SCREEN
            </span>
          </div>
        </div>

        {/* Seats by Section */}
        {sections.map(section => {
          // Group seats by row
          const seatsByRow = section.seats.reduce((acc, seat) => {
            if (!acc[seat.row]) {
              acc[seat.row] = [];
            }
            acc[seat.row].push(seat);
            return acc;
          }, {} as Record<string, Seat[]>);

          return (
            <div key={section.name} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 text-center">
                {section.name}
              </h3>
              <div className="space-y-2">
                {Object.entries(seatsByRow).map(([row, seats]) => (
                  <div key={row} className="flex items-center justify-center gap-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-8">
                      {row}
                    </span>
                    <div className="flex gap-1">
                      {seats.sort((a, b) => parseInt(a.seat_number) - parseInt(b.seat_number)).map(seat => (
                        <button
                          key={seat.id}
                          onClick={() => handleSeatClick(seat)}
                          disabled={seat.status !== 'available' && !isSeatSelected(seat.id)}
                          className={`w-8 h-8 text-xs font-medium rounded border transition-colors ${getSeatColor(seat)}`}
                          title={`${seat.section} ${seat.row}${seat.seat_number} - ${seat.status}`}
                        >
                          {seat.seat_number}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderConcertSeatMap = () => {
    return (
      <div className="space-y-8">
        {/* Stage */}
        <div className="flex justify-center mb-8">
          <div className="w-2/3 bg-gradient-to-b from-purple-400 to-purple-600 dark:from-purple-600 dark:to-purple-800 rounded-lg p-4 text-center">
            <span className="text-white font-bold text-lg">STAGE</span>
          </div>
        </div>

        {/* Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map(section => (
            <div key={section.name} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 text-center">
                {section.name}
              </h3>
              <div className="grid grid-cols-5 gap-1">
                {section.seats.map(seat => (
                  <button
                    key={seat.id}
                    onClick={() => handleSeatClick(seat)}
                    disabled={seat.status !== 'available' && !isSeatSelected(seat.id)}
                    className={`w-10 h-10 text-xs font-medium rounded border transition-colors ${getSeatColor(seat)}`}
                    title={`${seat.section} ${seat.row}${seat.seat_number} - ${seat.status}`}
                  >
                    {seat.seat_number}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStadiumSeatMap = () => {
    return (
      <div className="space-y-8">
        {/* Field */}
        <div className="flex justify-center mb-8">
          <div className="w-2/3 aspect-video bg-green-600 dark:bg-green-800 rounded-lg flex items-center justify-center border-4 border-white dark:border-gray-700">
            <span className="text-white font-bold text-2xl">FIELD</span>
          </div>
        </div>

        {/* Sections arranged around field */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sections.map(section => (
            <div key={section.name} className="border border-gray-300 dark:border-gray-600 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 text-center">
                {section.name}
              </h3>
              <div className="grid grid-cols-4 gap-1">
                {section.seats.slice(0, 20).map(seat => (
                  <button
                    key={seat.id}
                    onClick={() => handleSeatClick(seat)}
                    disabled={seat.status !== 'available' && !isSeatSelected(seat.id)}
                    className={`w-8 h-8 text-xs font-medium rounded border transition-colors ${getSeatColor(seat)}`}
                    title={`${seat.section} ${seat.row}${seat.seat_number} - ${seat.status}`}
                  >
                    {seat.seat_number}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTheaterSeatMap = () => {
    return renderCinemaSeatMap(); // Similar layout to cinema
  };

  const renderSeatMap = () => {
    if (!event) return null;

    switch (event.category) {
      case 'movie':
        return renderCinemaSeatMap();
      case 'concert':
        return renderConcertSeatMap();
      case 'sports':
        return renderStadiumSeatMap();
      case 'theater':
        return renderTheaterSeatMap();
      default:
        return renderCinemaSeatMap(); // Default to cinema layout
    }
  };

  const handleProceedToCheckout = () => {
    if (selectedSeats.length === 0) {
      return;
    }
    navigate('/eventra/checkout');
  };

  if (!event || !ticketType) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please select a ticket type from the event page
          </p>
          <button
            onClick={() => navigate(`/eventra/events/${id}`)}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Back to Event
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate(`/eventra/events/${id}`)}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Back to Event
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/eventra/events/${id}`)}
            className="text-purple-600 dark:text-purple-400 hover:underline mb-4"
          >
            ← Back to Event
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Select Your Seats
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {event.name} - {ticketType.name} (₹{ticketType.price})
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Seat Map */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500 border border-purple-600 rounded"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 border border-gray-400 dark:border-gray-500 rounded"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Reserved</span>
                </div>
              </div>

              {/* Seat Map */}
              {renderSeatMap()}
            </div>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Booking Summary
              </h2>

              {selectedSeats.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No seats selected
                </p>
              ) : (
                <>
                  {/* Selected Seats */}
                  <div className="mb-4 max-h-48 overflow-y-auto">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Selected Seats ({selectedSeats.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedSeats.map(seat => (
                        <div key={seat.id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700 dark:text-gray-300">
                            {seat.section} {seat.row}{seat.seat_number}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 dark:text-white font-medium">
                              ₹{seat.price}
                            </span>
                            <button
                              onClick={() => removeSeat(seat.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        ₹{subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Tax (18%)</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        ₹{tax.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                      <span className="text-gray-900 dark:text-white">Total</span>
                      <span className="text-purple-600 dark:text-purple-400">
                        ₹{total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={handleProceedToCheckout}
                    className="w-full mt-6 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                  >
                    Proceed to Checkout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatSelectionPage;
