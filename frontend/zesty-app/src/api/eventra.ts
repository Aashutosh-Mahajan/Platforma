import apiClient from './client';
import type { Event, Seat, Booking, EventReview, PaginatedResponse } from '../types';

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

const normalizeTicketType = (ticketType: any) => ({
  ...ticketType,
  price: toNumber(ticketType?.price),
  quantity_total: toNumber(ticketType?.quantity_total),
  quantity_available: toNumber(ticketType?.quantity_available),
});

const normalizeSeat = (seat: any): Seat => ({
  ...seat,
  price: toNumber(seat?.price),
});

const normalizeEvent = (event: any): Event => ({
  ...event,
  rating: toNumber(event?.rating),
  review_count: toNumber(event?.review_count),
  total_seats: toNumber(event?.total_seats),
  available_seats: toNumber(event?.available_seats),
  ticket_types: Array.isArray(event?.ticket_types)
    ? event.ticket_types.map(normalizeTicketType)
    : event?.ticket_types,
});

const normalizeBooking = (booking: any): Booking => ({
  ...booking,
  total_tickets: toNumber(booking?.total_tickets),
  subtotal: toNumber(booking?.subtotal),
  tax: toNumber(booking?.tax),
  total: toNumber(booking?.total),
  booked_seats: Array.isArray(booking?.booked_seats)
    ? booking.booked_seats.map((bookedSeat: any) => ({
        ...bookedSeat,
        seat: normalizeSeat(bookedSeat?.seat),
      }))
    : [],
});

const normalizePaginated = <T>(responseData: any, normalizer: (item: any) => T): PaginatedResponse<T> => ({
  ...responseData,
  results: Array.isArray(responseData?.results)
    ? responseData.results.map(normalizer)
    : [],
});

export interface EventListParams {
  search?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  min_price?: number;
  max_price?: number;
  city?: string;
  ordering?: string;
  page?: number;
  limit?: number;
}

export interface SeatListParams {
  ticket_type_id?: number;
  section?: string;
  status?: string;
}

export interface BookingCreateData {
  event_id: number;
  payment_method: string;
  tickets: Array<{
    ticket_type_id: number;
    quantity: number;
    seats: number[];
  }>;
}

export interface EventReviewCreateData {
  rating: number;
  comment?: string;
}

export interface EventCreateData {
  name: string;
  description: string;
  category: string;
  venue_name: string;
  address: string;
  event_date: string;
  event_end_date?: string;
}

export interface TicketTypeCreateData {
  event: number;
  name: string;
  price: number;
  quantity_total: number;
  description: string;
  benefits: string;
}

export interface SeatCreateData {
  event: number;
  section: string;
  row: string;
  seat_number: string;
  ticket_type_id: number;
}

export interface BulkSeatCreateData {
  event_id: number;
  seats: Array<{
    section: string;
    row: string;
    seat_number: string;
    ticket_type_id: number;
  }>;
}

