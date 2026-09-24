import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Armchair, Minus, Plus, X } from 'lucide-react';
import { EventraBill, EventraCard, EventraFlowHeader, EventraFlowPage, eventImage, inr, primaryButton } from '../../components/eventra/BookingFlow';
import { eventAPI } from '../../api/eventra';
import { useBooking } from '../../contexts/BookingContext';
import type { Event, Seat, TicketType } from '../../types';
import { seatCode } from '../../utils';

interface SeatSection {
  name: string;
  seats: Seat[];
}

const ZONE_BASED_CATEGORIES = new Set(['concert', 'comedy', 'expo', 'dining']);
const CINEMA_CATEGORIES = new Set(['movie', 'theater']);

const parseSortableNumber = (value: string): number => {
  const numericPart = Number(String(value || '').replace(/[^0-9]/g, ''));
  return Number.isNaN(numericPart) ? 0 : numericPart;
};

const sortSeats = (left: Seat, right: Seat): number => {
  const rowDiff = parseSortableNumber(left.row) - parseSortableNumber(right.row);
  if (rowDiff !== 0) {
    return rowDiff;
  }

  return parseSortableNumber(left.seat_number) - parseSortableNumber(right.seat_number);
};

const sortRowLabels = (left: string, right: string): number => {
  const numericDiff = parseSortableNumber(left) - parseSortableNumber(right);
  if (numericDiff !== 0) {
    return numericDiff;
  }

  return left.localeCompare(right);
};

const SeatSelectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTicketTypeIdRaw = searchParams.get('ticketType');

  const eventId = useMemo(() => {
    const parsed = Number(id);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [id]);

  const requestedTicketTypeId = useMemo(() => {
    const parsed = Number(requestedTicketTypeIdRaw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [requestedTicketTypeIdRaw]);

  const requestedTicketQuantity = useMemo(() => {
    const parsed = Number(searchParams.get('quantity'));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  }, [searchParams]);

  const {
    event: bookingEvent,
    ticketType: bookingTicketType,
    selectedSeats,
    addSeat,
    removeSeat,
    subtotal,
    tax,
    total,
    setEvent,
    setTicketType,
  } = useBooking();

  const [eventData, setEventData] = useState<Event | null>(bookingEvent);
  const [ticketTypeData, setTicketTypeData] = useState<TicketType | null>(bookingTicketType);
  const [sections, setSections] = useState<SeatSection[]>([]);
  const [activeSportsSection, setActiveSportsSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventCategory = (eventData?.category || '').toLowerCase();
  const isZoneBasedEvent = ZONE_BASED_CATEGORIES.has(eventCategory);
  const isCinemaEvent = CINEMA_CATEGORIES.has(eventCategory);
  const isSportsEvent = eventCategory === 'sports';

  const seatSectionMap = useMemo(() => {
    const nextMap = new Map<string, SeatSection>();
    sections.forEach((section) => {
      nextMap.set(section.name, section);
    });
    return nextMap;
  }, [sections]);

  const selectedZoneCounts = useMemo(() => {
    return selectedSeats.reduce((acc, seat) => {
      acc[seat.section] = (acc[seat.section] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [selectedSeats]);

  const selectedZoneEntries = useMemo(() => {
    return Object.entries(selectedZoneCounts).sort(([left], [right]) => left.localeCompare(right));
  }, [selectedZoneCounts]);

  const maxTicketSelection = ticketTypeData?.quantity_available ?? Number.MAX_SAFE_INTEGER;
  const [desiredTicketCount, setDesiredTicketCount] = useState(requestedTicketQuantity);
  const maxSelectableCount = Math.max(1, Math.min(maxTicketSelection, desiredTicketCount));
  const isSelectionComplete = selectedSeats.length === maxSelectableCount;

  useEffect(() => {
    let isMounted = true;

    const fetchEventAndSeats = async () => {
      if (!eventId) {
        setError('Invalid event ID.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const resolvedEvent =
          bookingEvent && bookingEvent.id === eventId
            ? bookingEvent
            : await eventAPI.retrieve(eventId);

        if (!isMounted) {
          return;
        }

        setEventData(resolvedEvent);
        setEvent(resolvedEvent);

        const availableTicketTypes = resolvedEvent.ticket_types || [];
        let resolvedTicketType: TicketType | null = null;

        if (requestedTicketTypeId) {
          resolvedTicketType =
            availableTicketTypes.find((ticket) => ticket.id === requestedTicketTypeId) || null;
        }

        if (!resolvedTicketType && bookingTicketType) {
          resolvedTicketType =
            availableTicketTypes.find((ticket) => ticket.id === bookingTicketType.id) || null;
        }

        if (!resolvedTicketType && availableTicketTypes.length > 0) {
          resolvedTicketType = availableTicketTypes[0];
        }

        setTicketTypeData(resolvedTicketType);
        if (resolvedTicketType) {
          setTicketType(resolvedTicketType);
        }

        const seatParams = resolvedTicketType
          ? { ticket_type_id: resolvedTicketType.id }
          : undefined;

        const seatResponse = await eventAPI.getSeats(eventId, seatParams);
        if (!isMounted) {
          return;
        }

        setSections(seatResponse.sections || []);
      } catch (err: any) {
        if (!isMounted) {
          return;
        }

        setError(err.response?.data?.detail || 'Failed to load seat map');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchEventAndSeats();

    return () => {
      isMounted = false;
    };
  }, [eventId, requestedTicketTypeId, bookingEvent, bookingTicketType, setEvent, setTicketType]);

  useEffect(() => {
    if (!isSportsEvent) {
      setActiveSportsSection(null);
      return;
    }

    const hasActiveSection =
      activeSportsSection !== null && sections.some((section) => section.name === activeSportsSection);

    if (!hasActiveSection) {
      setActiveSportsSection(sections[0]?.name ?? null);
    }
  }, [activeSportsSection, isSportsEvent, sections]);

  useEffect(() => {
    const maxAvailable = Math.max(ticketTypeData?.quantity_available ?? 1, 1);
    const normalizedRequested = Math.min(Math.max(requestedTicketQuantity, 1), maxAvailable);
    setDesiredTicketCount(normalizedRequested);
  }, [requestedTicketQuantity, ticketTypeData?.quantity_available]);

  useEffect(() => {
    if (selectedSeats.length <= maxSelectableCount) {
      return;
    }

    const overflowSeats = selectedSeats.slice(maxSelectableCount);
    overflowSeats.forEach((seat) => removeSeat(seat.id));
  }, [maxSelectableCount, removeSeat, selectedSeats]);

  const handleSeatClick = (seat: Seat) => {
    const isSelected = selectedSeats.some((selectedSeat) => selectedSeat.id === seat.id);

    if (isSelected) {
      removeSeat(seat.id);
      return;
    }

    if (seat.status !== 'available') {
      return;
    }

    if (selectedSeats.length >= maxSelectableCount) {
      return;
    }

    addSeat(seat);
  };

  const isSeatSelected = (seatId: number): boolean => {
    return selectedSeats.some((seat) => seat.id === seatId);
  };

  const getSeatClass = (seat: Seat): string => {
    if (isSeatSelected(seat.id)) {
      return 'bg-[#e8824a] text-[#0a0a0a] ring-2 ring-[#f0a070] ring-offset-1 ring-offset-[#141414]';
    }
    switch (seat.status) {
      case 'available':
        return 'bg-white/[0.06] text-white/80 ring-1 ring-inset ring-white/15 hover:bg-[#c4621a]/30 hover:ring-[#e8824a] cursor-pointer';
      case 'reserved':
        return 'bg-amber-400/15 text-amber-200/60 ring-1 ring-inset ring-amber-400/25 cursor-not-allowed';
      case 'blocked':
        return 'bg-transparent text-white/15 ring-1 ring-inset ring-white/[0.06] cursor-not-allowed';
      default:
        return 'bg-white/[0.03] text-white/20 cursor-not-allowed';
    }
  };

  const seatLabel = (seat: Seat) =>
    `${seat.section}, row ${seat.row}, seat ${seat.seat_number}, ${inr(seat.price, false)}, ${isSeatSelected(seat.id) ? 'selected' : seat.status}`;

  const SeatButton: React.FC<{ seat: Seat; size?: 'sm' | 'md' }> = ({ seat, size = 'md' }) => (
    <button
      type="button"
      onClick={() => handleSeatClick(seat)}
      disabled={seat.status !== 'available' && !isSeatSelected(seat.id)}
      aria-pressed={isSeatSelected(seat.id)}
      aria-label={seatLabel(seat)}
      title={seatLabel(seat)}
      className={`grid place-items-center rounded-md text-[10px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8824a] ${
        size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'
      } ${getSeatClass(seat)}`}
    >
      {seat.seat_number}
    </button>
  );

  const rowsOf = (seats: Seat[]) =>
    Object.entries(
      seats.reduce((acc, seat) => {
        (acc[seat.row] = acc[seat.row] || []).push(seat);
        return acc;
      }, {} as Record<string, Seat[]>)
    ).sort(([a], [b]) => sortRowLabels(a, b));

  const handleAddZonePass = (sectionName: string) => {
    if (selectedSeats.length >= maxSelectableCount) return;
    const section = seatSectionMap.get(sectionName);
    if (!section) return;
    const nextSeat = [...section.seats].sort(sortSeats).find((seat) => seat.status === 'available' && !isSeatSelected(seat.id));
    if (nextSeat) addSeat(nextSeat);
  };

  const handleRemoveZonePass = (sectionName: string) => {
    const selectedSeat = [...selectedSeats].reverse().find((seat) => seat.section === sectionName);
    if (selectedSeat) removeSeat(selectedSeat.id);
  };

  const decreaseDesiredTicketCount = () => setDesiredTicketCount((v) => Math.max(1, v - 1));
  const increaseDesiredTicketCount = () => setDesiredTicketCount((v) => Math.min(maxTicketSelection, v + 1));

  const renderRows = (seats: Seat[]) => (
    <div className="mx-auto w-max space-y-1.5">
      {rowsOf(seats).map(([row, rowSeats]) => (
        <div key={row} className="flex items-center gap-1.5">
          <span className="w-7 text-right text-[11px] font-semibold text-[#6b6b6b]">{row}</span>
          {[...rowSeats].sort(sortSeats).map((seat) => (
            <SeatButton key={seat.id} seat={seat} />
          ))}
          <span className="w-7 text-[11px] font-semibold text-[#6b6b6b]">{row}</span>
        </div>
      ))}
    </div>
  );

  const renderCinemaSeatMap = () => (
    <div className="space-y-10 overflow-x-auto pb-2">
      <div className="mx-auto w-3/4">
        <div className="h-1.5 rounded-full bg-gradient-to-r from-transparent via-[#e8824a] to-transparent opacity-80" />
        <p className="mt-2 text-center text-[11px] uppercase tracking-[0.35em] text-[#6b6b6b]">Screen this way</p>
      </div>
      {sections.map((section) => (
        <div key={section.name}>
          <p className="mb-3 text-center font-eventra-display text-lg">{section.name}</p>
          {renderRows(section.seats)}
        </div>
      ))}
    </div>
  );

  const renderSportsSeatMap = () => {
    const stands = sections.map((section) => {
      const available = section.seats.filter((seat) => seat.status === 'available').length;
      const selected = selectedZoneCounts[section.name] || 0;
      return { ...section, selected, remaining: Math.max(available - selected, 0) };
    });
    const focused = activeSportsSection ? seatSectionMap.get(activeSportsSection) : null;
    return (
      <div className="space-y-8">
        <div className="relative mx-auto h-[320px] max-w-3xl overflow-hidden rounded-2xl bg-[#101010] ring-1 ring-white/[0.06]">
          <div className="absolute left-1/2 top-1/2 h-[190px] w-[290px] -translate-x-1/2 -translate-y-1/2 rounded-[48%] border-[14px] border-[#1c1c1c] bg-[#1f6b3a] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.12)]">
            <div className="absolute left-1/2 top-1/2 h-14 w-4 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[#d9ccb8]/80" />
            <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
          </div>
          {stands.map((stand, index) => {
            const angle = (index / Math.max(stands.length, 1)) * Math.PI * 2 - Math.PI / 2;
            const active = activeSportsSection === stand.name;
            return (
              <button
                key={stand.name}
                type="button"
                onClick={() => setActiveSportsSection(stand.name)}
                aria-pressed={active}
                style={{ left: `${50 + Math.cos(angle) * 40}%`, top: `${50 + Math.sin(angle) * 32}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8824a] ${
                  active ? 'bg-[#c4621a] text-white' : 'bg-[#1a1a1a] text-[#f5f0e8] ring-1 ring-white/15 hover:ring-[#e8824a]'
                }`}
              >
                {stand.name}
                <span className={`mt-0.5 block text-[10px] font-medium ${active ? 'text-white/80' : 'text-[#9a9a9a]'}`}>
                  {stand.remaining} left{stand.selected ? ` · ${stand.selected} picked` : ''}
                </span>
              </button>
            );
          })}
        </div>
        <p className="-mt-4 text-center text-xs text-[#9a9a9a]">Pick a stand on the ground, then choose seats in it.</p>
        {focused ? (
          <div className="overflow-x-auto rounded-xl bg-black/20 p-5 ring-1 ring-white/[0.06]">
            <p className="mb-4 text-center font-eventra-display text-lg">{focused.name}</p>
            {renderRows(focused.seats)}
          </div>
        ) : (
          <p className="text-center text-sm text-[#9a9a9a]">Select a stand to see its seats.</p>
        )}
      </div>
    );
  };

  const renderZoneMap = () => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => {
        const selected = selectedZoneCounts[section.name] || 0;
        const available = section.seats.filter((seat) => seat.status === 'available').length;
        const remaining = Math.max(available - selected, 0);
        const canIncrease = remaining > 0 && selectedSeats.length < maxSelectableCount;
        const price = section.seats[0]?.price;
        return (
          <div
            key={section.name}
            className={`rounded-2xl p-5 ring-1 transition-colors ${selected ? 'bg-[#c4621a]/10 ring-[#c4621a]/60' : 'bg-black/20 ring-white/[0.08]'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-eventra-display text-xl">{section.name}</p>
                <p className="mt-0.5 text-xs text-[#9a9a9a]">{remaining > 0 ? `${remaining} passes left` : 'Sold out'}</p>
              </div>
              {price !== undefined && <p className="text-sm font-semibold text-[#f0a070] tabular-nums">{inr(price, false)}</p>}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-sm text-[#c9c3ba]">
                <span className="font-eventra-display text-2xl text-[#f5f0e8] tabular-nums">{selected}</span> selected
              </span>
              <div className="flex items-center gap-1 rounded-full p-0.5 ring-1 ring-white/15">
                <button
                  type="button"
                  onClick={() => handleRemoveZonePass(section.name)}
                  disabled={selected === 0}
                  aria-label={`One less ${section.name} pass`}
                  className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/[0.08] disabled:opacity-30"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAddZonePass(section.name)}
                  disabled={!canIncrease}
                  aria-label={`One more ${section.name} pass`}
                  className="grid h-8 w-8 place-items-center rounded-full bg-[#c4621a] text-white hover:bg-[#d8712a] disabled:bg-white/[0.06] disabled:text-white/30"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderGridSeatMap = () => (
    <div className="space-y-8">
      <div className="mx-auto w-2/3">
        <div className="h-1.5 rounded-full bg-gradient-to-r from-transparent via-[#e8824a] to-transparent opacity-80" />
        <p className="mt-2 text-center text-[11px] uppercase tracking-[0.35em] text-[#6b6b6b]">Stage</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <div key={section.name} className="overflow-x-auto rounded-xl bg-black/20 p-4 ring-1 ring-white/[0.06]">
            <p className="mb-3 text-center font-eventra-display text-lg">{section.name}</p>
            {renderRows(section.seats)}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSeatMap = () => {
    if (!eventData) return null;
    if (isCinemaEvent) return renderCinemaSeatMap();
    if (isZoneBasedEvent) return renderZoneMap();
    if (isSportsEvent) return renderSportsSeatMap();
    return renderGridSeatMap();
  };

  const handleProceedToCheckout = () => {
    if (selectedSeats.length === 0 || selectedSeats.length !== maxSelectableCount) return;
    navigate('/eventra/checkout');
  };

  const heroImage = eventImage(eventData);

  if (loading) {
    return (
      <EventraFlowPage>
        <EventraFlowHeader step={0} title="Loading seats…" image={heroImage} />
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-5 py-8 sm:px-8 lg:grid-cols-3" aria-busy="true">
          <div className="h-96 animate-pulse rounded-2xl bg-white/[0.05] lg:col-span-2" />
          <div className="h-64 animate-pulse rounded-2xl bg-white/[0.05]" />
        </div>
      </EventraFlowPage>
    );
  }

  const Empty: React.FC<{ title: string; body: string }> = ({ title, body }) => (
    <EventraFlowPage>
      <EventraFlowHeader title={title} image={heroImage} back={eventData ? { to: `/eventra/events/${eventData.id}`, label: 'Back to event' } : { to: '/eventra/events', label: 'All events' }} />
      <div className="mx-auto max-w-lg px-5 py-12 text-center sm:px-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#c4621a]/15 text-[#e8824a]">
          <Armchair className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
        </span>
        <p className="mt-5 text-[#c9c3ba]">{body}</p>
        <button
          type="button"
          onClick={() => navigate(eventData ? `/eventra/events/${eventData.id}` : '/eventra/events')}
          className="mt-6 rounded-full bg-[#c4621a] px-6 py-3 text-sm font-semibold text-white hover:bg-[#d8712a]"
        >
          {eventData ? 'Back to event' : 'Browse events'}
        </button>
      </div>
    </EventraFlowPage>
  );

  if (error) return <Empty title="Seats unavailable" body={error} />;
  if (!eventData) return null;
  if (!ticketTypeData) return <Empty title="Tickets aren't on sale yet" body="This event doesn't have any ticket tiers yet. Check back soon." />;
  if (sections.length === 0 || Number(eventData.total_seats) === 0) {
    return <Empty title="Seating opens soon" body="The organizer is still setting up the seat map for this event, so seats can't be picked yet." />;
  }

  const remainingToPick = Math.max(maxSelectableCount - selectedSeats.length, 0);

  return (
    <EventraFlowPage>
      <EventraFlowHeader
        step={0}
        image={heroImage}
        back={{ to: `/eventra/events/${eventData.id}`, label: 'Back to event' }}
        title={isZoneBasedEvent ? 'Choose your passes' : 'Pick your seats'}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-white">{eventData.name}</span>
            <span>
              {ticketTypeData.name} · {inr(ticketTypeData.price, false)} each
            </span>
          </span>
        }
        aside={
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5 ring-1 ring-white/15 backdrop-blur">
            <span className="text-sm text-white/75">Tickets</span>
            <div className="flex items-center gap-1 rounded-full p-0.5 ring-1 ring-white/20">
              <button type="button" onClick={decreaseDesiredTicketCount} disabled={desiredTicketCount <= 1} aria-label="Fewer tickets" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10 disabled:opacity-30">
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="w-7 text-center font-semibold tabular-nums" aria-live="polite">{desiredTicketCount}</span>
              <button type="button" onClick={increaseDesiredTicketCount} disabled={desiredTicketCount >= maxTicketSelection} aria-label="More tickets" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10 disabled:opacity-30">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        }
      />

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-start gap-6 px-5 py-8 sm:px-8 lg:grid-cols-3">
        <EventraCard
          className="lg:col-span-2"
          title={isZoneBasedEvent ? 'Zones' : 'Seat map'}
          action={
            !isZoneBasedEvent && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#9a9a9a]">
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-white/[0.06] ring-1 ring-inset ring-white/15" /> Available</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-[#e8824a]" /> Yours</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-white/[0.03]" /> Taken</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-amber-400/15 ring-1 ring-inset ring-amber-400/25" /> Held</span>
              </div>
            )
          }
        >
          {renderSeatMap()}
        </EventraCard>

        <div className="lg:sticky lg:top-20">
          <EventraCard title="Your booking">
            {selectedSeats.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#9a9a9a]">
                {isZoneBasedEvent ? `Add ${maxSelectableCount} ${maxSelectableCount === 1 ? 'pass' : 'passes'} from the zones.` : `Tap ${maxSelectableCount} ${maxSelectableCount === 1 ? 'seat' : 'seats'} on the map.`}
              </p>
            ) : (
              <>
                <ul className="mb-5 max-h-56 space-y-2 overflow-y-auto pr-1">
                  {isZoneBasedEvent
                    ? selectedZoneEntries.map(([zoneName, count]) => (
                        <li key={zoneName} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2 text-sm">
                          <span>
                            {zoneName} <span className="text-[#9a9a9a]">× {count}</span>
                          </span>
                          <button type="button" onClick={() => handleRemoveZonePass(zoneName)} className="rounded p-1 text-[#9a9a9a] hover:bg-white/[0.08] hover:text-white" aria-label={`Remove one ${zoneName} pass`}>
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))
                    : selectedSeats.map((seat) => (
                        <li key={seat.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2 text-sm">
                          <span className="font-mono tracking-wide text-[#f0a070]">
                            {seat.section} · {seatCode(seat.row, seat.seat_number)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums text-[#c9c3ba]">{inr(seat.price, false)}</span>
                            <button type="button" onClick={() => removeSeat(seat.id)} className="rounded p-1 text-[#9a9a9a] hover:bg-white/[0.08] hover:text-white" aria-label={`Remove seat ${seatCode(seat.row, seat.seat_number)}`}>
                              <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </span>
                        </li>
                      ))}
                </ul>
                <EventraBill subtotal={subtotal} tax={tax} total={total} />
              </>
            )}
            <button type="button" onClick={handleProceedToCheckout} disabled={!isSelectionComplete} className={`${primaryButton} mt-6`}>
              <span>{isSelectionComplete ? 'Continue to payment' : `Pick ${remainingToPick} more`}</span>
              {isSelectionComplete ? (
                <span className="inline-flex items-center gap-2 tabular-nums">
                  {inr(total)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              ) : (
                <span className="text-sm font-normal text-white/70 tabular-nums">
                  {selectedSeats.length}/{maxSelectableCount}
                </span>
              )}
            </button>
          </EventraCard>
        </div>
      </div>
    </EventraFlowPage>
  );
};

export default SeatSelectionPage;
