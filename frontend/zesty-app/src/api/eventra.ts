import apiClient from './client';
import type { Event, Seat, Booking, EventReview, PaginatedResponse } from '../types';

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
    return response.data;
  },

  retrieve: async (id: number): Promise<Event> => {
    const response = await apiClient.get(`/eventra/events/${id}/`);
    return response.data;
  },

  create: async (data: EventCreateData): Promise<Event> => {
    const response = await apiClient.post('/eventra/events/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<EventCreateData>): Promise<Event> => {
    const response = await apiClient.patch(`/eventra/events/${id}/`, data);
    return response.data;
  },

  togglePublished: async (id: number): Promise<Event> => {
    const response = await apiClient.patch(`/eventra/events/${id}/toggle_published/`);
    return response.data;
  },

  cancelEvent: async (id: number): Promise<Event> => {
    const response = await apiClient.patch(`/eventra/events/${id}/cancel_event/`);
    return response.data;
  },

  getSeats: async (id: number, params?: SeatListParams): Promise<{ sections: Array<{ name: string; seats: Seat[] }> }> => {
    const response = await apiClient.get(`/eventra/events/${id}/seats/`, { params });
    return response.data;
  },

  getReviews: async (id: number): Promise<PaginatedResponse<EventReview>> => {
    const response = await apiClient.get(`/eventra/events/${id}/reviews/`);
    return response.data;
  },

  createReview: async (id: number, data: EventReviewCreateData): Promise<EventReview> => {
    const response = await apiClient.post(`/eventra/events/${id}/reviews/`, data);
    return response.data;
  },
};

export const bookingAPI = {
  list: async (status?: string): Promise<PaginatedResponse<Booking>> => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/eventra/bookings/', { params });
    return response.data;
  },

  create: async (data: BookingCreateData): Promise<Booking> => {
    const response = await apiClient.post('/eventra/bookings/', data);
    return response.data;
  },

  retrieve: async (id: number): Promise<Booking> => {
    const response = await apiClient.get(`/eventra/bookings/${id}/`);
    return response.data;
  },

  cancel: async (id: number): Promise<{ booking: Booking; message: string; refund_amount: number }> => {
    const response = await apiClient.patch(`/eventra/bookings/${id}/cancel/`);
    return response.data;
  },
};

export const ticketTypeAPI = {
  list: async (): Promise<PaginatedResponse<any>> => {
    const response = await apiClient.get('/eventra/ticket-types/');
    return response.data;
  },

  create: async (data: TicketTypeCreateData): Promise<any> => {
    const response = await apiClient.post('/eventra/ticket-types/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<TicketTypeCreateData>): Promise<any> => {
    const response = await apiClient.patch(`/eventra/ticket-types/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/eventra/ticket-types/${id}/`);
  },
};

export const seatAPI = {
  list: async (): Promise<PaginatedResponse<Seat>> => {
    const response = await apiClient.get('/eventra/seats/');
    return response.data;
  },

  create: async (data: SeatCreateData): Promise<Seat> => {
    const response = await apiClient.post('/eventra/seats/', data);
    return response.data;
  },

  bulkCreate: async (data: BulkSeatCreateData): Promise<{ count: number; seats: Seat[] }> => {
    const response = await apiClient.post('/eventra/seats/bulk_create/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<SeatCreateData>): Promise<Seat> => {
    const response = await apiClient.patch(`/eventra/seats/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/eventra/seats/${id}/`);
  },
};