export const eventAPI = {
  list: async (params?: EventListParams): Promise<PaginatedResponse<Event>> => {
    const response = await apiClient.get('/eventra/events/', { params });
    return normalizePaginated(response.data, normalizeEvent);
  },

  retrieve: async (id: number): Promise<Event> => {
    const response = await apiClient.get(`/eventra/events/${id}/`);
    return normalizeEvent(response.data);
  },

  create: async (data: EventCreateData): Promise<Event> => {
    const response = await apiClient.post('/eventra/events/', data);
    return normalizeEvent(response.data);
  },

  update: async (id: number, data: Partial<EventCreateData>): Promise<Event> => {
    const response = await apiClient.patch(`/eventra/events/${id}/`, data);
    return normalizeEvent(response.data);
  },

  togglePublished: async (id: number): Promise<Event> => {
    const response = await apiClient.patch(`/eventra/events/${id}/toggle_published/`);
    return normalizeEvent(response.data);
  },

  cancelEvent: async (id: number): Promise<Event> => {
    const response = await apiClient.patch(`/eventra/events/${id}/cancel_event/`);
    return normalizeEvent(response.data);
  },

  getSeats: async (id: number, params?: SeatListParams): Promise<{ sections: Array<{ name: string; seats: Seat[] }> }> => {
    const response = await apiClient.get(`/eventra/events/${id}/seats/`, { params });
    return {
      ...response.data,
      sections: Array.isArray(response.data?.sections)
        ? response.data.sections.map((section: any) => ({
            ...section,
            seats: Array.isArray(section?.seats)
              ? section.seats.map(normalizeSeat)
              : [],
          }))
        : [],
    };
  },

  getReviews: async (id: number): Promise<PaginatedResponse<EventReview>> => {
    const response = await apiClient.get(`/eventra/events/${id}/reviews/`);
    return normalizePaginated(response.data, (review: any) => ({
      ...review,
      rating: toNumber(review?.rating),
    }));
  },

  createReview: async (id: number, data: EventReviewCreateData): Promise<EventReview> => {
    const response = await apiClient.post(`/eventra/events/${id}/reviews/`, data);
    return {
      ...response.data,
      rating: toNumber(response.data?.rating),
    };
  },
};

export const bookingAPI = {
  list: async (status?: string): Promise<PaginatedResponse<Booking>> => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/eventra/bookings/', { params });
    return normalizePaginated(response.data, normalizeBooking);
  },

  create: async (data: BookingCreateData): Promise<Booking> => {
    const response = await apiClient.post('/eventra/bookings/', data);
    return normalizeBooking(response.data);
  },

  retrieve: async (id: number): Promise<Booking> => {
    const response = await apiClient.get(`/eventra/bookings/${id}/`);
    return normalizeBooking(response.data);
  },

  cancel: async (id: number): Promise<{ booking: Booking; message: string; refund_amount: number }> => {
    const response = await apiClient.patch(`/eventra/bookings/${id}/cancel/`);
    return {
      ...response.data,
      booking: normalizeBooking(response.data?.booking),
      refund_amount: toNumber(response.data?.refund_amount),
    };
  },
};

export const ticketTypeAPI = {
  list: async (): Promise<PaginatedResponse<any>> => {
    const response = await apiClient.get('/eventra/ticket-types/');
    return normalizePaginated(response.data, normalizeTicketType);
  },

  create: async (data: TicketTypeCreateData): Promise<any> => {
    const response = await apiClient.post('/eventra/ticket-types/', data);
    return normalizeTicketType(response.data);
  },

  update: async (id: number, data: Partial<TicketTypeCreateData>): Promise<any> => {
    const response = await apiClient.patch(`/eventra/ticket-types/${id}/`, data);
    return normalizeTicketType(response.data);
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/eventra/ticket-types/${id}/`);
  },
};

export const seatAPI = {
  list: async (): Promise<PaginatedResponse<Seat>> => {
    const response = await apiClient.get('/eventra/seats/');
    return normalizePaginated(response.data, normalizeSeat);
  },

  create: async (data: SeatCreateData): Promise<Seat> => {
    const response = await apiClient.post('/eventra/seats/', data);
    return normalizeSeat(response.data);
  },

  bulkCreate: async (data: BulkSeatCreateData): Promise<{ count: number; seats: Seat[] }> => {
    const response = await apiClient.post('/eventra/seats/bulk_create/', data);
    return {
      ...response.data,
      count: toNumber(response.data?.count),
      seats: Array.isArray(response.data?.seats)
        ? response.data.seats.map(normalizeSeat)
        : [],
    };
  },

  update: async (id: number, data: Partial<SeatCreateData>): Promise<Seat> => {
    const response = await apiClient.patch(`/eventra/seats/${id}/`, data);
    return normalizeSeat(response.data);
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/eventra/seats/${id}/`);
  },
};
