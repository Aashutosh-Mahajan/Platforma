import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, CheckCircle2, CreditCard, Landmark, Lock, MapPin, Smartphone, Wallet } from 'lucide-react';
import { EventraBill, EventraCard, EventraFlowHeader, EventraFlowPage, eventImage, inr, primaryButton } from '../../components/eventra/BookingFlow';
import { useBooking } from '../../contexts/BookingContext';
import { useAuth } from '../../contexts/AuthContext';
import { bookingAPI } from '../../api/eventra';
import type { Booking } from '../../types';
import { seatCode } from '../../utils';

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
      // Defense-in-depth only — ProtectedRoute already gates this route
      // and carries its own `from` state, so this should be unreachable
      // in normal operation. Kept consistent with it regardless.
      navigate('/login', { state: { from: '/eventra/checkout' } });
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

  const heroImage = eventImage(event);
  const when = new Date(event.event_date);
  const whenText = Number.isNaN(when.getTime())
    ? 'Date to be announced'
    : when.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const venue = event.venue_name || (event as typeof event & { venue_detail?: { name?: string } }).venue_detail?.name || '';
  const seatsUrl = `/eventra/events/${event.id}/seats?ticketType=${ticketType.id}&quantity=${selectedSeats.length || 1}`;

  if (confirmedBooking) {
    return (
      <EventraFlowPage>
        <EventraFlowHeader
          step={2}
          image={heroImage}
          title={<>You're going<span className="text-[#e8824a]">.</span></>}
          subtitle={<>Booking confirmed for <span className="font-semibold text-white">{confirmedBooking.event_name}</span>. Your tickets are ready.</>}
        />
        <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
          <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[linear-gradient(150deg,#221812_0%,#141414_60%)]">
            <div className="flex flex-wrap items-start justify-between gap-4 px-7 py-6">
              <div>
                <p className="text-xs text-[#9a9a9a]">Booking reference</p>
                <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.12em] text-[#f0a070]">{confirmedBooking.booking_reference}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Confirmed
              </span>
            </div>
            <div className="relative border-t border-dashed border-white/15 px-7 py-6">
              <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#0a0a0a]" aria-hidden="true" />
              <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#0a0a0a]" aria-hidden="true" />
              <p className="font-eventra-display text-2xl">{confirmedBooking.event_name}</p>
              <p className="mt-1 text-sm text-[#9a9a9a]">
                {whenText}
                {venue ? ` · ${venue}` : ''}
              </p>
              {confirmedBooking.booked_seats.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {confirmedBooking.booked_seats.map((bs) => (
                    <span key={bs.id} className="rounded-lg bg-white/[0.05] px-2.5 py-1.5 font-mono text-sm text-[#f0a070] ring-1 ring-inset ring-white/[0.08]">
                      {bs.seat.section} · {seatCode(bs.seat.row, bs.seat.seat_number)}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-6 flex items-baseline justify-between border-t border-white/[0.07] pt-4">
                <span className="text-sm text-[#9a9a9a]">
                  {confirmedBooking.total_tickets} {confirmedBooking.total_tickets === 1 ? 'ticket' : 'tickets'} · incl. taxes
                </span>
                <span className="font-eventra-display text-2xl tabular-nums">{inr(confirmedBooking.total)}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                clearBooking();
                navigate(`/eventra/bookings/${confirmedBooking.id}`);
              }}
              className={primaryButton}
            >
              <span>View tickets & QR codes</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                clearBooking();
                navigate('/eventra/events');
              }}
              className="rounded-full border border-white/15 px-6 py-3.5 text-[15px] font-semibold transition-colors hover:bg-white/[0.06]"
            >
              Find another event
            </button>
          </div>
        </div>
      </EventraFlowPage>
    );
  }

  const PAYMENT_METHODS = [
    { value: 'credit_card', label: 'Credit card', icon: CreditCard },
    { value: 'debit_card', label: 'Debit card', icon: CreditCard },
    { value: 'upi', label: 'UPI', icon: Smartphone },
    { value: 'wallet', label: 'Wallet', icon: Wallet },
    { value: 'net_banking', label: 'Net banking', icon: Landmark },
  ];

  return (
    <EventraFlowPage>
      <EventraFlowHeader
        step={1}
        image={heroImage}
        back={{ to: seatsUrl, label: 'Change seats' }}
        title="Review & pay"
        subtitle={<><span className="font-semibold text-white">{event.name}</span> · {whenText}</>}
      />

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-start gap-6 px-5 py-8 sm:px-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <EventraCard title="Your tickets">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{ticketType.name}</p>
                <p className="text-sm text-[#9a9a9a]">
                  {inr(ticketType.price, false)} each · {selectedSeats.length} {selectedSeats.length === 1 ? 'ticket' : 'tickets'}
                </p>
              </div>
              <Link to={seatsUrl} className="text-sm font-semibold text-[#e8824a] hover:text-[#f0a070]">
                Change
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {isZoneBasedEvent
                ? Object.entries(zoneSummary)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([zoneName, count]) => (
                      <span key={zoneName} className="rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-sm ring-1 ring-inset ring-white/[0.08]">
                        {zoneName} <span className="text-[#9a9a9a]">× {count}</span>
                      </span>
                    ))
                : selectedSeats.map((seat) => (
                    <span key={seat.id} className="rounded-lg bg-white/[0.05] px-2.5 py-1.5 font-mono text-sm text-[#f0a070] ring-1 ring-inset ring-white/[0.08]">
                      {seat.section} · {seatCode(seat.row, seat.seat_number)}
                    </span>
                  ))}
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-white/[0.07] pt-4 text-sm text-[#9a9a9a]">
              <MapPin className="h-4 w-4 shrink-0 text-[#e8824a]" aria-hidden="true" />
              {venue || 'Venue to be announced'}
              {event.address ? ` · ${event.address}` : ''}
            </div>
          </EventraCard>

          <EventraCard title="Payment">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Payment method">
              {PAYMENT_METHODS.map((method) => {
                const selected = paymentMethod === method.value;
                const Icon = method.icon;
                return (
                  <label
                    key={method.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3.5 ring-1 transition-colors focus-within:ring-2 focus-within:ring-[#e8824a] ${
                      selected ? 'bg-[#c4621a]/12 ring-[#c4621a]' : 'ring-white/10 hover:ring-white/25'
                    }`}
                  >
                    <input type="radio" name="payment" value={method.value} checked={selected} onChange={(e) => setPaymentMethod(e.target.value)} className="sr-only" />
                    <Icon className={`h-5 w-5 ${selected ? 'text-[#e8824a]' : 'text-[#6b6b6b]'}`} aria-hidden="true" />
                    <span className="text-sm font-semibold">{method.label}</span>
                    {selected && <Check className="ml-auto h-4 w-4 text-[#e8824a]" aria-hidden="true" />}
                  </label>
                );
              })}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-[#6b6b6b]">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Payments are simulated in this environment; no money moves.
            </p>
          </EventraCard>
        </div>

        <div className="lg:sticky lg:top-20">
          <EventraCard title="Summary">
            <EventraBill subtotal={subtotal} tax={tax} total={total} />
            {error && (
              <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-rose-400/10 px-3.5 py-3 text-sm text-rose-200 ring-1 ring-inset ring-rose-400/20">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
              </p>
            )}
            <button type="button" onClick={handleConfirmBooking} disabled={loading} aria-busy={loading} className={`${primaryButton} mt-6`}>
              <span>{loading ? 'Confirming…' : 'Pay & confirm'}</span>
              <span className="inline-flex items-center gap-2 tabular-nums">
                {inr(total)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
            <p className="mt-3 text-center text-xs text-[#6b6b6b]">Seats are held for you while you check out.</p>
          </EventraCard>
        </div>
      </div>
    </EventraFlowPage>
  );
};

export default BookingCheckoutPage;
