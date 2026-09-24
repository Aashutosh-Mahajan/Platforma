import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Armchair,
  ArrowRight,
  Ban,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ClipboardList,
  ExternalLink,
  Eye,
  EyeOff,
  IndianRupee,
  LayoutDashboard,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../contexts';
import { eventAPI, ticketTypeAPI, seatAPI, bookingAPI } from '../../api/eventra';
import type { Event, TicketType, Seat, Booking } from '../../types';
import { DashboardShell, type DashNavGroup } from '../../components/dashboard/DashboardShell';
import {
  AreaChart,
  DashModal,
  EmptyState,
  ErrorBanner,
  Field,
  KpiLedger,
  Panel,
  RankedBars,
  SectionHeading,
  SkeletonRows,
  StatusBreakdown,
  StatusPill,
} from '../../components/dashboard/primitives';
import EventraAnalyticsView from './analytics/EventraAnalyticsView';
import { bucketByDay, formatDate, formatINR, formatInt, greeting, humanize, themes, toNumber } from '../../components/dashboard/theme';
import { seatCode } from '../../utils';
import { parseApiError } from '../../api/auth';
import { EventTypePicker } from '../../components/eventra/EventTypePicker';

const EVENT_IMAGES = [
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1600&q=80',
  'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1600&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&q=80',
];

interface EventFormData {
  name: string;
  description: string;
  category: string;
  event_type: string;
  venue_name: string;
  address: string;
  event_date: string;
  event_end_date: string;
}

// <input type="datetime-local"> works in local time without a zone, while
// the API speaks ISO timestamps. Convert both ways so edits don't drift.
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

const eventPayload = (form: EventFormData) => ({
  ...form,
  event_date: fromLocalInput(form.event_date) ?? '',
  event_end_date: fromLocalInput(form.event_end_date),
});

interface TicketTypeFormData {
  name: string;
  price: number;
  quantity_total: number;
  description: string;
  benefits: string;
}

interface Analytics {
  totalBookings: number;
  revenue: number;
  availableSeats: number;
}

