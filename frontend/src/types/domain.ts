export type ApiListResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type Restaurant = {
  id: number;
  name: string;
  description: string;
  cuisine_types: string;
  address: string;
  delivery_fee: string;
  delivery_time_min: number;
  delivery_time_max: number;
  image: string | null;
  rating: string;
  review_count: number;
  is_active: boolean;
};

export type EventItem = {
  id: number;
  name: string;
  description: string;
  category: string;
  venue_name: string;
  address: string;
  event_date: string;
  event_end_date: string | null;
  image: string | null;
  rating: string;
  review_count: number;
  total_seats: number;
  available_seats: number;
  is_published: boolean;
};

export type OrderItem = {
  id: number;
  menu_item: {
    id: number;
    name: string;
    description: string;
    price: string;
    category: string;
    image: string | null;
    is_vegetarian: boolean;
    is_vegan: boolean;
    is_available: boolean;
  };
  quantity: number;
  unit_price: string;
  total: string;
};

export type Order = {
  id: number;
  restaurant: number;
  restaurant_name: string;
  status: string;
  items: OrderItem[];
  subtotal: string;
  delivery_fee: string;
  tax: string;
  total: string;
  special_instructions: string;
  created_at: string;
  updated_at: string;
};

export type EventBooking = {
  id: number;
  booking_reference: string;
  event: number;
  event_name: string;
  status: string;
  total_tickets: number;
  subtotal: string;
  tax: string;
  total: string;
  booking_date: string;
};
