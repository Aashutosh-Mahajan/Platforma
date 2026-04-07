import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingAPI, eventAPI } from '../../api/eventra';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ErrorMessage } from '../../components/shared/ErrorMessage';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { Booking, BookingSeat, Event } from '../../types';

const formatEventDateTime = (value?: string): string => {
  if (!value) {
    return 'Date and time to be announced';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Date and time to be announced';
  }

  return parsed.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getSeatLabel = (bookedSeat: BookingSeat): string => {
  const seat = bookedSeat.seat;
  const rowLabel = seat.row ? `Row ${seat.row}` : '';
  const seatLabel = seat.seat_number ? `Seat ${seat.seat_number}` : '';
  const detail = [rowLabel, seatLabel].filter(Boolean).join(' • ');

  if (!detail) {
    return seat.section;
  }

  return `${seat.section} • ${detail}`;
};

const buildTicketQrPayload = (
  booking: Booking,
  event: Event | null,
  bookedSeat: BookingSeat,
  ticketNumber: number
): string => {
  return JSON.stringify({
    platform: 'Platforma Eventra',
    bookingReference: booking.booking_reference,
    ticketNumber,
    eventId: booking.event,
    eventName: booking.event_name,
    eventDate: event?.event_date || null,
    seatId: bookedSeat.seat.id,
    section: bookedSeat.seat.section,
    row: bookedSeat.seat.row,
    seatNumber: bookedSeat.seat.seat_number,
    price: bookedSeat.seat.price,
  });
};

const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [ticketQRCodes, setTicketQRCodes] = useState<Record<number, string>>({});

  useEffect(() => {
    if (id) {
      fetchBookingDetails(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    let isCancelled = false;

    const generateTicketQRCodes = async () => {
      if (!booking || booking.booked_seats.length === 0) {
        setTicketQRCodes({});
        return;
      }

      try {
        const generated = await Promise.all(
          booking.booked_seats.map(async (bookedSeat, index) => {
            const qrPayload = buildTicketQrPayload(booking, event, bookedSeat, index + 1);
            const dataUrl = await QRCode.toDataURL(qrPayload, {
              width: 220,
              margin: 1,
              errorCorrectionLevel: 'M',
              color: {
                dark: '#111827',
                light: '#FFFFFF',
              },
            });

            return [bookedSeat.id, dataUrl] as const;
          })
        );

        if (!isCancelled) {
          setTicketQRCodes(Object.fromEntries(generated));
        }
      } catch (qrError) {
        console.error('Failed to generate ticket QR codes', qrError);
        if (!isCancelled) {
          setTicketQRCodes({});
        }
      }
    };

    generateTicketQRCodes();

    return () => {
      isCancelled = true;
    };
  }, [booking, event]);

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

  const handleDownloadBooking = async () => {
    if (!booking || booking.booked_seats.length === 0) {
      return;
    }

    setDownloadingPdf(true);
    setError(null);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const generatedOn = new Date().toLocaleString('en-IN');
      const eventName = event?.name || booking.event_name;
      const eventVenue = event?.venue_name || 'Venue information unavailable';
      const eventDate = formatEventDateTime(event?.event_date);

      for (let index = 0; index < booking.booked_seats.length; index += 1) {
        if (index > 0) {
          doc.addPage();
        }

        const bookedSeat = booking.booked_seats[index];
        const qrPayload = buildTicketQrPayload(booking, event, bookedSeat, index + 1);
        const qrDataUrl =
          ticketQRCodes[bookedSeat.id] ||
          (await QRCode.toDataURL(qrPayload, {
            width: 220,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#111827',
              light: '#FFFFFF',
            },
          }));

        doc.setFillColor(245, 243, 255);
        doc.roundedRect(10, 10, 190, 277, 4, 4, 'F');

        doc.setFillColor(124, 58, 237);
        doc.roundedRect(10, 10, 190, 30, 4, 4, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('Eventra Ticket', 18, 24);
        doc.setFontSize(11);
        doc.text(`Booking #${booking.booking_reference}`, 18, 32);

        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(eventName, 18, 54, { maxWidth: 112 });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(`Ticket ${index + 1} of ${booking.booked_seats.length}`, 18, 66);
        doc.text(`Venue: ${eventVenue}`, 18, 74, { maxWidth: 112 });
        doc.text(`Date: ${eventDate}`, 18, 82, { maxWidth: 112 });
        doc.text(`Seat/Pass: ${getSeatLabel(bookedSeat)}`, 18, 90, { maxWidth: 112 });
        doc.text(`Price: INR ${bookedSeat.seat.price.toFixed(2)}`, 18, 98);
        doc.text(`Status: ${formatStatus(booking.status)}`, 18, 106);

        doc.setFillColor(255, 255, 255);
        doc.roundedRect(136, 52, 54, 54, 3, 3, 'F');
        doc.addImage(qrDataUrl, 'PNG', 141, 57, 44, 44, undefined, 'FAST');
        doc.setFontSize(8);
        doc.setTextColor(75, 85, 99);
        doc.text('Scan this QR at entry', 163, 110, { align: 'center' });

        doc.setDrawColor(196, 181, 253);
        doc.line(18, 118, 192, 118);

        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Entry Instructions', 18, 128);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('1. Bring a valid photo ID along with this ticket.', 18, 136);
        doc.text('2. Each QR code is unique and can be scanned only once.', 18, 144);
        doc.text('3. Reach the venue at least 30 minutes before start time.', 18, 152);
        doc.text('4. Digital or printed copy of this PDF is accepted.', 18, 160);

        doc.setFillColor(237, 233, 254);
        doc.roundedRect(18, 238, 174, 36, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Order Summary', 24, 248);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Total Tickets: ${booking.total_tickets}`, 24, 256);
        doc.text(`Subtotal: INR ${booking.subtotal.toFixed(2)}`, 24, 262);
        doc.text(`Grand Total: INR ${booking.total.toFixed(2)}`, 24, 268);
        doc.text(`Generated: ${generatedOn}`, 188, 268, { align: 'right' });
      }

      doc.save(`tickets-${booking.booking_reference}.pdf`);
    } catch (downloadError) {
      console.error('Failed to download booking PDF', downloadError);
      setError('Failed to download ticket PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
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

        {/* Ticket Cards */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            Your Tickets
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-5">
            One ticket is generated for each seat/pass. Show the QR at venue entry.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {booking.booked_seats.map((bookedSeat, index) => (
              <div
                key={bookedSeat.id}
                className="rounded-lg border border-purple-200 bg-purple-50/70 p-4 dark:border-purple-800 dark:bg-purple-900/20"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Ticket {index + 1}</p>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-purple-700 dark:bg-gray-900 dark:text-purple-300">
                    {booking.booking_reference}
                  </span>
                </div>

                <p className="text-sm font-semibold text-gray-900 dark:text-white">{booking.event_name}</p>
                <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">{getSeatLabel(bookedSeat)}</p>
                <p className="text-xs text-gray-700 dark:text-gray-300">INR {bookedSeat.seat.price.toFixed(2)}</p>

                <div className="mt-3 rounded-md border border-dashed border-purple-300 bg-white p-3 dark:border-purple-700 dark:bg-gray-900">
                  {ticketQRCodes[bookedSeat.id] ? (
                    <img
                      src={ticketQRCodes[bookedSeat.id]}
                      alt={`QR code for ticket ${index + 1}`}
                      className="mx-auto h-40 w-40 rounded"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                      Generating QR code...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-4">
            Keep this page or your PDF ticket ready for smooth check-in.
          </p>
        </div>

        {/* Booking Reference */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            Booking Reference
          </h2>
          <div className="flex flex-col items-center">
            <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-500 rounded-lg p-8 mb-4">
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 text-center tracking-wider">
                {booking.booking_reference}
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Share this reference with support for any booking assistance.
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
              disabled={downloadingPdf}
              className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
            >
              {downloadingPdf ? 'Preparing PDF...' : '📥 Download Tickets (PDF)'}
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
