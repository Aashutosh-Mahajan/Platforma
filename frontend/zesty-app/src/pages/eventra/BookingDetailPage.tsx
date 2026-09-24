import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, Check, Download, MapPin, Navigation, Share2 } from 'lucide-react';
import { bookingAPI, eventAPI } from '../../api/eventra';
import { ErrorBanner, StatusPill } from '../../components/dashboard/primitives';
import { EventraBill, EventraCard, EventraFlowHeader, EventraFlowPage, eventImage, inr, primaryButton } from '../../components/eventra/BookingFlow';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { Booking, BookingSeat, Event } from '../../types';
import { seatCode } from '../../utils';

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
  const [booking, setBooking] = useState<Booking | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [ticketQRCodes, setTicketQRCodes] = useState<Record<number, string>>({});
  const [shareNote, setShareNote] = useState<string | null>(null);

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

        doc.setFillColor(250, 247, 242);
        doc.roundedRect(10, 10, 190, 277, 4, 4, 'F');

        doc.setFillColor(20, 20, 20);
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

        doc.setDrawColor(232, 130, 74);
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

        doc.setFillColor(244, 238, 228);
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
      try {
        await navigator.clipboard.writeText(shareText);
        setShareNote('Copied to clipboard');
      } catch {
        setShareNote('Copy failed, try again');
      }
      window.setTimeout(() => setShareNote(null), 2500);
    }
  };

  const heroImage = eventImage(event);

  if (loading) {
    return (
      <EventraFlowPage>
        <EventraFlowHeader title="Loading your tickets…" back={{ to: '/eventra/bookings', label: 'My bookings' }} />
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-5 py-8 sm:px-8 lg:grid-cols-3" aria-busy="true">
          <div className="h-96 animate-pulse rounded-2xl bg-white/[0.05] lg:col-span-2" />
          <div className="h-64 animate-pulse rounded-2xl bg-white/[0.05]" />
        </div>
      </EventraFlowPage>
    );
  }

  if (error && !booking) {
    return (
      <EventraFlowPage>
        <EventraFlowHeader title="We couldn't load this booking" back={{ to: '/eventra/bookings', label: 'My bookings' }} />
        <div className="mx-auto max-w-xl px-5 py-10 sm:px-8">
          <ErrorBanner world="eventra" message={error} onRetry={() => id && fetchBookingDetails(parseInt(id))} />
        </div>
      </EventraFlowPage>
    );
  }

  if (!booking) {
    return null;
  }

  const cancelled = booking.status === 'cancelled';
  const eventDate = event ? new Date(event.event_date) : null;
  const upcoming = !!eventDate && eventDate.getTime() > Date.now();
  const daysOut = eventDate ? Math.ceil((eventDate.getTime() - Date.now()) / 86_400_000) : null;
  const venue = event?.venue_name || (event as (Event & { venue_detail?: { name?: string } }) | null)?.venue_detail?.name || '';

  return (
    <EventraFlowPage>
      <EventraFlowHeader
        step={cancelled ? undefined : 2}
        image={heroImage}
        back={{ to: '/eventra/bookings', label: 'My bookings' }}
        title={booking.event_name}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden="true" /> {formatEventDateTime(event?.event_date)}
            </span>
            {venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden="true" /> {venue}
              </span>
            )}
          </span>
        }
        aside={
          <div className="flex items-center gap-3">
            <StatusPill world="eventra" status={booking.status} />
            {upcoming && !cancelled && daysOut !== null && (
              <span className="rounded-2xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 backdrop-blur">
                {daysOut <= 0 ? 'Today' : daysOut === 1 ? 'Tomorrow' : `In ${daysOut} days`}
              </span>
            )}
          </div>
        }
      />

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-start gap-6 px-5 py-8 sm:px-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {error && <ErrorBanner world="eventra" message={error} onDismiss={() => setError(null)} />}

          {cancelled && (
            <p className="rounded-2xl bg-rose-400/10 px-5 py-4 text-sm text-rose-200 ring-1 ring-inset ring-rose-400/20">
              This booking was cancelled, so these tickets are no longer valid. Refunds go back to your original payment method.
            </p>
          )}

          <EventraCard
            title={`Your ${booking.booked_seats.length === 1 ? 'ticket' : `${booking.booked_seats.length} tickets`}`}
            action={<span className="text-xs text-[#9a9a9a]">Show the QR at the entry gate</span>}
          >
            {booking.booked_seats.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#9a9a9a]">Your tickets are being prepared. Refresh in a moment.</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {booking.booked_seats.map((bookedSeat, index) => (
                  <li
                    key={bookedSeat.id}
                    className={`relative overflow-hidden rounded-2xl ring-1 ring-white/[0.08] ${cancelled ? 'opacity-50 grayscale' : ''} bg-[linear-gradient(160deg,#221812_0%,#161616_55%)]`}
                  >
                    <div className="px-5 pb-4 pt-5">
                      <div className="flex items-center justify-between text-xs text-[#9a9a9a]">
                        <span>
                          Ticket {index + 1} of {booking.booked_seats.length}
                        </span>
                        <span className="font-mono tracking-wider">{booking.booking_reference}</span>
                      </div>
                      <p className="mt-3 font-mono text-xl text-[#f0a070]">
                        {bookedSeat.seat.section} · {seatCode(bookedSeat.seat.row, bookedSeat.seat.seat_number)}
                      </p>
                      <p className="text-xs text-[#9a9a9a]">
                        {bookedSeat.seat.ticket_type_name ? `${bookedSeat.seat.ticket_type_name} · ` : ''}
                        {inr(bookedSeat.seat.price)}
                      </p>
                    </div>
                    <div className="relative border-t border-dashed border-white/15 p-5">
                      <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#141414]" aria-hidden="true" />
                      <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#141414]" aria-hidden="true" />
                      <div className="mx-auto w-fit rounded-xl bg-white p-2.5">
                        {ticketQRCodes[bookedSeat.id] ? (
                          <img src={ticketQRCodes[bookedSeat.id]} alt={`Entry QR code for ticket ${index + 1}`} className="h-36 w-36" />
                        ) : (
                          <div className="grid h-36 w-36 place-items-center text-xs text-[#6b6b6b]">Generating…</div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </EventraCard>

          {event && (
            <EventraCard title="Getting there">
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[#9a9a9a]">Venue</p>
                  <p className="mt-1 font-medium">{venue || 'To be announced'}</p>
                  {event.address && <p className="text-[#9a9a9a]">{event.address}</p>}
                  {(venue || event.address) && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue, event.address].filter(Boolean).join(', '))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 font-semibold text-[#e8824a] hover:text-[#f0a070]"
                    >
                      <Navigation className="h-4 w-4" aria-hidden="true" /> Directions
                    </a>
                  )}
                </div>
                <div>
                  <p className="text-xs text-[#9a9a9a]">Before you go</p>
                  <ul className="mt-1 space-y-1 text-[#c9c3ba]">
                    <li>Carry a photo ID</li>
                    <li>Each QR code scans once</li>
                    <li>Arrive 30 minutes early</li>
                  </ul>
                </div>
              </div>
            </EventraCard>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-20">
          <EventraCard title="Payment">
            <EventraBill subtotal={booking.subtotal} tax={booking.tax} total={booking.total} />
            <p className="mt-4 text-xs text-[#6b6b6b]">
              Booked {new Date(booking.booking_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </EventraCard>

          <div className="space-y-3">
            <button type="button" onClick={handleDownloadBooking} disabled={downloadingPdf || cancelled || booking.booked_seats.length === 0} className={primaryButton}>
              <span>{downloadingPdf ? 'Preparing PDF…' : 'Download tickets (PDF)'}</span>
              <Download className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleShareBooking}
              className="inline-flex w-full items-center justify-between rounded-full border border-white/15 px-6 py-3.5 text-[15px] font-semibold transition-colors hover:bg-white/[0.06]"
            >
              <span>{shareNote ?? 'Share booking'}</span>
              {shareNote ? <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
            </button>
            {event && canCancelBooking(booking.status, event.event_date) && (
              <div className="rounded-2xl border border-white/[0.08] p-4 text-center">
                <button type="button" onClick={handleCancelBooking} disabled={cancelling} className="w-full rounded-full px-4 py-2.5 text-sm font-semibold text-rose-300 ring-1 ring-rose-400/30 transition-colors hover:bg-rose-400/10 disabled:opacity-50">
                  {cancelling ? 'Cancelling…' : 'Cancel booking'}
                </button>
                <p className="mt-2 text-xs text-[#6b6b6b]">Free cancellation until 24 hours before the event.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </EventraFlowPage>
  );
};

export default BookingDetailPage;
