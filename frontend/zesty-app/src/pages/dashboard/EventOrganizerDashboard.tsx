import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts';
import { eventAPI, ticketTypeAPI, seatAPI, bookingAPI } from '../../api/eventra';
import type { Event, TicketType, Seat, Booking } from '../../types';
import { LoadingSpinner, ErrorMessage } from '../../components/shared';

interface EventFormData {
  name: string;
  description: string;
  category: string;
  venue_name: string;
  address: string;
  event_date: string;
  event_end_date: string;
}

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
  const [activeTab, setActiveTab] = useState<'events' | 'tickets' | 'seats' | 'bookings' | 'analytics'>('events');

  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [showTicketTypeModal, setShowTicketTypeModal] = useState(false);
  const [showBulkSeatModal, setShowBulkSeatModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingTicketType, setEditingTicketType] = useState<TicketType | null>(null);

  // Form states
  const [eventForm, setEventForm] = useState<EventFormData>({
    name: '',
    description: '',
    category: 'concert',
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
    try {
      const newEvent = await eventAPI.create(eventForm);
      setEvents([...events, newEvent]);
      setShowEventModal(false);
      resetEventForm();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create event');
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    
    try {
      const updated = await eventAPI.update(editingEvent.id, eventForm);
      setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
      if (selectedEvent?.id === updated.id) {
        setSelectedEvent(updated);
      }
      setShowEventModal(false);
      setEditingEvent(null);
      resetEventForm();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update event');
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
    setEventForm({
      name: event.name,
      description: event.description,
      category: event.category,
      venue_name: event.venue_name,
      address: event.address,
      event_date: event.event_date.slice(0, 16),
      event_end_date: event.event_end_date?.slice(0, 16) || '',
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
    setEventForm({
      name: '',
      description: '',
      category: 'concert',
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Event Organizer Dashboard</h1>
          <div className="text-sm text-gray-600">
            Welcome, {user?.first_name} {user?.last_name}
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={loadEvents} />}

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'events'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'tickets'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={!selectedEvent}
          >
            Ticket Types
          </button>
          <button
            onClick={() => setActiveTab('seats')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'seats'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={!selectedEvent}
          >
            Seats
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'bookings'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={!selectedEvent}
          >
            Bookings
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'analytics'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={!selectedEvent}
          >
            Analytics
          </button>
        </div>

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">My Events</h2>
              <button
                onClick={openCreateEventModal}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Create Event
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`p-6 rounded-lg border-2 transition ${
                    selectedEvent?.id === event.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold">{event.name}</h3>
                    <div className="flex gap-1">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          event.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {event.is_published ? 'Published' : 'Draft'}
                      </span>
                      {event.is_cancelled && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                          Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{event.description}</p>
                  <div className="space-y-2 text-sm mb-4">
                    <p>
                      <span className="font-medium">Category:</span> {event.category}
                    </p>
                    <p>
                      <span className="font-medium">Venue:</span> {event.venue_name}
                    </p>
                    <p>
                      <span className="font-medium">Date:</span> {new Date(event.event_date).toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium">Seats:</span> {event.available_seats}/{event.total_seats} available
                    </p>
                    <p>
                      <span className="font-medium">Rating:</span> {event.rating} ⭐ ({event.review_count} reviews)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedEvent(event)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Select
                    </button>
                    <button
                      onClick={() => openEditEventModal(event)}
                      className="flex-1 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleTogglePublished(event)}
                      className={`flex-1 px-3 py-2 rounded text-sm ${
                        event.is_published
                          ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                      disabled={event.is_cancelled}
                    >
                      {event.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => handleCancelEvent(event)}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      disabled={event.is_cancelled}
                    >
                      Cancel Event
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ticket Types Tab */}
        {activeTab === 'tickets' && selectedEvent && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Ticket Types - {selectedEvent.name}</h2>
              <button
                onClick={openCreateTicketTypeModal}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Add Ticket Type
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ticketTypes.map((ticketType) => (
                <div key={ticketType.id} className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">{ticketType.name}</h3>
                    <span className="text-lg font-bold text-blue-600">₹{ticketType.price}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{ticketType.description}</p>
                  <div className="space-y-2 text-sm mb-4">
                    <p>
                      <span className="font-medium">Available:</span> {ticketType.quantity_available}/{ticketType.quantity_total}
                    </p>
                    <p>
                      <span className="font-medium">Benefits:</span> {ticketType.benefits}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditTicketTypeModal(ticketType)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTicketType(ticketType.id)}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seats Tab */}
        {activeTab === 'seats' && selectedEvent && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Seat Layout - {selectedEvent.name}</h2>
              <button
                onClick={() => setShowBulkSeatModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Bulk Create Seats
              </button>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="mb-4 flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Available ({seats.filter(s => s.status === 'available').length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>Booked ({seats.filter(s => s.status === 'booked').length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>Reserved ({seats.filter(s => s.status === 'reserved').length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-500 rounded"></div>
                  <span>Blocked ({seats.filter(s => s.status === 'blocked').length})</span>
                </div>
              </div>
              {seats.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No seats created yet. Click "Bulk Create Seats" to add seats.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Section</th>
                        <th className="text-left py-2 px-4">Row</th>
                        <th className="text-left py-2 px-4">Seat</th>
                        <th className="text-left py-2 px-4">Ticket Type</th>
                        <th className="text-left py-2 px-4">Price</th>
                        <th className="text-left py-2 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seats.slice(0, 50).map((seat) => (
                        <tr key={seat.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-4">{seat.section}</td>
                          <td className="py-2 px-4">{seat.row}</td>
                          <td className="py-2 px-4">{seat.seat_number}</td>
                          <td className="py-2 px-4">{seat.ticket_type_name}</td>
                          <td className="py-2 px-4">₹{seat.price}</td>
                          <td className="py-2 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                seat.status === 'available'
                                  ? 'bg-green-100 text-green-800'
                                  : seat.status === 'booked'
                                  ? 'bg-red-100 text-red-800'
                                  : seat.status === 'reserved'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {seat.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {seats.length > 50 && (
                    <p className="text-center text-gray-500 mt-4">
                      Showing first 50 of {seats.length} seats
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && selectedEvent && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Bookings - {selectedEvent.name}</h2>
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No bookings yet</div>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Booking #{booking.booking_reference}</h3>
                        <p className="text-gray-600 text-sm">{new Date(booking.booking_date).toLocaleString()}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          booking.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : booking.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {booking.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Seats:</h4>
                      <div className="flex flex-wrap gap-2">
                        {booking.booked_seats.map((bs) => (
                          <span key={bs.id} className="px-2 py-1 bg-gray-100 rounded text-sm">
                            {bs.seat.section} - Row {bs.seat.row}, Seat {bs.seat.seat_number}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600">Total Tickets: {booking.total_tickets}</p>
                          <p className="text-sm text-gray-600">Subtotal: ₹{booking.subtotal}</p>
                          <p className="text-sm text-gray-600">Tax: ₹{booking.tax}</p>
                          <p className="font-semibold text-lg">Total: ₹{booking.total}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && selectedEvent && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Analytics - {selectedEvent.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-gray-600 text-sm font-medium mb-2">Total Bookings</h3>
                <p className="text-3xl font-bold text-blue-600">{analytics.totalBookings}</p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-gray-600 text-sm font-medium mb-2">Total Revenue</h3>
                <p className="text-3xl font-bold text-green-600">₹{analytics.revenue.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-gray-600 text-sm font-medium mb-2">Available Seats</h3>
                <p className="text-3xl font-bold text-yellow-600">{analytics.availableSeats}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Event Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Seats</p>
                  <p className="font-medium">{selectedEvent.total_seats}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Reviews</p>
                  <p className="font-medium">{selectedEvent.review_count}</p>
                </div>
                <div>
                  <p className="text-gray-600">Average Rating</p>
                  <p className="font-medium">{selectedEvent.rating} ⭐</p>
                </div>
                <div>
                  <p className="text-gray-600">Event Date</p>
                  <p className="font-medium">{new Date(selectedEvent.event_date).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className={`font-medium ${selectedEvent.is_published ? 'text-green-600' : 'text-yellow-600'}`}>
                    {selectedEvent.is_published ? 'Published' : 'Draft'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Cancelled</p>
                  <p className={`font-medium ${selectedEvent.is_cancelled ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedEvent.is_cancelled ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Event Modal */}
        {showEventModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">
                  {editingEvent ? 'Edit Event' : 'Create Event'}
                </h2>
                <form onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Event Name</label>
                      <input
                        type="text"
                        value={eventForm.name}
                        onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={eventForm.description}
                        onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Category</label>
                      <select
                        value={eventForm.category}
                        onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="movie">Movie</option>
                        <option value="concert">Concert</option>
                        <option value="sports">Sports</option>
                        <option value="theater">Theater</option>
                        <option value="comedy">Comedy</option>
                        <option value="expo">Expo</option>
                        <option value="dining">Dining</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Venue Name</label>
                      <input
                        type="text"
                        value={eventForm.venue_name}
                        onChange={(e) => setEventForm({ ...eventForm, venue_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Address</label>
                      <input
                        type="text"
                        value={eventForm.address}
                        onChange={(e) => setEventForm({ ...eventForm, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Event Start Date & Time</label>
                        <input
                          type="datetime-local"
                          value={eventForm.event_date}
                          onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Event End Date & Time (Optional)</label>
                        <input
                          type="datetime-local"
                          value={eventForm.event_end_date}
                          onChange={(e) => setEventForm({ ...eventForm, event_end_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-6">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {editingEvent ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEventModal(false);
                        setEditingEvent(null);
                        resetEventForm();
                      }}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Ticket Type Modal */}
        {showTicketTypeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">
                  {editingTicketType ? 'Edit Ticket Type' : 'Add Ticket Type'}
                </h2>
                <form onSubmit={editingTicketType ? handleUpdateTicketType : handleCreateTicketType}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Ticket Type Name</label>
                      <input
                        type="text"
                        value={ticketTypeForm.name}
                        onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., VIP, Standard, General"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={ticketTypeForm.description}
                        onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Price (₹)</label>
                        <input
                          type="number"
                          value={ticketTypeForm.price}
                          onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, price: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Total Quantity</label>
                        <input
                          type="number"
                          value={ticketTypeForm.quantity_total}
                          onChange={(e) =>
                            setTicketTypeForm({ ...ticketTypeForm, quantity_total: parseInt(e.target.value) })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Benefits</label>
                      <textarea
                        value={ticketTypeForm.benefits}
                        onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, benefits: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        placeholder="e.g., Premium seating, backstage access"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-6">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {editingTicketType ? 'Update' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTicketTypeModal(false);
                        setEditingTicketType(null);
                        resetTicketTypeForm();
                      }}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Seat Creation Modal */}
        {showBulkSeatModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Bulk Create Seats</h2>
                <form onSubmit={handleBulkCreateSeats}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Section Name</label>
                      <input
                        type="text"
                        value={bulkSeatConfig.section}
                        onChange={(e) => setBulkSeatConfig({ ...bulkSeatConfig, section: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Section A, VIP Section"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Rows</label>
                      <input
                        type="text"
                        value={bulkSeatConfig.rows}
                        onChange={(e) => setBulkSeatConfig({ ...bulkSeatConfig, rows: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., A,B,C or A-E"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter comma-separated rows (A,B,C) or a range (A-E)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Seats Per Row</label>
                      <input
                        type="number"
                        value={bulkSeatConfig.seatsPerRow}
                        onChange={(e) => setBulkSeatConfig({ ...bulkSeatConfig, seatsPerRow: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 10"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Ticket Type</label>
                      <select
                        value={bulkSeatConfig.ticket_type_id}
                        onChange={(e) =>
                          setBulkSeatConfig({ ...bulkSeatConfig, ticket_type_id: parseInt(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Ticket Type</option>
                        {ticketTypes.map((tt) => (
                          <option key={tt.id} value={tt.id}>
                            {tt.name} - ₹{tt.price}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="bg-blue-50 p-4 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>Preview:</strong> This will create approximately{' '}
                        {bulkSeatConfig.rows && bulkSeatConfig.seatsPerRow
                          ? (bulkSeatConfig.rows.includes('-')
                              ? generateRowRange(bulkSeatConfig.rows).length
                              : bulkSeatConfig.rows.split(',').length) * parseInt(bulkSeatConfig.seatsPerRow || '0')
                          : 0}{' '}
                        seats
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-6">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Create Seats
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBulkSeatModal(false);
                        setBulkSeatConfig({ section: '', rows: '', seatsPerRow: '', ticket_type_id: 0 });
                      }}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventOrganizerDashboard;