export const EventOrganizerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({ totalBookings: 0, revenue: 0, availableSeats: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'events' | 'tickets' | 'seats' | 'bookings'>('overview');

  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [showTicketTypeModal, setShowTicketTypeModal] = useState(false);
  const [showBulkSeatModal, setShowBulkSeatModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingTicketType, setEditingTicketType] = useState<TicketType | null>(null);
  const [eventFormError, setEventFormError] = useState<string | null>(null);

  // Form states
  const [eventForm, setEventForm] = useState<EventFormData>({
    name: '',
    description: '',
    category: 'concert',
    event_type: '',
    venue_name: '',
    address: '',
    event_date: '',
    event_end_date: '',
  });

  const [ticketTypeForm, setTicketTypeForm] = useState<TicketTypeFormData>({
    name: '',
    price: 0,
    quantity_total: 0,
    description: '',
    benefits: '',
  });

  // Bulk seat creation state
  const [bulkSeatConfig, setBulkSeatConfig] = useState({
    section: '',
    rows: '',
    seatsPerRow: '',
    ticket_type_id: 0,
  });

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadTicketTypes();
      loadSeats();
      loadBookings();
    }
  }, [selectedEvent?.id]);

  useEffect(() => {
    calculateAnalytics();
  }, [bookings, selectedEvent?.id]);

  useEffect(() => {
    if (!selectedEvent) return;

    const intervalId = window.setInterval(() => {
      loadBookings();
      refreshSelectedEvent();
      if (activeTab === 'seats') {
        loadSeats();
      }
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [selectedEvent?.id, activeTab]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await eventAPI.list({ page: 1, organizer_only: true });
      setEvents(data.results);
      if (data.results.length > 0) {
        setSelectedEvent(data.results[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const loadTicketTypes = async () => {
    if (!selectedEvent) return;
    try {
      // Ticket types are included in event detail, but we can also fetch separately
      const eventDetail = await eventAPI.retrieve(selectedEvent.id, { organizer_only: true });
      setTicketTypes(eventDetail.ticket_types || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load ticket types');
    }
  };

  const loadSeats = async () => {
    if (!selectedEvent) return;
    try {
      const data = await eventAPI.getSeats(selectedEvent.id, { organizer_only: true });
      // Flatten sections into single array
      const allSeats = data.sections.flatMap(section => section.seats);
      setSeats(allSeats);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load seats');
    }
  };

  const loadBookings = async () => {
    if (!selectedEvent) return;

    try {
      const data = await bookingAPI.list();
      // Filter bookings for selected event
      const eventBookings = data.results.filter(
        (booking) => booking.event === selectedEvent.id
      );
      setBookings(eventBookings);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load bookings');
    }
  };

  const refreshSelectedEvent = async () => {
    if (!selectedEvent) return;

    try {
      const updatedEvent = await eventAPI.retrieve(selectedEvent.id, { organizer_only: true });
      setSelectedEvent(updatedEvent);
      setEvents((prev) => prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)));
    } catch {
      // Ignore transient refresh failures during polling.
    }
  };

  const calculateAnalytics = () => {
    if (!selectedEvent) return;
    
    const eventBookings = bookings.filter(
      (booking) => booking.event === selectedEvent.id && booking.status !== 'cancelled'
    );
    
    const totalBookings = eventBookings.length;
    const revenue = eventBookings.reduce((sum, booking) => sum + parseFloat(booking.total.toString()), 0);
    const availableSeats = selectedEvent.available_seats;
    
    setAnalytics({ totalBookings, revenue, availableSeats });
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.event_type) {
      setEventFormError('Choose what kind of event this is.');
      return;
    }
    setEventFormError(null);
    try {
      const newEvent = await eventAPI.create(eventPayload(eventForm));
      setEvents([newEvent, ...events]);
      setSelectedEvent(newEvent);
      setShowEventModal(false);
      resetEventForm();
    } catch (err: any) {
      const { fields, message } = parseApiError(err);
      setEventFormError(fields.event_type || message || Object.values(fields)[0] || 'Could not create the event.');
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    if (!eventForm.event_type) {
      setEventFormError('Choose what kind of event this is.');
      return;
    }
    setEventFormError(null);
    try {
      const updated = await eventAPI.update(editingEvent.id, eventPayload(eventForm));
      setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
      if (selectedEvent?.id === updated.id) {
        setSelectedEvent(updated);
      }
      setShowEventModal(false);
      setEditingEvent(null);
      resetEventForm();
    } catch (err: any) {
      const { fields, message } = parseApiError(err);
      setEventFormError(fields.event_type || message || Object.values(fields)[0] || 'Could not save the event.');
    }
  };

  const handleTogglePublished = async (event: Event) => {
    try {
      const updated = await eventAPI.togglePublished(event.id);
      setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
      if (selectedEvent?.id === updated.id) {
        setSelectedEvent(updated);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to toggle event status');
    }
  };

  const handleCancelEvent = async (event: Event) => {
    if (!confirm('Are you sure you want to cancel this event? All bookings will be refunded.')) return;
    
    try {
      const updated = await eventAPI.cancelEvent(event.id);
      setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
      if (selectedEvent?.id === updated.id) {
        setSelectedEvent(updated);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel event');
    }
  };

  const handleCreateTicketType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    
    try {
      const newTicketType = await ticketTypeAPI.create({
        ...ticketTypeForm,
        event: selectedEvent.id,
      });
      setTicketTypes([...ticketTypes, newTicketType]);
      setShowTicketTypeModal(false);
      resetTicketTypeForm();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create ticket type');
    }
  };

  const handleUpdateTicketType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicketType) return;
    
    try {
      const updated = await ticketTypeAPI.update(editingTicketType.id, ticketTypeForm);
      setTicketTypes(ticketTypes.map((tt) => (tt.id === updated.id ? updated : tt)));
      setShowTicketTypeModal(false);
      setEditingTicketType(null);
      resetTicketTypeForm();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update ticket type');
    }
  };

  const handleDeleteTicketType = async (id: number) => {
    if (!confirm('Are you sure you want to delete this ticket type?')) return;
    
    try {
      await ticketTypeAPI.delete(id);
      setTicketTypes(ticketTypes.filter((tt) => tt.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete ticket type');
    }
  };

  const handleBulkCreateSeats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    
    try {
      // Parse rows (e.g., "A,B,C" or "A-C")
      const rows = bulkSeatConfig.rows.includes('-')
        ? generateRowRange(bulkSeatConfig.rows)
        : bulkSeatConfig.rows.split(',').map(r => r.trim());
      
      const seatsPerRow = parseInt(bulkSeatConfig.seatsPerRow);
      
      // Generate seat data
      const seatsData = [];
      for (const row of rows) {
        for (let i = 1; i <= seatsPerRow; i++) {
          seatsData.push({
            section: bulkSeatConfig.section,
            row: row,
            seat_number: i.toString(),
            ticket_type_id: bulkSeatConfig.ticket_type_id,
          });
        }
      }
      
      const result = await seatAPI.bulkCreate({
        event_id: selectedEvent.id,
        seats: seatsData,
      });
      
      setSeats([...seats, ...result.seats]);
      setShowBulkSeatModal(false);
      setBulkSeatConfig({ section: '', rows: '', seatsPerRow: '', ticket_type_id: 0 });
      
      // Reload event to update seat counts
      const updatedEvent = await eventAPI.retrieve(selectedEvent.id, { organizer_only: true });
      setSelectedEvent(updatedEvent);
      setEvents(events.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create seats');
    }
  };

  const generateRowRange = (range: string): string[] => {
    const [start, end] = range.split('-').map(s => s.trim());
    const rows = [];
    for (let i = start.charCodeAt(0); i <= end.charCodeAt(0); i++) {
      rows.push(String.fromCharCode(i));
    }
    return rows;
  };

  const openCreateEventModal = () => {
    resetEventForm();
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const openEditEventModal = (event: Event) => {
    setEventFormError(null);
    setEventForm({
      name: event.name,
      description: event.description,
      category: event.category,
      event_type: event.event_type || '',
      venue_name: event.venue_name,
      address: event.address,
      event_date: toLocalInput(event.event_date),
      event_end_date: toLocalInput(event.event_end_date),
    });
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const openCreateTicketTypeModal = () => {
    resetTicketTypeForm();
    setEditingTicketType(null);
    setShowTicketTypeModal(true);
  };

  const openEditTicketTypeModal = (ticketType: TicketType) => {
    setTicketTypeForm({
      name: ticketType.name,
      price: ticketType.price,
      quantity_total: ticketType.quantity_total,
      description: ticketType.description,
      benefits: ticketType.benefits,
    });
    setEditingTicketType(ticketType);
    setShowTicketTypeModal(true);
  };

  const resetEventForm = () => {
    setEventFormError(null);
    setEventForm({
      name: '',
      description: '',
      category: 'concert',
      event_type: '',
      venue_name: '',
      address: '',
      event_date: '',
      event_end_date: '',
    });
  };

  const resetTicketTypeForm = () => {
    setTicketTypeForm({
      name: '',
      price: 0,
      quantity_total: 0,
      description: '',
      benefits: '',
    });
  };

  const W = 'eventra' as const;
  const t = themes[W];

  const venueOf = (event?: Event | null) =>
    event?.venue_name || (event as (Event & { venue_detail?: { name?: string } }) | null | undefined)?.venue_detail?.name || '';

  const eventImage = (event?: Event | null) =>
    event?.banner || event?.image || EVENT_IMAGES[(event?.id ?? 0) % EVENT_IMAGES.length];

  const liveBookings = bookings.filter((booking) => booking.status !== 'cancelled');
  const bookingCounts = bookings.reduce<Record<string, number>>((acc, booking) => {
    acc[booking.status] = (acc[booking.status] ?? 0) + 1;
    return acc;
  }, {});
  const revenueSeries = bucketByDay(liveBookings, (booking) => booking.booking_date, (booking) => toNumber(booking.total));
  const seriesTotal = revenueSeries.reduce((sum, point) => sum + point.value, 0);
  const ticketsSold = liveBookings.reduce((sum, booking) => sum + toNumber(booking.total_tickets), 0);
  const totalSeats = toNumber(selectedEvent?.total_seats);
  const seatsTaken = Math.max(0, totalSeats - toNumber(selectedEvent?.available_seats));
  const fill = totalSeats > 0 ? seatsTaken / totalSeats : 0;
  const tierSales = ticketTypes
    .map((tt) => {
      const sold = Math.max(0, toNumber(tt.quantity_total) - toNumber(tt.quantity_available));
      return { label: tt.name, value: sold, sub: `${sold} of ${tt.quantity_total} · ${formatINR(tt.price)} each` };
    })
    .sort((a, b) => b.value - a.value);
  const recentBookings = [...bookings].sort((a, b) => +new Date(b.booking_date) - +new Date(a.booking_date));

  const seatCounts = seats.reduce<Record<string, number>>((acc, seat) => {
    acc[seat.status] = (acc[seat.status] ?? 0) + 1;
    return acc;
  }, {});
  const seatMap = seats.reduce<Record<string, Record<string, Seat[]>>>((acc, seat) => {
    const section = (acc[seat.section] = acc[seat.section] ?? {});
    (section[seat.row] = section[seat.row] ?? []).push(seat);
    return acc;
  }, {});
  const SEAT_COLORS: Record<Seat['status'], string> = {
    available: 'bg-[#e8824a]/25 ring-1 ring-inset ring-[#e8824a]/50',
    booked: 'bg-[#e8824a]',
    reserved: 'bg-amber-300/70',
    blocked: 'bg-white/10',
  };

  const needsEvent = !selectedEvent;
  const nav: DashNavGroup[] = [
    {
      label: 'Production',
      items: [
        { key: 'overview', label: 'Overview', icon: LayoutDashboard, onClick: () => setActiveTab('overview'), disabled: needsEvent },
        { key: 'analytics', label: 'Analytics', icon: ChartNoAxesCombined, onClick: () => setActiveTab('analytics'), disabled: needsEvent },
        { key: 'bookings', label: 'Bookings', icon: ClipboardList, onClick: () => setActiveTab('bookings'), disabled: needsEvent, badge: bookingCounts.pending || undefined },
        { key: 'tickets', label: 'Ticket tiers', icon: Ticket, onClick: () => setActiveTab('tickets'), disabled: needsEvent },
        { key: 'seats', label: 'Seat map', icon: Armchair, onClick: () => setActiveTab('seats'), disabled: needsEvent },
      ],
    },
    {
      label: 'Business',
      items: [
        { key: 'events', label: 'All events', icon: CalendarDays, onClick: () => setActiveTab('events'), badge: events.length > 1 ? events.length : undefined },
        { key: 'profile', label: 'Profile', icon: UserRound, to: '/profile' },
      ],
    },
  ];

  const switcher =
    events.length > 1 ? (
      <div className="px-3">
        <label htmlFor="event-switch" className={`block pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${t.sidebarMuted}`}>
          Switch event
        </label>
        <select
          id="event-switch"
          value={selectedEvent?.id ?? ''}
          onChange={(e) => {
            const next = events.find((ev) => ev.id === Number(e.target.value));
            if (next) setSelectedEvent(next);
          }}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-[#f5f0e8] focus:border-[#e8824a] focus:outline-none [&>option]:bg-[#141414]"
        >
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>
    ) : null;

  const eventStatus = (event: Event) =>
    event.is_cancelled ? (
      <StatusPill world={W} tone="danger" label="Cancelled" />
    ) : event.is_published ? (
      <StatusPill world={W} tone="success" label="On sale" />
    ) : (
      <StatusPill world={W} tone="neutral" label="Draft" />
    );

  const closeEventModal = () => {
    setShowEventModal(false);
    setEditingEvent(null);
    resetEventForm();
  };
  const closeTicketModal = () => {
    setShowTicketTypeModal(false);
    setEditingTicketType(null);
    resetTicketTypeForm();
  };
  const closeSeatModal = () => {
    setShowBulkSeatModal(false);
    setBulkSeatConfig({ section: '', rows: '', seatsPerRow: '', ticket_type_id: 0 });
  };

  const seatPreview =
    bulkSeatConfig.rows && bulkSeatConfig.seatsPerRow
      ? (bulkSeatConfig.rows.includes('-') ? generateRowRange(bulkSeatConfig.rows).length : bulkSeatConfig.rows.split(',').length) *
        parseInt(bulkSeatConfig.seatsPerRow || '0')
      : 0;

  const eventDate = selectedEvent ? new Date(selectedEvent.event_date) : null;

  return (
    <DashboardShell
      world={W}
      context="Organizer studio"
      nav={nav}
      activeKey={activeTab}
      sidebarExtra={switcher}
      image={selectedEvent ? eventImage(selectedEvent) : EVENT_IMAGES[0]}
      imagePosition="center 35%"
      title={
        <>
          {greeting()}, <span className={t.titleAccent}>{user?.first_name || 'producer'}</span>
        </>
      }
      subtitle={
        selectedEvent ? (
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-white">{selectedEvent.name}</span>
            {venueOf(selectedEvent) && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{venueOf(selectedEvent)}</span>}
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{formatDate(selectedEvent.event_date, true)}</span>
          </span>
        ) : (
          'Create your first event to open ticket sales on Eventra.'
        )
      }
      actions={
        selectedEvent ? (
          <>
            <Link to={`/eventra/events/${selectedEvent.id}`} className={t.btnOnImage}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Event page
            </Link>
            <button type="button" onClick={openCreateEventModal} className={t.btnOnImagePrimary}>
              <Plus className="h-4 w-4" aria-hidden="true" /> New event
            </button>
          </>
        ) : (
          <button type="button" onClick={openCreateEventModal} className={t.btnOnImagePrimary}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New event
          </button>
        )
      }
      ledger={
        activeTab === 'analytics' ? undefined : <KpiLedger
          world={W}
          loading={loading}
          items={[
            { label: 'Box office', icon: IndianRupee, value: formatINR(analytics.revenue), hint: `${formatINR(seriesTotal)} in the charted fortnight` },
            { label: 'Bookings', icon: ClipboardList, value: formatInt(analytics.totalBookings), hint: `${formatInt(ticketsSold)} tickets issued` },
            { label: 'Seats sold', icon: Armchair, value: `${Math.round(fill * 100)}%`, hint: `${formatInt(seatsTaken)} of ${formatInt(totalSeats)} · ${formatInt(analytics.availableSeats)} left` },
            { label: 'Rating', icon: Star, value: selectedEvent && selectedEvent.review_count > 0 ? toNumber(selectedEvent.rating).toFixed(1) : 'New', hint: selectedEvent ? (selectedEvent.review_count > 0 ? `${formatInt(selectedEvent.review_count)} reviews` : 'No reviews yet') : undefined },
          ]}
        />
      }
    >
      {error && <ErrorBanner world={W} message={error} onRetry={loadEvents} onDismiss={() => setError(null)} />}

      {loading ? (
        <Panel world={W}>
          <SkeletonRows world={W} rows={5} />
        </Panel>
      ) : needsEvent && activeTab !== 'events' ? (
        <Panel world={W}>
          <EmptyState
            world={W}
            icon={Sparkles}
            title="Your stage is empty"
            body="Create an event with its venue and date, add ticket tiers, then lay out seats. Bookings and box office numbers appear here."
            action={<button type="button" onClick={openCreateEventModal} className={t.btnPrimary}><Plus className="h-4 w-4" aria-hidden="true" /> Create event</button>}
          />
        </Panel>
      ) : null}

      {/* Overview */}
      {!loading && activeTab === 'overview' && selectedEvent && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-3">
            <Panel
              world={W}
              className="xl:col-span-2"
              title="Box office"
              description={`${revenueSeries[0]?.label} – ${revenueSeries[revenueSeries.length - 1]?.label} · ${formatINR(seriesTotal)} from confirmed and pending bookings`}
            >
              <AreaChart world={W} data={revenueSeries} ariaLabel="Daily ticket revenue" format={(v) => `₹${new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)}`} />
            </Panel>
            <Panel world={W} title="House" description={eventDate ? eventDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : undefined}>
              <div className="flex items-center gap-6">
                <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0 -rotate-90" role="img" aria-label={`${Math.round(fill * 100)} percent of seats sold`}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#222" strokeWidth="12" />
                  {fill > 0 && <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#e8824a"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${fill * 314.16} 314.16`}
                    className="transition-[stroke-dasharray] duration-700"
                  />}
                </svg>
                <div>
                  <p className="font-eventra-display text-5xl leading-none">{Math.round(fill * 100)}<span className="text-2xl text-[#9a9a9a]">%</span></p>
                  <p className={`mt-2 text-sm ${t.muted}`}>{formatInt(seatsTaken)} of {formatInt(totalSeats)} seats taken</p>
                  <div className="mt-3">{eventStatus(selectedEvent)}</div>
                </div>
              </div>
              <div className={`mt-6 border-t pt-5 ${t.hairline}`}>
                <StatusBreakdown world={W} counts={bookingCounts} />
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-5">
            <Panel
              world={W}
              flush
              className="xl:col-span-3"
              title="Latest bookings"
              description="Refreshes every 15 seconds"
              action={<button type="button" onClick={() => setActiveTab('bookings')} className={t.btnGhost}>All bookings <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>}
            >
              {recentBookings.length === 0 ? (
                <EmptyState world={W} compact icon={ClipboardList} title="No bookings yet" body="Publish the event and add seats so fans can start booking." />
              ) : (
                <ul className={`divide-y ${t.divide}`}>
                  {recentBookings.slice(0, 6).map((booking) => (
                    <li key={booking.id} className={`flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6 ${t.rowHover}`}>
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#c4621a]/15 font-eventra-display text-lg text-[#e8824a]">
                        {booking.total_tickets}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-semibold tracking-wide">{booking.booking_reference}</p>
                        <p className={`text-xs ${t.muted}`}>{formatDate(booking.booking_date, true)}</p>
                      </div>
                      <span className="font-semibold tabular-nums">{formatINR(booking.total, true)}</span>
                      <StatusPill world={W} status={booking.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel world={W} className="xl:col-span-2" title="Tier sell-through" description="Tickets sold per tier">
              {tierSales.length === 0 ? (
                <EmptyState world={W} compact icon={Ticket} title="No ticket tiers" body="Add tiers like General and VIP to start selling." action={<button type="button" onClick={() => setActiveTab('tickets')} className={t.btnSecondary}>Add a tier</button>} />
              ) : (
                <RankedBars world={W} data={tierSales} format={(v) => `${formatInt(v)} sold`} />
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* Analytics */}
      {!loading && activeTab === 'analytics' && selectedEvent && (
        <EventraAnalyticsView mode="organizer" events={events.map((e) => ({ id: e.id, name: e.name }))} />
      )}

      {/* Events */}
      {!loading && activeTab === 'events' && (
        <div>
          <SectionHeading
            world={W}
            title="Your events"
            description="Choose which production you're managing, publish it, or edit the details."
            action={<button type="button" onClick={openCreateEventModal} className={t.btnPrimary}><Plus className="h-4 w-4" aria-hidden="true" /> New event</button>}
          />
          <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {events.map((event) => {
              const selected = selectedEvent?.id === event.id;
              const date = new Date(event.event_date);
              const taken = Math.max(0, toNumber(event.total_seats) - toNumber(event.available_seats));
              const pct = toNumber(event.total_seats) > 0 ? (taken / toNumber(event.total_seats)) * 100 : 0;
              return (
                <article
                  key={event.id}
                  className={`group overflow-hidden rounded-2xl border bg-[#141414] transition-colors duration-200 ${selected ? 'border-[#c4621a]/70' : 'border-white/[0.07] hover:border-white/20'}`}
                >
                  <div className="relative h-52 overflow-hidden">
                    <img src={eventImage(event)} alt="" className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${event.is_cancelled ? 'grayscale' : ''}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/30 to-transparent" />
                    <div className="absolute left-4 top-4 flex gap-2">
                      {eventStatus(event)}
                      {selected && <StatusPill world={W} tone="info" label="Managing" />}
                    </div>
                    <div className="absolute right-4 top-4 rounded-xl bg-black/55 px-3 py-2 text-center backdrop-blur">
                      <p className="font-eventra-display text-2xl leading-none">{Number.isNaN(date.getTime()) ? '—' : date.getDate()}</p>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#e8824a]">
                        {Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { month: 'short' })}
                      </p>
                    </div>
                    <div className="absolute bottom-4 left-5 right-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#e8824a]">{event.event_type_label || humanize(event.category)}</p>
                      <h3 className="mt-1 font-eventra-display text-2xl leading-tight">{event.name}</h3>
                    </div>
                  </div>
                  <div className="px-5 pb-5 pt-3">
                    <p className={`inline-flex items-center gap-1.5 text-sm ${t.muted}`}>
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {venueOf(event) || 'Venue to be announced'}
                    </p>
                    <div className="mt-4">
                      <div className={`flex justify-between text-xs ${t.muted}`}>
                        <span>{formatInt(taken)} of {formatInt(event.total_seats)} seats sold</span>
                        <span className="tabular-nums">{Math.round(pct)}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-[#e8824a]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-4">
                      <button type="button" onClick={() => { setSelectedEvent(event); setActiveTab('overview'); }} className={selected ? t.btnSecondary : t.btnPrimary}>
                        {selected ? 'Open overview' : 'Manage'}
                      </button>
                      <button type="button" onClick={() => openEditEventModal(event)} className={t.btnGhost}>
                        <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                      </button>
                      <button type="button" onClick={() => handleTogglePublished(event)} disabled={event.is_cancelled} className={t.btnGhost}>
                        {event.is_published ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                        {event.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button type="button" onClick={() => handleCancelEvent(event)} disabled={event.is_cancelled} className={`${t.btnDanger} ml-auto`}>
                        <Ban className="h-4 w-4" aria-hidden="true" /> Cancel
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            <button
              type="button"
              onClick={openCreateEventModal}
              className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 text-[#9a9a9a] transition-colors hover:border-[#c4621a]/60 hover:text-[#e8824a]"
            >
              <Plus className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
              <span className="mt-3 text-sm font-semibold">Create another event</span>
            </button>
          </div>
        </div>
      )}

      {/* Ticket tiers */}
      {!loading && activeTab === 'tickets' && selectedEvent && (
        <div>
          <SectionHeading
            world={W}
            title="Ticket tiers"
            description={`Pricing and allocation for ${selectedEvent.name}.`}
            action={<button type="button" onClick={openCreateTicketTypeModal} className={t.btnPrimary}><Plus className="h-4 w-4" aria-hidden="true" /> New tier</button>}
          />
          {ticketTypes.length === 0 ? (
            <Panel world={W}>
              <EmptyState world={W} icon={Ticket} title="No tiers yet" body="Most events start with General and VIP. Seats are assigned to a tier when you lay them out." action={<button type="button" onClick={openCreateTicketTypeModal} className={t.btnPrimary}><Plus className="h-4 w-4" aria-hidden="true" /> Add first tier</button>} />
            </Panel>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {ticketTypes.map((tt) => {
                const sold = Math.max(0, toNumber(tt.quantity_total) - toNumber(tt.quantity_available));
                const pct = toNumber(tt.quantity_total) > 0 ? (sold / toNumber(tt.quantity_total)) * 100 : 0;
                const perks = (tt.benefits || '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
                return (
                  <article key={tt.id} className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[linear-gradient(160deg,#1b1611_0%,#141414_55%)]">
                    <div className="px-6 pb-5 pt-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-eventra-display text-2xl">{tt.name}</h3>
                        <p className="font-eventra-display text-2xl text-[#e8824a] tabular-nums">{formatINR(tt.price)}</p>
                      </div>
                      {tt.description && <p className={`mt-2 text-sm ${t.muted}`}>{tt.description}</p>}
                      {perks.length > 0 && (
                        <ul className="mt-4 space-y-1.5 text-sm">
                          {perks.map((perk) => (
                            <li key={perk} className="flex items-start gap-2">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#e8824a]" aria-hidden="true" /> {perk}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="relative border-t border-dashed border-white/10 px-6 py-4">
                      <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#0a0a0a]" aria-hidden="true" />
                      <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#0a0a0a]" aria-hidden="true" />
                      <div className={`flex justify-between text-xs ${t.muted}`}>
                        <span>{sold} sold · {tt.quantity_available} left</span>
                        <span className="tabular-nums">{Math.round(pct)}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-[#e8824a]" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button type="button" onClick={() => openEditTicketTypeModal(tt)} className={t.btnSecondary}><Pencil className="h-4 w-4" aria-hidden="true" /> Edit</button>
                        <button type="button" onClick={() => handleDeleteTicketType(tt.id)} className={`${t.btnDanger} ml-auto`}><Trash2 className="h-4 w-4" aria-hidden="true" /> Delete</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Seat map */}
      {!loading && activeTab === 'seats' && selectedEvent && (
        <div>
          <SectionHeading
            world={W}
            title="Seat map"
            description={`${formatInt(seats.length)} seats laid out for ${venueOf(selectedEvent) || selectedEvent.name}.`}
            action={
              <button type="button" onClick={() => setShowBulkSeatModal(true)} disabled={ticketTypes.length === 0} className={t.btnPrimary} title={ticketTypes.length === 0 ? 'Add a ticket tier first' : undefined}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Add seats
              </button>
            }
          />
          <Panel world={W}>
            <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {(['available', 'booked', 'reserved', 'blocked'] as const).map((status) => (
                <span key={status} className={`flex items-center gap-2 ${t.muted}`}>
                  <span className={`h-3.5 w-3.5 rounded-[4px] ${SEAT_COLORS[status]}`} aria-hidden="true" />
                  {humanize(status)} <span className={`font-semibold tabular-nums ${t.strong}`}>{seatCounts[status] ?? 0}</span>
                </span>
              ))}
            </div>
            {seats.length === 0 ? (
              <EmptyState
                world={W}
                icon={Armchair}
                title="No seats laid out"
                body={ticketTypes.length === 0 ? 'Create a ticket tier first, then add seats row by row.' : 'Add a section with its rows (A–E) and seats per row. They inherit the tier price.'}
                action={
                  ticketTypes.length === 0 ? (
                    <button type="button" onClick={() => setActiveTab('tickets')} className={t.btnSecondary}>Go to ticket tiers</button>
                  ) : (
                    <button type="button" onClick={() => setShowBulkSeatModal(true)} className={t.btnPrimary}><Plus className="h-4 w-4" aria-hidden="true" /> Add seats</button>
                  )
                }
              />
            ) : (
              <div className="space-y-10 overflow-x-auto pb-2">
                <div className="mx-auto h-2 w-2/3 rounded-full bg-gradient-to-r from-transparent via-[#e8824a] to-transparent opacity-70" />
                <p className={`-mt-8 text-center text-xs uppercase tracking-[0.3em] ${t.faint}`}>Stage</p>
                {Object.entries(seatMap).map(([section, rows]) => (
                  <div key={section}>
                    <p className="mb-3 text-center font-eventra-display text-lg">{section}</p>
                    <div className="mx-auto w-max space-y-1.5">
                      {Object.entries(rows)
                        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                        .map(([row, rowSeats]) => (
                          <div key={row} className="flex items-center gap-1.5">
                            <span className={`w-6 text-right text-[11px] font-semibold ${t.faint}`}>{row}</span>
                            {[...rowSeats]
                              .sort((a, b) => a.seat_number.localeCompare(b.seat_number, undefined, { numeric: true }))
                              .map((seat) => (
                                <span
                                  key={seat.id}
                                  title={`${section} · Row ${row} · Seat ${seat.seat_number} · ${seat.ticket_type_name} ${formatINR(seat.price)} · ${humanize(seat.status)}`}
                                  className={`h-4 w-4 rounded-[4px] sm:h-5 sm:w-5 ${SEAT_COLORS[seat.status]}`}
                                />
                              ))}
                            <span className={`w-6 text-[11px] font-semibold ${t.faint}`}>{row}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Bookings */}
      {!loading && activeTab === 'bookings' && selectedEvent && (
        <div>
          <SectionHeading world={W} title="Bookings" description={`${bookings.length} bookings for ${selectedEvent.name} · refreshes every 15 seconds`} />
          <Panel world={W} flush>
            {recentBookings.length === 0 ? (
              <EmptyState world={W} icon={ClipboardList} title="No bookings yet" body="When fans book, each reservation shows here with its seats and total." />
            ) : (
              <ul className={`divide-y ${t.divide}`}>
                {recentBookings.map((booking) => (
                  <li key={booking.id} className={`grid gap-3 px-5 py-5 sm:px-6 md:grid-cols-[1fr_auto] md:items-center ${t.rowHover}`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-mono text-sm font-semibold tracking-wide">{booking.booking_reference}</p>
                        <StatusPill world={W} status={booking.status} />
                        <span className={`text-xs ${t.muted}`}>{formatDate(booking.booking_date, true)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {booking.booked_seats.map((bs) => (
                          <span key={bs.id} className="rounded-md bg-white/[0.05] px-2 py-1 text-xs text-[#d8d2c8] ring-1 ring-inset ring-white/[0.06]">
                            {bs.seat.section} · {seatCode(bs.seat.row, bs.seat.seat_number)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-lg font-semibold tabular-nums">{formatINR(booking.total, true)}</p>
                      <p className={`text-xs ${t.muted}`}>
                        {booking.total_tickets} {booking.total_tickets === 1 ? 'ticket' : 'tickets'} · tax {formatINR(booking.tax, true)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* Event modal */}
      <DashModal world={W} size="lg" open={showEventModal} title={editingEvent ? 'Edit event' : 'New event'} onClose={closeEventModal}>
        <form onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent} className="space-y-4">
          {eventFormError && eventForm.event_type && (
            <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {eventFormError}
            </p>
          )}
          <Field world={W} label="Event name" htmlFor="e-name">
            <input id="e-name" type="text" required value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} className={t.input} />
          </Field>
          <Field world={W} label="Description" htmlFor="e-desc">
            <textarea id="e-desc" required rows={3} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} className={t.input} />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium text-[#e8e8e8]">What kind of event is it?</p>
            <EventTypePicker
              value={eventForm.event_type}
              category={eventForm.category}
              error={eventFormError && !eventForm.event_type ? eventFormError : undefined}
              onChange={(next) => {
                setEventForm({ ...eventForm, ...next });
                setEventFormError(null);
              }}
            />
          </div>
          <Field world={W} label="Venue" htmlFor="e-venue">
            <input id="e-venue" type="text" required value={eventForm.venue_name} onChange={(e) => setEventForm({ ...eventForm, venue_name: e.target.value })} className={t.input} />
          </Field>
          <Field world={W} label="Address" htmlFor="e-address">
            <input id="e-address" type="text" required value={eventForm.address} onChange={(e) => setEventForm({ ...eventForm, address: e.target.value })} className={t.input} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field world={W} label="Starts" htmlFor="e-start">
              <input id="e-start" type="datetime-local" required value={eventForm.event_date} onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })} className={t.input} />
            </Field>
            <Field world={W} label="Ends" htmlFor="e-end" hint="Optional">
              <input id="e-end" type="datetime-local" value={eventForm.event_end_date} onChange={(e) => setEventForm({ ...eventForm, event_end_date: e.target.value })} className={t.input} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeEventModal} className={t.btnGhost}>Cancel</button>
            <button type="submit" className={t.btnPrimary}>{editingEvent ? 'Save changes' : 'Create event'}</button>
          </div>
        </form>
      </DashModal>

      {/* Ticket tier modal */}
      <DashModal world={W} size="lg" open={showTicketTypeModal} title={editingTicketType ? 'Edit tier' : 'New ticket tier'} description={selectedEvent?.name} onClose={closeTicketModal}>
        <form onSubmit={editingTicketType ? handleUpdateTicketType : handleCreateTicketType} className="space-y-4">
          <Field world={W} label="Tier name" htmlFor="tt-name" hint="e.g. General, VIP, Balcony">
            <input id="tt-name" type="text" required value={ticketTypeForm.name} onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, name: e.target.value })} className={t.input} />
          </Field>
          <Field world={W} label="Description" htmlFor="tt-desc">
            <textarea id="tt-desc" required rows={3} value={ticketTypeForm.description} onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, description: e.target.value })} className={t.input} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field world={W} label="Price (₹)" htmlFor="tt-price">
              <input id="tt-price" type="number" required min="0" step="0.01" value={ticketTypeForm.price} onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, price: parseFloat(e.target.value) })} className={t.input} />
            </Field>
            <Field world={W} label="Quantity" htmlFor="tt-qty">
              <input id="tt-qty" type="number" required min="1" value={ticketTypeForm.quantity_total} onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, quantity_total: parseInt(e.target.value) })} className={t.input} />
            </Field>
          </div>
          <Field world={W} label="Benefits" htmlFor="tt-perks" hint="Comma-separated, e.g. Premium seating, backstage access">
            <textarea id="tt-perks" required rows={2} value={ticketTypeForm.benefits} onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, benefits: e.target.value })} className={t.input} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeTicketModal} className={t.btnGhost}>Cancel</button>
            <button type="submit" className={t.btnPrimary}>{editingTicketType ? 'Save tier' : 'Add tier'}</button>
          </div>
        </form>
      </DashModal>

      {/* Bulk seats modal */}
      <DashModal world={W} open={showBulkSeatModal} title="Add seats" description="Lay out a section row by row." onClose={closeSeatModal}>
        <form onSubmit={handleBulkCreateSeats} className="space-y-4">
          <Field world={W} label="Section" htmlFor="s-section" hint="e.g. Stalls, Balcony, VIP Pit">
            <input id="s-section" type="text" required value={bulkSeatConfig.section} onChange={(e) => setBulkSeatConfig({ ...bulkSeatConfig, section: e.target.value })} className={t.input} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field world={W} label="Rows" htmlFor="s-rows" hint="A,B,C or a range A-E">
              <input id="s-rows" type="text" required value={bulkSeatConfig.rows} onChange={(e) => setBulkSeatConfig({ ...bulkSeatConfig, rows: e.target.value })} placeholder="A-E" className={t.input} />
            </Field>
            <Field world={W} label="Seats per row" htmlFor="s-per">
              <input id="s-per" type="number" required min="1" value={bulkSeatConfig.seatsPerRow} onChange={(e) => setBulkSeatConfig({ ...bulkSeatConfig, seatsPerRow: e.target.value })} placeholder="10" className={t.input} />
            </Field>
          </div>
          <Field world={W} label="Ticket tier" htmlFor="s-tier">
            <select id="s-tier" required value={bulkSeatConfig.ticket_type_id || ''} onChange={(e) => setBulkSeatConfig({ ...bulkSeatConfig, ticket_type_id: parseInt(e.target.value) })} className={t.input}>
              <option value="">Choose a tier</option>
              {ticketTypes.map((tt) => (
                <option key={tt.id} value={tt.id}>
                  {tt.name} · {formatINR(tt.price)}
                </option>
              ))}
            </select>
          </Field>
          <p className="rounded-xl bg-[#c4621a]/10 px-4 py-3 text-sm text-[#f0a070]">
            This creates <span className="font-semibold tabular-nums">{Number.isFinite(seatPreview) ? seatPreview : 0}</span> seats.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeSeatModal} className={t.btnGhost}>Cancel</button>
            <button type="submit" className={t.btnPrimary}>Create seats</button>
          </div>
        </form>
      </DashModal>
    </DashboardShell>
  );
};

export default EventOrganizerDashboard;
