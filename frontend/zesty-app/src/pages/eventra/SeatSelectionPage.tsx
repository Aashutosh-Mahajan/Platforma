import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { eventAPI } from '../../api/eventra';
import { useBooking } from '../../contexts/BookingContext';
import type { Event, Seat, TicketType } from '../../types';

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

  const handleAddZonePass = (sectionName: string) => {
    if (selectedSeats.length >= maxSelectableCount) {
      return;
    }

    const section = seatSectionMap.get(sectionName);
    if (!section) {
      return;
    }

    const nextSeat = [...section.seats]
      .sort(sortSeats)
      .find((seat) => seat.status === 'available' && !isSeatSelected(seat.id));

    if (!nextSeat) {
      return;
    }

    addSeat(nextSeat);
  };

  const handleRemoveZonePass = (sectionName: string) => {
    const selectedSeat = [...selectedSeats]
      .reverse()
      .find((seat) => seat.section === sectionName);

    if (!selectedSeat) {
      return;
    }

    removeSeat(selectedSeat.id);
  };

  const decreaseDesiredTicketCount = () => {
    setDesiredTicketCount((previousValue) => Math.max(1, previousValue - 1));
  };

  const increaseDesiredTicketCount = () => {
    setDesiredTicketCount((previousValue) => Math.min(maxTicketSelection, previousValue + 1));
  };

  const renderCinemaSeatMap = () => {
    return (
      <div className="space-y-8">
        <div className="mb-8 flex justify-center">
          <div className="relative h-2 w-3/4 rounded-t-full bg-gray-300 dark:bg-gray-600">
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-sm text-gray-500 dark:text-gray-400">SCREEN</span>
          </div>
        </div>

        {sections.map((section) => {
          const seatsByRow = section.seats.reduce((acc, seat) => {
            if (!acc[seat.row]) {
              acc[seat.row] = [];
            }
            acc[seat.row].push(seat);
            return acc;
          }, {} as Record<string, Seat[]>);

          return (
            <div key={section.name} className="mb-6">
              <h3 className="mb-3 text-center text-lg font-semibold text-gray-900 dark:text-white">{section.name}</h3>
              <div className="space-y-2">
                {Object.entries(seatsByRow)
                  .sort(([leftRow], [rightRow]) => sortRowLabels(leftRow, rightRow))
                  .map(([row, seats]) => (
                  <div key={row} className="flex items-center justify-center gap-2">
                    <span className="w-8 text-sm font-medium text-gray-600 dark:text-gray-400">{row}</span>
                    <div className="flex gap-1">
                      {seats
                        .sort(sortSeats)
                        .map((seat) => (
                          <button
                            key={seat.id}
                            onClick={() => handleSeatClick(seat)}
                            disabled={seat.status !== 'available' && !isSeatSelected(seat.id)}
                            className={`h-8 w-8 rounded border text-xs font-medium transition-colors ${getSeatColor(seat)}`}
                            title={`${seat.section} ${seat.row}${seat.seat_number} - ${seat.status}`}
                            type="button"
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

  const renderSportsSeatMap = (): React.ReactNode => {
    const sportsSections = sections.map((section) => {
      const availableCount = section.seats.filter((seat) => seat.status === 'available').length;
      const selectedCount = selectedZoneCounts[section.name] || 0;

      return {
        ...section,
        selectedCount,
        remainingCount: Math.max(availableCount - selectedCount, 0),
      };
    });

    const focusedSection = activeSportsSection ? seatSectionMap.get(activeSportsSection) : null;

    return (
      <div className="space-y-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#ddd5f7] bg-[#f9f7ff] p-5">
          <div className="relative mx-auto h-[340px] max-w-3xl overflow-hidden rounded-2xl bg-[#f0ecff]">
            <div className="absolute left-1/2 top-1/2 h-[220px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-[48%] border-[22px] border-[#704aff] bg-[#2a9a52] shadow-[inset_0_0_0_4px_rgba(255,255,255,0.22)]">
              <div className="absolute left-1/2 top-1/2 h-16 w-5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[#d9ccb8]"></div>
              <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20"></div>
            </div>

            {sportsSections.map((section, index) => {
              const angle = (index / Math.max(sportsSections.length, 1)) * Math.PI * 2 - Math.PI / 2;
              const left = 50 + Math.cos(angle) * 40;
              const top = 50 + Math.sin(angle) * 31;
              const isActive = activeSportsSection === section.name;

              return (
                <button
                  key={section.name}
                  type="button"
                  onClick={() => setActiveSportsSection(section.name)}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                    isActive
                      ? 'border-[#4b2fc9] bg-[#5f3eff] text-white shadow-lg'
                      : 'border-[#c9bbf7] bg-white text-[#3a2f66] hover:border-[#7b62e9]'
                  }`}
                >
                  <div>{section.name}</div>
                  <div className={`mt-0.5 text-[10px] ${isActive ? 'text-white/85' : 'text-[#6a5da2]'}`}>
                    {section.remainingCount} left
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-center text-xs font-medium text-[#5f4f95]">
            Select a stand on the stadium map, then choose exact seats from that stand.
          </p>
        </div>

        {!focusedSection ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">Select a stand to see seats.</p>
        ) : (
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <h3 className="mb-4 text-center text-lg font-semibold text-gray-900 dark:text-white">
              {focusedSection.name} - Choose Seats
            </h3>

            <div className="space-y-2">
              {Object.entries(
                focusedSection.seats.reduce((acc, seat) => {
                  if (!acc[seat.row]) {
                    acc[seat.row] = [];
                  }
                  acc[seat.row].push(seat);
                  return acc;
                }, {} as Record<string, Seat[]>)
              )
                .sort(([leftRow], [rightRow]) => sortRowLabels(leftRow, rightRow))
                .map(([row, rowSeats]) => (
                  <div key={row} className="flex items-center justify-center gap-2">
                    <span className="w-10 text-sm font-medium text-gray-600 dark:text-gray-400">{row}</span>
                    <div className="flex flex-wrap justify-center gap-1">
                      {[...rowSeats].sort(sortSeats).map((seat) => (
                        <button
                          key={seat.id}
                          type="button"
                          onClick={() => handleSeatClick(seat)}
                          disabled={seat.status !== 'available' && !isSeatSelected(seat.id)}
                          className={`h-8 w-8 rounded border text-xs font-medium transition-colors ${getSeatColor(seat)}`}
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
        )}
      </div>
    );
  };

  const renderZoneMap = (): React.ReactNode => {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[#dbcdf7] bg-[#f9f6ff] p-5">
          <h3 className="text-lg font-bold text-[#32295a]">Zone Selection</h3>
          <p className="mt-1 text-sm text-[#5f5585]">
            Concert and festival events use zones instead of fixed seats. Choose how many passes you need in each zone.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => {
            const selectedCount = selectedZoneCounts[section.name] || 0;
            const availableCount = section.seats.filter((seat) => seat.status === 'available').length;
            const remainingCount = Math.max(availableCount - selectedCount, 0);
            const canIncrease = remainingCount > 0 && selectedSeats.length < maxSelectableCount;

            return (
              <div
                key={section.name}
                className="rounded-xl border border-[#d9ccf8] bg-white p-4 shadow-[0_8px_20px_rgba(84,38,228,0.07)]"
              >
                <h4 className="text-sm font-bold uppercase tracking-wide text-[#4f3ba3]">{section.name}</h4>
                <p className="mt-2 text-xs text-[#6f6598]">{remainingCount} passes available</p>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#6f6598]">Selected</p>
                    <p className="text-xl font-black text-[#2f2754]">{selectedCount}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveZonePass(section.name)}
                      disabled={selectedCount === 0}
                      className="h-9 w-9 rounded-full border border-[#cfbdf8] text-lg font-bold text-[#5a3ed8] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddZonePass(section.name)}
                      disabled={!canIncrease}
                      className="h-9 w-9 rounded-full bg-[#5f3eff] text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderGridSeatMap = (columns: string): React.ReactNode => {
    return (
      <div className="space-y-8">
        <div className="mb-8 flex justify-center">
          <div className="w-2/3 rounded-lg bg-green-600 p-4 text-center text-white dark:bg-green-800">
            <span className="text-lg font-bold">STAGE / FIELD</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <div key={section.name} className="rounded-lg border border-gray-300 p-4 dark:border-gray-600">
              <h3 className="mb-3 text-center text-lg font-semibold text-gray-900 dark:text-white">{section.name}</h3>
              <div className={`grid ${columns} gap-1`}>
                {[...section.seats].sort(sortSeats).map((seat) => (
                  <button
                    key={seat.id}
                    onClick={() => handleSeatClick(seat)}
                    disabled={seat.status !== 'available' && !isSeatSelected(seat.id)}
                    className={`h-9 w-9 rounded border text-xs font-medium transition-colors ${getSeatColor(seat)}`}
                    title={`${seat.section} ${seat.row}${seat.seat_number} - ${seat.status}`}
                    type="button"
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

  const renderSeatMap = () => {
    if (!eventData) {
      return null;
    }

    if (isCinemaEvent) {
      return renderCinemaSeatMap();
    }

    if (isZoneBasedEvent) {
      return renderZoneMap();
    }

    if (isSportsEvent) {
      return renderSportsSeatMap();
    }

    return renderGridSeatMap('grid-cols-4');
  };

  const handleProceedToCheckout = () => {
    if (selectedSeats.length === 0) {
      return;
    }

    if (selectedSeats.length !== maxSelectableCount) {
      return;
    }

    navigate('/eventra/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => navigate('/eventra/events')}
            className="rounded-lg bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
            type="button"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return null;
  }

  if (!ticketTypeData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600 dark:text-gray-400">No ticket type is configured for this event.</p>
          <button
            onClick={() => navigate(`/eventra/events/${eventData.id}`)}
            className="rounded-lg bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
            type="button"
          >
            Back to Event
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => navigate(`/eventra/events/${eventData.id}`)}
            className="mb-4 text-purple-600 hover:underline dark:text-purple-400"
            type="button"
          >
            ← Back to Event
          </button>
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            {isZoneBasedEvent ? 'Select Your Zone Passes' : 'Select Your Seats'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {eventData.name} • {ticketTypeData.name} (₹{ticketTypeData.price})
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Ticket Quantity</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Selected {selectedSeats.length} of {maxSelectableCount}
              </p>
            </div>
            <div className="inline-flex items-center gap-3 rounded-lg border border-gray-200 px-2 py-1 dark:border-gray-600">
              <button
                type="button"
                onClick={decreaseDesiredTicketCount}
                disabled={desiredTicketCount <= 1}
                className="h-8 w-8 rounded-md border border-gray-300 text-lg font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                -
              </button>
              <span className="min-w-[2rem] text-center text-sm font-semibold text-gray-900 dark:text-white">{desiredTicketCount}</span>
              <button
                type="button"
                onClick={increaseDesiredTicketCount}
                disabled={desiredTicketCount >= maxTicketSelection}
                className="h-8 w-8 rounded-md border border-gray-300 text-lg font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
              {isZoneBasedEvent ? (
                <div className="mb-6 flex flex-wrap gap-4 border-b border-gray-200 pb-6 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded border border-[#d9ccf8] bg-white"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Zone with available passes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded border border-purple-600 bg-purple-500"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Selected passes</span>
                  </div>
                </div>
              ) : (
                <div className="mb-6 flex flex-wrap gap-4 border-b border-gray-200 pb-6 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded border border-green-300 bg-green-100 dark:border-green-700 dark:bg-green-900"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded border border-purple-600 bg-purple-500"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded border border-gray-400 bg-gray-300 dark:border-gray-500 dark:bg-gray-600"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Booked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded border border-yellow-300 bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-900"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Reserved</span>
                  </div>
                </div>
              )}

              {sections.length === 0 ? (
                <p className="py-10 text-center text-gray-500 dark:text-gray-400">No seats available for this ticket type.</p>
              ) : (
                renderSeatMap()
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-4 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
              <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Booking Summary</h2>

              {selectedSeats.length === 0 ? (
                <p className="py-8 text-center text-gray-500 dark:text-gray-400">
                  {isZoneBasedEvent ? 'No zone passes selected' : 'No seats selected'}
                </p>
              ) : (
                <>
                  <div className="mb-4 max-h-48 overflow-y-auto">
                    <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {isZoneBasedEvent
                        ? `Selected Zones (${selectedSeats.length}/${maxSelectableCount} passes)`
                        : `Selected Seats (${selectedSeats.length}/${maxSelectableCount})`}
                    </h3>
                    {isZoneBasedEvent ? (
                      <div className="space-y-2">
                        {selectedZoneEntries.map(([zoneName, count]) => {
                          const zonePrice = selectedSeats.find((seat) => seat.section === zoneName)?.price || 0;
                          return (
                            <div key={zoneName} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{zoneName} x {count}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">₹{zonePrice}</span>
                                <button
                                  onClick={() => handleRemoveZonePass(zoneName)}
                                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                  type="button"
                                >
                                  Remove 1
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedSeats.map((seat) => (
                          <div key={seat.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">
                              {seat.section} {seat.row}{seat.seat_number}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">₹{seat.price}</span>
                              <button
                                onClick={() => removeSeat(seat.id)}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                type="button"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                      <span className="font-medium text-gray-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Tax (18%)</span>
                      <span className="font-medium text-gray-900 dark:text-white">₹{tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold dark:border-gray-700">
                      <span className="text-gray-900 dark:text-white">Total</span>
                      <span className="text-purple-600 dark:text-purple-400">₹{total.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleProceedToCheckout}
                    disabled={!isSelectionComplete}
                    className="mt-6 w-full rounded-lg bg-purple-500 px-4 py-3 font-medium text-white transition-colors hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                  >
                    {isSelectionComplete
                      ? 'Proceed to Checkout'
                      : `Select ${Math.max(maxSelectableCount - selectedSeats.length, 0)} more ${isZoneBasedEvent ? 'passes' : 'seats'}`}
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
