import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Armchair, CalendarDays, CalendarPlus, Check, Clock, MapPin, Minus, Navigation, Plus, Star, Ticket,
} from 'lucide-react';
import { eventAPI, bookingAPI } from '../../api/eventra';
import { useBooking } from '../../contexts/BookingContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Event, TicketType, EventReview } from '../../types';

const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setEvent, setTicketType } = useBooking();
  const { isAuthenticated } = useAuth();

  const [event, setEventData] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [reviews, setReviews] = useState<EventReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasConfirmedBooking, setHasConfirmedBooking] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [ticketSelections, setTicketSelections] = useState<Record<number, number>>({});

  useEffect(() => {
    const eventId = Number(id);
    if (Number.isInteger(eventId) && eventId > 0) {
      fetchEventData(eventId);
      if (isAuthenticated) {
        checkUserBooking(eventId);
      }
    } else {
      setError('Invalid event ID');
      setLoading(false);
    }
  }, [id, isAuthenticated]);

  const fetchEventData = async (eventId: number) => {
    try {
      setLoading(true);
      setError(null);

      const [eventData, reviewsData] = await Promise.all([
        eventAPI.retrieve(eventId),
        eventAPI.getReviews(eventId),
      ]);

      setEventData(eventData);
      setTicketTypes(eventData.ticket_types || []);
      setReviews(reviewsData.results);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketTypes.length === 0) {
      setTicketSelections({});
      return;
    }

    setTicketSelections((previousSelections) => {
      const nextSelections: Record<number, number> = {};

      ticketTypes.forEach((ticketType) => {
        const previousCount = previousSelections[ticketType.id] ?? 1;
        const maxSelectable = Math.max(ticketType.quantity_available, 1);
        nextSelections[ticketType.id] = Math.min(Math.max(previousCount, 1), maxSelectable);
      });

      return nextSelections;
    });
  }, [ticketTypes]);

  const checkUserBooking = async (eventId: number) => {
    try {
      const bookingsResponse = await bookingAPI.list();
      const confirmedBooking = bookingsResponse.results.find(
        booking => booking.event === eventId && booking.status === 'confirmed'
      );
      setHasConfirmedBooking(!!confirmedBooking);
    } catch (err) {
      console.log('Could not check user bookings');
    }
  };

  const handleSubmitReview = async () => {
    const eventId = Number(id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);

    try {
      const newReview = await eventAPI.createReview(eventId, {
        rating: reviewRating,
        comment: reviewComment,
      });

      // Add new review to the list
      setReviews([newReview, ...reviews]);
      
      // Reset form
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewComment('');
      
      // Refresh event data to update rating
      fetchEventData(eventId);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message ||
                          'Failed to submit review';
      
      // Handle unique constraint error
      if (errorMessage.includes('already reviewed') || errorMessage.includes('unique')) {
        setReviewError('You have already reviewed this event');
      } else {
        setReviewError(errorMessage);
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const updateTicketSelection = (ticketTypeId: number, maxAvailable: number, delta: number) => {
    const safeMax = Math.max(maxAvailable, 1);
    setTicketSelections((previousSelections) => {
      const current = previousSelections[ticketTypeId] ?? 1;
      const next = Math.min(Math.max(current + delta, 1), safeMax);
      return {
        ...previousSelections,
        [ticketTypeId]: next,
      };
    });
  };

  const handleBookTickets = (ticketType: TicketType, requestedQuantity: number) => {
    if (!event) return;

    const seatsUrl = `/eventra/events/${id}/seats?ticketType=${ticketType.id}&quantity=${requestedQuantity}&category=${encodeURIComponent(event.category)}`;

    if (!isAuthenticated) {
      // Send the user back to their actual destination (seat selection,
      // with the ticket type/quantity they already picked) after login —
      // not to this event detail page, which would lose that selection
      // and make them choose again. SeatSelectionPage reads ticketType/
      // quantity from the URL itself, so this works without needing
      // BookingContext to be pre-populated first.
      navigate('/login', { state: { from: seatsUrl } });
      return;
    }

    // Set booking context
    setEvent(event);
    setTicketType(ticketType);

    // Navigate to seat selection
    navigate(seatsUrl);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });

  const CATEGORY_IMAGES: Record<string, string> = {
    movie: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=2000&q=80',
    concert: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=2000&q=80',
    sports: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=2000&q=80',
    theater: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=2000&q=80',
    comedy: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=2000&q=80',
    expo: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=2000&q=80',
    dining: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=2000&q=80',
  };
  const inr = (v: unknown) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v) || 0);

  const page = 'min-h-screen bg-[#0a0a0a] font-eventra-body text-[#f5f0e8] selection:bg-[#c4621a]/40';

  if (loading) {
    return (
      <div className={page} aria-busy="true">
        <div className="h-[420px] animate-pulse bg-white/[0.04]" />
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="h-6 w-2/3 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-4 w-full animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-white/[0.05]" />
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-white/[0.05]" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className={`${page} flex items-center justify-center px-5`}>
        <div className="max-w-md text-center">
          <p className="font-eventra-display text-3xl">We couldn't find that event</p>
          <p className="mt-3 text-sm text-[#9a9a9a]">{error || 'It may have been removed or the link is wrong.'}</p>
          <button
            type="button"
            onClick={() => navigate('/eventra/events')}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#c4621a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d8712a]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Browse events
          </button>
        </div>
      </div>
    );
  }

  const start = new Date(event.event_date);
  const end = event.event_end_date ? new Date(event.event_end_date) : null;
  const validStart = !Number.isNaN(start.getTime());
  const isPast = validStart && start.getTime() < Date.now();
  const noSeatsYet = Number(event.total_seats) === 0;
  const soldOut = !noSeatsYet && Number(event.available_seats) === 0;
  const venue = event.venue_name || (event as Event & { venue_detail?: { name?: string } }).venue_detail?.name || '';
  const image = event.banner || event.image || CATEGORY_IMAGES[event.category] || CATEGORY_IMAGES.concert;
  const soldPct = !noSeatsYet ? Math.round(((event.total_seats - event.available_seats) / event.total_seats) * 100) : 0;
  const fromPrice = ticketTypes.length ? Math.min(...ticketTypes.map((t) => Number(t.price) || 0)) : null;

  const calendarUrl = validStart
    ? (() => {
        const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const finish = end && !Number.isNaN(end.getTime()) ? end : new Date(start.getTime() + 3 * 3600_000);
        const params = new URLSearchParams({
          action: 'TEMPLATE',
          text: event.name,
          dates: `${fmt(start)}/${fmt(finish)}`,
          details: event.description?.slice(0, 500) ?? '',
          location: [venue, event.address].filter(Boolean).join(', '),
        });
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
      })()
    : null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue, event.address].filter(Boolean).join(', '))}`;

  const bookingClosed = event.is_cancelled || isPast;

  return (
    <div className={page}>
      {/* Hero */}
      <header className="relative isolate overflow-hidden">
        <img src={image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_35%]" />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(10,10,10,0.35)_0%,rgba(10,10,10,0.7)_55%,#0a0a0a_100%),linear-gradient(90deg,rgba(10,10,10,0.85)_0%,rgba(10,10,10,0)_70%)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-8 lg:pb-16">
          <Link to="/eventra/events" className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All events
          </Link>
          <div className="mt-24 max-w-3xl lg:mt-32">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-semibold capitalize text-[#e8824a] backdrop-blur">{event.event_type_label || event.category}</span>
              {event.is_cancelled && <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-200">Cancelled</span>}
              {!event.is_cancelled && isPast && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">This event has ended</span>}
              {!event.is_cancelled && !isPast && soldOut && <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-200">Sold out</span>}
            </div>
            <h1 className="mt-4 font-eventra-display text-4xl font-medium leading-[1.05] sm:text-6xl">{event.name}</h1>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
              {validStart && (
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#e8824a]" aria-hidden="true" />
                  {start.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {validStart && (
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#e8824a]" aria-hidden="true" />
                  {start.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                  {end && !Number.isNaN(end.getTime()) && <> – {end.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</>}
                </span>
              )}
              {venue && (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#e8824a]" aria-hidden="true" />
                  {venue}
                </span>
              )}
              <span className="inline-flex items-center gap-2">
                <Star className="h-4 w-4 fill-[#e8824a] text-[#e8824a]" aria-hidden="true" />
                {event.review_count > 0 ? `${Number(event.rating).toFixed(1)} · ${event.review_count} reviews` : 'New · no reviews yet'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 pb-20 sm:px-8 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2 className="font-eventra-display text-2xl">About this event</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-[#c9c3ba]">{event.description || 'The organizer hasn’t added a description yet.'}</p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-5">
              <p className="text-xs font-semibold text-[#9a9a9a]">Venue</p>
              <p className="mt-1 font-medium">{venue || 'To be announced'}</p>
              {event.address && <p className="mt-0.5 text-sm text-[#9a9a9a]">{event.address}</p>}
              {(venue || event.address) && (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#e8824a] hover:text-[#f0a070]">
                  <Navigation className="h-4 w-4" aria-hidden="true" /> Get directions
                </a>
              )}
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-5">
              <p className="text-xs font-semibold text-[#9a9a9a]">When</p>
              <p className="mt-1 font-medium">{validStart ? formatDate(event.event_date) : 'Date to be announced'}</p>
              {!isPast && validStart && (
                <p className="mt-0.5 text-sm text-[#9a9a9a]">
                  {Math.max(0, Math.ceil((start.getTime() - Date.now()) / 86_400_000))} days to go
                </p>
              )}
              {calendarUrl && !isPast && (
                <a href={calendarUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#e8824a] hover:text-[#f0a070]">
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Add to Google Calendar
                </a>
              )}
            </div>
          </section>

          {/* Reviews */}
          <section className="rounded-2xl border border-white/[0.07] bg-[#141414] p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-eventra-display text-2xl">Reviews</h2>
                <p className="mt-1 text-sm text-[#9a9a9a]">
                  {event.review_count > 0 ? `${Number(event.rating).toFixed(1)} average from ${event.review_count} reviews` : 'Only people who attended can review.'}
                </p>
              </div>
              {isAuthenticated && hasConfirmedBooking && !showReviewForm && (
                <button type="button" onClick={() => setShowReviewForm(true)} className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/[0.06]">
                  Write a review
                </button>
              )}
            </div>

            {showReviewForm && (
              <div className="mt-5 space-y-4 rounded-xl bg-white/[0.03] p-5">
                <div>
                  <p className="mb-2 text-sm font-semibold">Your rating</p>
                  <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={star === reviewRating}
                        aria-label={`${star} star${star > 1 ? 's' : ''}`}
                        onClick={() => setReviewRating(star)}
                        className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8824a]"
                      >
                        <Star className={`h-7 w-7 ${star <= reviewRating ? 'fill-[#e8824a] text-[#e8824a]' : 'text-white/20'}`} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Comment <span className="font-normal text-[#9a9a9a]">(optional)</span></span>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="What was it like?"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#0e0e0e] px-3.5 py-2.5 text-sm text-[#f5f0e8] placeholder:text-white/30 focus:border-[#e8824a] focus:outline-none focus:ring-2 focus:ring-[#c4621a]/30"
                  />
                </label>
                {reviewError && <p role="alert" className="text-sm text-rose-300">{reviewError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={handleSubmitReview} disabled={submittingReview} className="rounded-full bg-[#c4621a] px-5 py-2 text-sm font-semibold text-white hover:bg-[#d8712a] disabled:opacity-50">
                    {submittingReview ? 'Posting…' : 'Post review'}
                  </button>
                  <button type="button" onClick={() => { setShowReviewForm(false); setReviewError(null); }} className="rounded-full px-4 py-2 text-sm font-semibold text-[#c9c3ba] hover:bg-white/[0.06]">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {reviews.length > 0 ? (
              <ul className="mt-5 divide-y divide-white/[0.07]">
                {reviews.slice(0, 6).map((review) => (
                  <li key={review.id} className="py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{review.user_name}</span>
                      <span className="inline-flex items-center gap-0.5" aria-label={`${review.rating} out of 5`}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? 'fill-[#e8824a] text-[#e8824a]' : 'text-white/15'}`} aria-hidden="true" />
                        ))}
                      </span>
                    </div>
                    {review.comment && <p className="mt-2 text-sm leading-relaxed text-[#c9c3ba]">{review.comment}</p>}
                    <p className="mt-1 text-xs text-[#6b6b6b]">{new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </li>
                ))}
              </ul>
            ) : (
              !showReviewForm && <p className="mt-5 text-sm text-[#9a9a9a]">No reviews yet.</p>
            )}
          </section>
        </div>

        {/* Booking panel */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141414] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] lg:-mt-28">
            <div className="border-b border-white/[0.07] px-6 py-5">
              <p className="text-sm text-[#9a9a9a]">{fromPrice !== null ? 'Tickets from' : 'Tickets'}</p>
              <p className="font-eventra-display text-3xl">{fromPrice !== null ? inr(fromPrice) : '—'}</p>
              {!noSeatsYet && !bookingClosed && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-[#9a9a9a]">
                    <span>{event.available_seats} of {event.total_seats} seats left</span>
                    <span>{soldPct}% sold</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-[#e8824a]" style={{ width: `${soldPct}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6">
              {event.is_cancelled ? (
                <p className="rounded-xl bg-rose-400/10 px-4 py-3 text-sm text-rose-200">This event was cancelled. Any bookings are refunded automatically.</p>
              ) : isPast ? (
                <p className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-[#c9c3ba]">This event has already happened.</p>
              ) : noSeatsYet ? (
                <div className="rounded-xl bg-white/[0.04] px-4 py-4 text-sm text-[#c9c3ba]">
                  <p className="flex items-center gap-2 font-semibold text-[#f5f0e8]"><Armchair className="h-4 w-4 text-[#e8824a]" aria-hidden="true" /> Seating opens soon</p>
                  <p className="mt-1">The organizer is still setting up the seat map. Check back shortly.</p>
                </div>
              ) : soldOut ? (
                <p className="rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-amber-200">Every seat is taken.</p>
              ) : ticketTypes.length === 0 ? (
                <p className="text-sm text-[#9a9a9a]">Tickets aren't on sale yet.</p>
              ) : (
                <ul className="space-y-3">
                  {ticketTypes.map((ticketType) => {
                    const qty = ticketSelections[ticketType.id] ?? 1;
                    const available = ticketType.quantity_available;
                    const perks = (ticketType.benefits || '').split(/[,\n]/).map((p) => p.trim()).filter(Boolean);
                    return (
                      <li key={ticketType.id} className="rounded-xl border border-white/[0.08] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{ticketType.name}</p>
                            {ticketType.description && <p className="mt-0.5 text-xs text-[#9a9a9a]">{ticketType.description}</p>}
                          </div>
                          <p className="font-eventra-display text-xl text-[#e8824a]">{inr(ticketType.price)}</p>
                        </div>
                        {perks.length > 0 && (
                          <ul className="mt-2 space-y-1 text-xs text-[#c9c3ba]">
                            {perks.map((perk) => (
                              <li key={perk} className="flex gap-1.5"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#e8824a]" aria-hidden="true" />{perk}</li>
                            ))}
                          </ul>
                        )}
                        {available > 0 ? (
                          <>
                            <div className="mt-4 flex items-center justify-between">
                              <span className="text-xs text-[#9a9a9a]">{available <= 10 ? `Only ${available} left` : `${available} available`}</span>
                              <div className="flex items-center gap-1 rounded-full border border-white/10 p-0.5">
                                <button type="button" aria-label="Fewer tickets" onClick={() => updateTicketSelection(ticketType.id, available, -1)} disabled={qty <= 1} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/[0.08] disabled:opacity-30">
                                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                                <span className="w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">{qty}</span>
                                <button type="button" aria-label="More tickets" onClick={() => updateTicketSelection(ticketType.id, available, 1)} disabled={qty >= available} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/[0.08] disabled:opacity-30">
                                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleBookTickets(ticketType, qty)}
                              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#c4621a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d8712a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8824a]"
                            >
                              <Ticket className="h-4 w-4" aria-hidden="true" />
                              Choose {qty} seat{qty > 1 ? 's' : ''} · {inr(Number(ticketType.price) * qty)}
                            </button>
                          </>
                        ) : (
                          <p className="mt-3 text-sm font-semibold text-rose-300">This tier is sold out</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {!isAuthenticated && !bookingClosed && !noSeatsYet && ticketTypes.length > 0 && (
                <p className="mt-4 text-center text-xs text-[#9a9a9a]">You'll sign in before picking seats. Your selection is kept.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EventDetailPage;
