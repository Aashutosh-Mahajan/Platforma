// User and Authentication Types
export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  avatar?: string;
  role: 'customer' | 'restaurant_owner' | 'event_organizer' | 'delivery_partner' | 'admin';
  is_email_verified: boolean;
  is_phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: number;
  label: 'home' | 'work' | 'other';
  street: string;
  city: string;
  state: string;
  postal_code: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  created_at: string;
}

// Zesty Types
export interface Restaurant {
  id: number;
  slug: string;
  area: string;
  cuisine: string;
  price_range: number;
  image_url: string;
  hours: string;
  is_open: boolean;
  veg_only: boolean;

  // Existing zesty fields kept for compatibility across current pages.
  owner: number;
  name: string;
  description: string;
  cuisine_types: string;
  address: string;
  latitude?: number;
  longitude?: number;
  delivery_fee: number;
  delivery_time_min: number;
  delivery_time_max: number;
  image?: string;
  banner?: string;
  phone: string;
  rating: number;
  review_count: number;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: number;
  restaurant: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_available: boolean;
  created_at: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Order {
  id: number;
  user: number;
  restaurant: number;
  restaurant_name: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  delivery_address: Address;
  estimated_delivery?: string;
  actual_delivery?: string;
  special_instructions: string;
  payment?: Payment;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  menu_item: MenuItem;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface DeliveryTracking {
  order_status: string;
  delivery_partner_name: string;
  delivery_partner_phone: string;
  latitude: string;
  longitude: string;
  eta: string;
  updated_at: string;
}

// Eventra Types
export interface Event {
  id: number;
  organizer: number;
  name: string;
  description: string;
  category: 'movie' | 'concert' | 'sports' | 'theater' | 'comedy' | 'expo' | 'dining';
  venue_name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  event_date: string;
  event_end_date?: string;
  image?: string;
  banner?: string;
  rating: number;
  review_count: number;
  total_seats: number;
  available_seats: number;
  is_published: boolean;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
  ticket_types?: TicketType[];
}

export interface TicketType {
  id: number;
  event: number;
  name: string;
  price: number;
  quantity_total: number;
  quantity_available: number;
  description: string;
  benefits: string;
}

export interface Seat {
  id: number;
  event: number;
  section: string;
  row: string;
  seat_number: string;
  status: 'available' | 'booked' | 'reserved' | 'blocked';
  ticket_type_name: string;
  price: number;
}

export interface Booking {
  id: number;
  user: number;
  booking_reference: string;
  event: number;
  event_name: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  total_tickets: number;
  subtotal: number;
  tax: number;
  total: number;
  booked_seats: BookingSeat[];
  payment?: Payment;
  booking_date: string;
  confirmation_sent?: string;
}

export interface BookingSeat {
  id: number;
  seat: Seat;
}

export interface EventReview {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface EventAnalytics {
  id: number;
  event: number;
  views: number;
  bookings_count: number;
  revenue: number;
  updated_at: string;
}

// Payment Types
export interface Payment {
  id: number;
  user: number;
  amount: number;
  currency: string;
  method: 'credit_card' | 'debit_card' | 'upi' | 'wallet' | 'net_banking' | 'cash_on_delivery';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  content_type?: string;
  object_id?: number;
  created_at: string;
  updated_at: string;
}

// Notification Types
export interface Notification {
  id: number;
  type: 'order_status' | 'booking_confirmation' | 'event_reminder' | 'promotion' | 'system';
  title: string;
  message: string;
  related_id?: number;
  related_type?: string;
  is_read: boolean;
  created_at: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface ErrorResponse {
  detail?: string;
  [key: string]: any;
}

export interface AuthResponse {
  access: string;
  refresh: string;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthResponse;
}

// Request Types
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role?: 'customer' | 'restaurant_owner' | 'event_organizer';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateOrderRequest {
  restaurant_id: number;
  delivery_address_id: number;
  special_instructions?: string;
  payment_method: 'credit_card' | 'debit_card' | 'upi' | 'wallet' | 'net_banking' | 'cash_on_delivery';
  items: {
    menu_item_id: number;
    quantity: number;
  }[];
}

export interface CreateBookingRequest {
  event_id: number;
  payment_method: 'credit_card' | 'debit_card' | 'upi' | 'wallet' | 'net_banking';
  tickets: {
    ticket_type_id: number;
    quantity: number;
    seats: number[];
  }[];
}

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar?: File;
}

export interface CreateAddressRequest {
  label: 'home' | 'work' | 'other';
  street: string;
  city: string;
  state: string;
  postal_code: string;
  is_default?: boolean;
}

export interface UpdateOrderStatusRequest {
  status: 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered';
}
