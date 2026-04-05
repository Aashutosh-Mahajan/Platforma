# Design Document: Complete Platform Integration

## Overview

This design document specifies the complete integration of the Platforma dual-platform application, combining Zesty (food delivery) and Eventra (event booking) services. The system consists of a Django REST API backend with JWT authentication and a React + TypeScript + Vite frontend application.

The primary goal is to transform existing static HTML templates into a fully functional full-stack application with proper authentication flows, state management, API integration, payment processing, and role-based dashboards for restaurant owners and event organizers.

### System Components

- **Backend API**: Django REST Framework with JWT authentication, PostgreSQL/SQLite database
- **Frontend Application**: React 18 + TypeScript + Vite + Tailwind CSS
- **Authentication**: JWT-based with access/refresh token management
- **Payment System**: Simulated payment gateway for development
- **Notification System**: Real-time notification polling for order/booking updates

### Key Features

1. User authentication and profile management
2. Restaurant browsing, menu viewing, cart management, and order placement
3. Event browsing, seat selection, and booking management
4. Restaurant owner dashboard for managing restaurants, menus, and orders
5. Event organizer dashboard for managing events, tickets, and bookings
6. Real-time order tracking and booking confirmations
7. Review system for restaurants and events
8. Notification system for status updates

## Architecture

### System Architecture

The application follows a client-server architecture with clear separation between frontend and backend:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Auth       │  │   Zesty      │  │   Eventra    │     │
│  │   Pages      │  │   Pages      │  │   Pages      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                  │              │
│  ┌──────────────────────────────────────────────────┐     │
│  │          State Management (Context API)          │     │
│  └──────────────────────────────────────────────────┘     │
│         │                                                   │
│  ┌──────────────────────────────────────────────────┐     │
│  │          API Client (Axios + Interceptors)       │     │
│  └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                    HTTPS/JSON
                           │
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (Django REST)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Core       │  │   Zesty      │  │   Eventra    │     │
│  │   (Auth)     │  │   (Orders)   │  │   (Bookings) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                  │              │
│  ┌──────────────────────────────────────────────────┐     │
│  │              Django ORM / Database               │     │
│  └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```


### Frontend Architecture

The frontend follows a component-based architecture with the following layers:

1. **Presentation Layer**: React components organized by feature (auth, zesty, eventra, dashboard)
2. **State Management Layer**: React Context API for global state (auth, cart, notifications)
3. **API Layer**: Centralized API client with interceptors for authentication and error handling
4. **Routing Layer**: React Router with protected and role-based routes

### Backend Architecture

The backend follows Django's MVT pattern with REST API endpoints:

1. **Models Layer**: Django ORM models for User, Restaurant, MenuItem, Order, Event, Seat, Booking
2. **Serializers Layer**: DRF serializers for request/response validation and transformation
3. **Views Layer**: ViewSets and APIViews for handling HTTP requests
4. **Authentication Layer**: JWT token-based authentication with SimpleJWT

### Data Flow

**Authentication Flow:**
```
User → Login Form → API Client → /api/auth/login/ → JWT Tokens → Store in Memory → Include in Headers
```

**Order Flow:**
```
User → Browse Restaurants → View Menu → Add to Cart → Checkout → Create Order → Simulate Payment → Confirm Order → Track Status
```

**Booking Flow:**
```
User → Browse Events → View Details → Select Seats → Checkout → Create Booking → Simulate Payment → Confirm Booking → View Tickets
```

## Components and Interfaces

### Frontend Components

#### Authentication Components

**LoginPage**
- Purpose: User login interface
- Props: None (uses routing)
- State: email, password, errors, loading
- API Calls: POST /api/auth/login/
- Navigation: Redirects to home on success

**RegisterPage**
- Purpose: User registration interface
- Props: None (uses routing)
- State: formData (email, username, password, firstName, lastName, role), errors, loading
- API Calls: POST /api/auth/register/
- Navigation: Redirects to home on success

**ProfilePage**
- Purpose: View and edit user profile
- Props: None (uses auth context)
- State: userData, editing, errors, loading
- API Calls: GET /api/users/profile/, PATCH /api/users/profile/
- Protected: Requires authentication


#### Zesty Components

**RestaurantListPage**
- Purpose: Browse and filter restaurants
- Props: None (uses routing)
- State: restaurants, filters (search, cuisine, rating), sorting, loading, pagination
- API Calls: GET /api/zesty/restaurants/
- Features: Search, filter, sort, infinite scroll

**RestaurantDetailPage**
- Purpose: View restaurant details and menu
- Props: restaurantId (from route params)
- State: restaurant, menuItems, categories, cart, loading
- API Calls: GET /api/zesty/restaurants/:id/, GET /api/zesty/restaurants/:id/menu/
- Features: Category filtering, add to cart, view reviews

**CartPage**
- Purpose: Review cart and proceed to checkout
- Props: None (uses cart context)
- State: cartItems, restaurant, totals
- Features: Update quantities, remove items, clear cart, proceed to checkout

**CheckoutPage**
- Purpose: Complete order with address and payment
- Props: None (uses cart context)
- State: selectedAddress, paymentMethod, specialInstructions, loading
- API Calls: GET /api/users/addresses/, POST /api/zesty/orders/
- Features: Address selection, payment method selection, order confirmation

**OrderHistoryPage**
- Purpose: View past orders
- Props: None (uses auth context)
- State: orders, filters (status), loading
- API Calls: GET /api/zesty/orders/
- Features: Filter by status, view order details

**OrderDetailPage**
- Purpose: View order details and track status
- Props: orderId (from route params)
- State: order, tracking, loading, polling
- API Calls: GET /api/zesty/orders/:id/, GET /api/zesty/orders/:id/tracking/
- Features: Status timeline, delivery tracking, cancel order, polling for updates

#### Eventra Components

**EventListPage**
- Purpose: Browse and filter events
- Props: None (uses routing)
- State: events, filters (category, date, price, search), sorting, loading, pagination
- API Calls: GET /api/eventra/events/
- Features: Category tabs, search, filter, sort, infinite scroll

**EventDetailPage**
- Purpose: View event details and ticket types
- Props: eventId (from route params)
- State: event, ticketTypes, reviews, loading
- API Calls: GET /api/eventra/events/:id/
- Features: View details, select ticket type, view reviews, book tickets

**SeatSelectionPage**
- Purpose: Select seats for booking
- Props: eventId, ticketTypeId (from route params/state)
- State: seats, selectedSeats, seatMap, loading
- API Calls: GET /api/eventra/events/:id/seats/
- Features: Visual seat map, seat selection, booking summary

**BookingCheckoutPage**
- Purpose: Complete booking with payment
- Props: None (uses booking context)
- State: selectedSeats, event, paymentMethod, loading
- API Calls: POST /api/eventra/bookings/
- Features: Payment method selection, booking confirmation

**BookingHistoryPage**
- Purpose: View past bookings
- Props: None (uses auth context)
- State: bookings, filters (status), loading
- API Calls: GET /api/eventra/bookings/
- Features: Filter by status, view booking details

**BookingDetailPage**
- Purpose: View booking details and tickets
- Props: bookingId (from route params)
- State: booking, loading
- API Calls: GET /api/eventra/bookings/:id/
- Features: QR code, seat details, cancel booking, download ticket


#### Dashboard Components

**RestaurantOwnerDashboard**
- Purpose: Manage restaurants, menus, and orders
- Props: None (uses auth context)
- State: restaurants, selectedRestaurant, menuItems, orders, analytics
- API Calls: GET /api/zesty/restaurants/, POST /api/zesty/restaurants/, GET /api/zesty/orders/
- Protected: Requires 'restaurant_owner' role
- Features: CRUD restaurants, CRUD menu items, update order status, view analytics

**EventOrganizerDashboard**
- Purpose: Manage events, tickets, and bookings
- Props: None (uses auth context)
- State: events, selectedEvent, ticketTypes, seats, bookings, analytics
- API Calls: GET /api/eventra/events/, POST /api/eventra/events/, GET /api/eventra/bookings/
- Protected: Requires 'event_organizer' role
- Features: CRUD events, CRUD ticket types, manage seats, view bookings, view analytics

#### Shared Components

**Header**
- Purpose: Navigation and user menu
- Props: None (uses auth context)
- Features: Logo, navigation links, notification icon, user menu, logout

**NotificationDropdown**
- Purpose: Display recent notifications
- Props: None (uses notification context)
- State: notifications, unreadCount, loading
- API Calls: GET /api/notifications/, PATCH /api/notifications/:id/mark_read/
- Features: Display notifications, mark as read, navigate to related items

**ProtectedRoute**
- Purpose: Protect routes requiring authentication
- Props: children, requiredRole (optional)
- Features: Redirect to login if not authenticated, check role if specified

**LoadingSpinner**
- Purpose: Display loading state
- Props: size, message

**ErrorMessage**
- Purpose: Display error messages
- Props: message, onRetry

### Backend API Endpoints

#### Authentication Endpoints

**POST /api/auth/register/**
- Purpose: Register new user
- Request Body:
  ```json
  {
    "email": "user@example.com",
    "username": "username",
    "password": "SecurePass123",
    "password_confirm": "SecurePass123",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+919876543210",
    "role": "customer"
  }
  ```
- Response (201):
  ```json
  {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "username",
      "first_name": "John",
      "last_name": "Doe",
      "role": "customer"
    },
    "tokens": {
      "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
      "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
    }
  }
  ```
- Errors: 400 (validation errors)

**POST /api/auth/login/**
- Purpose: Login user
- Request Body:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123"
  }
  ```
- Response (200):
  ```json
  {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
  ```
- Errors: 401 (invalid credentials)

**POST /api/auth/token/refresh/**
- Purpose: Refresh access token
- Request Body:
  ```json
  {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
  ```
- Response (200):
  ```json
  {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
  ```
- Errors: 401 (invalid/expired refresh token)

**POST /api/auth/logout/**
- Purpose: Logout user (blacklist refresh token)
- Request Body:
  ```json
  {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
  ```
- Response (200):
  ```json
  {
    "message": "Successfully logged out."
  }
  ```


#### User Endpoints

**GET /api/users/profile/**
- Purpose: Get authenticated user profile
- Auth: Required
- Response (200):
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+919876543210",
    "avatar": "/media/avatars/user.jpg",
    "role": "customer",
    "is_email_verified": false,
    "created_at": "2024-01-01T00:00:00Z"
  }
  ```

**PATCH /api/users/profile/**
- Purpose: Update user profile
- Auth: Required
- Request Body:
  ```json
  {
    "first_name": "Jane",
    "phone": "+919876543211"
  }
  ```
- Response (200): Updated user object

#### Address Endpoints

**GET /api/users/addresses/**
- Purpose: List user addresses
- Auth: Required
- Response (200):
  ```json
  {
    "count": 2,
    "results": [
      {
        "id": 1,
        "label": "home",
        "street": "123 Main St",
        "city": "Mumbai",
        "state": "Maharashtra",
        "postal_code": "400001",
        "is_default": true,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
  ```

**POST /api/users/addresses/**
- Purpose: Create new address
- Auth: Required
- Request Body:
  ```json
  {
    "label": "work",
    "street": "456 Office Rd",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postal_code": "400002",
    "is_default": false
  }
  ```
- Response (201): Created address object

**PATCH /api/users/addresses/:id/**
- Purpose: Update address
- Auth: Required
- Request Body: Partial address fields
- Response (200): Updated address object

**DELETE /api/users/addresses/:id/**
- Purpose: Delete address
- Auth: Required
- Response (204): No content

#### Restaurant Endpoints

**GET /api/zesty/restaurants/**
- Purpose: List restaurants with filters
- Auth: Required
- Query Params:
  - search: string (name or cuisine)
  - ordering: string (rating, delivery_fee, delivery_time_max)
  - page: number
- Response (200):
  ```json
  {
    "count": 50,
    "next": "/api/zesty/restaurants/?page=2",
    "previous": null,
    "results": [
      {
        "id": 1,
        "name": "Pizza Palace",
        "description": "Best pizza in town",
        "cuisine_types": "Italian, Pizza",
        "address": "123 Food St, Mumbai",
        "delivery_fee": "50.00",
        "delivery_time_min": 20,
        "delivery_time_max": 40,
        "image": "/media/restaurants/pizza.jpg",
        "rating": "4.50",
        "review_count": 120,
        "is_active": true
      }
    ]
  }
  ```

**GET /api/zesty/restaurants/:id/**
- Purpose: Get restaurant details with menu
- Auth: Required
- Response (200):
  ```json
  {
    "id": 1,
    "name": "Pizza Palace",
    "description": "Best pizza in town",
    "cuisine_types": "Italian, Pizza",
    "address": "123 Food St, Mumbai",
    "delivery_fee": "50.00",
    "delivery_time_min": 20,
    "delivery_time_max": 40,
    "image": "/media/restaurants/pizza.jpg",
    "banner": "/media/restaurant_banners/pizza_banner.jpg",
    "phone": "+919876543210",
    "rating": "4.50",
    "review_count": 120,
    "is_active": true,
    "menu_items": [
      {
        "id": 1,
        "name": "Margherita Pizza",
        "description": "Classic tomato and mozzarella",
        "price": "299.00",
        "category": "Pizza",
        "image": "/media/menu_items/margherita.jpg",
        "is_vegetarian": true,
        "is_vegan": false,
        "is_available": true
      }
    ]
  }
  ```

**GET /api/zesty/restaurants/:id/menu/**
- Purpose: Get menu items for restaurant
- Auth: Required
- Query Params:
  - category: string
  - search: string
- Response (200):
  ```json
  {
    "count": 15,
    "results": [/* menu items */]
  }
  ```

**GET /api/zesty/restaurants/:id/reviews/**
- Purpose: Get restaurant reviews
- Auth: Required
- Response (200):
  ```json
  {
    "count": 120,
    "results": [
      {
        "id": 1,
        "user_name": "John Doe",
        "rating": 5,
        "comment": "Excellent food!",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
  ```

**POST /api/zesty/restaurants/:id/reviews/**
- Purpose: Create restaurant review
- Auth: Required
- Request Body:
  ```json
  {
    "rating": 5,
    "comment": "Excellent food!"
  }
  ```
- Response (201): Created review object


#### Order Endpoints

**GET /api/zesty/orders/**
- Purpose: List user orders
- Auth: Required
- Query Params:
  - status: string (pending, confirmed, preparing, ready, out_for_delivery, delivered, cancelled)
- Response (200):
  ```json
  {
    "count": 10,
    "results": [
      {
        "id": 1,
        "restaurant": 1,
        "restaurant_name": "Pizza Palace",
        "status": "confirmed",
        "items": [
          {
            "id": 1,
            "menu_item": {/* menu item object */},
            "quantity": 2,
            "unit_price": "299.00",
            "total": "598.00"
          }
        ],
        "subtotal": "598.00",
        "delivery_fee": "50.00",
        "tax": "29.90",
        "total": "677.90",
        "delivery_address": {/* address object */},
        "estimated_delivery": "2024-01-01T13:00:00Z",
        "special_instructions": "Extra cheese",
        "created_at": "2024-01-01T12:00:00Z"
      }
    ]
  }
  ```

**POST /api/zesty/orders/**
- Purpose: Create new order
- Auth: Required
- Request Body:
  ```json
  {
    "restaurant_id": 1,
    "delivery_address_id": 1,
    "special_instructions": "Extra cheese",
    "payment_method": "credit_card",
    "items": [
      {
        "menu_item_id": 1,
        "quantity": 2
      }
    ]
  }
  ```
- Response (201): Created order object with payment confirmation

**GET /api/zesty/orders/:id/**
- Purpose: Get order details
- Auth: Required
- Response (200): Order object

**PATCH /api/zesty/orders/:id/cancel/**
- Purpose: Cancel order
- Auth: Required
- Response (200): Updated order object with status 'cancelled'
- Errors: 400 (cannot cancel at this stage)

**GET /api/zesty/orders/:id/tracking/**
- Purpose: Get delivery tracking info
- Auth: Required
- Response (200):
  ```json
  {
    "order_status": "out_for_delivery",
    "delivery_partner_name": "Delivery Partner",
    "delivery_partner_phone": "+910000000000",
    "latitude": "19.0760",
    "longitude": "72.8777",
    "eta": "2024-01-01T13:00:00Z",
    "updated_at": "2024-01-01T12:45:00Z"
  }
  ```

**PATCH /api/zesty/orders/:id/update_status/**
- Purpose: Update order status (for restaurant owners/admin)
- Auth: Required (restaurant owner or admin)
- Request Body:
  ```json
  {
    "status": "preparing"
  }
  ```
- Response (200): Updated order object

#### Event Endpoints

**GET /api/eventra/events/**
- Purpose: List events with filters
- Auth: Required
- Query Params:
  - search: string (name or venue)
  - category: string (movie, concert, sports, theater, comedy, expo, dining)
  - date_from: date
  - date_to: date
  - min_price: decimal
  - max_price: decimal
  - city: string
  - ordering: string (event_date, rating, -event_date)
  - page: number
- Response (200):
  ```json
  {
    "count": 30,
    "results": [
      {
        "id": 1,
        "name": "Rock Concert 2024",
        "description": "Amazing rock concert",
        "category": "concert",
        "venue_name": "Stadium Arena",
        "address": "456 Event Rd, Mumbai",
        "event_date": "2024-06-15T19:00:00Z",
        "event_end_date": "2024-06-15T23:00:00Z",
        "image": "/media/events/concert.jpg",
        "rating": "4.80",
        "review_count": 50,
        "total_seats": 5000,
        "available_seats": 3200,
        "is_published": true
      }
    ]
  }
  ```

**GET /api/eventra/events/:id/**
- Purpose: Get event details with ticket types
- Auth: Required
- Response (200):
  ```json
  {
    "id": 1,
    "name": "Rock Concert 2024",
    "description": "Amazing rock concert",
    "category": "concert",
    "venue_name": "Stadium Arena",
    "address": "456 Event Rd, Mumbai",
    "event_date": "2024-06-15T19:00:00Z",
    "image": "/media/events/concert.jpg",
    "banner": "/media/event_banners/concert_banner.jpg",
    "rating": "4.80",
    "review_count": 50,
    "total_seats": 5000,
    "available_seats": 3200,
    "is_published": true,
    "ticket_types": [
      {
        "id": 1,
        "name": "Standard",
        "price": "1500.00",
        "quantity_total": 3000,
        "quantity_available": 2000,
        "description": "Standard seating",
        "benefits": "General admission"
      },
      {
        "id": 2,
        "name": "VIP",
        "price": "3500.00",
        "quantity_total": 500,
        "quantity_available": 200,
        "description": "VIP seating",
        "benefits": "Premium seats, backstage access"
      }
    ]
  }
  ```

**GET /api/eventra/events/:id/seats/**
- Purpose: Get seat map for event
- Auth: Required
- Query Params:
  - ticket_type_id: number
  - section: string
  - status: string (available, booked, reserved, blocked)
- Response (200):
  ```json
  {
    "event_id": 1,
    "sections": [
      {
        "name": "Section A",
        "seats": [
          {
            "id": 1,
            "section": "Section A",
            "row": "A",
            "seat_number": "1",
            "status": "available",
            "ticket_type_name": "Standard",
            "price": "1500.00"
          }
        ]
      }
    ]
  }
  ```

**GET /api/eventra/events/:id/reviews/**
- Purpose: Get event reviews
- Auth: Required
- Response (200):
  ```json
  {
    "count": 50,
    "results": [
      {
        "id": 1,
        "user_name": "Jane Smith",
        "rating": 5,
        "comment": "Amazing concert!",
        "created_at": "2024-06-16T00:00:00Z"
      }
    ]
  }
  ```

**POST /api/eventra/events/:id/reviews/**
- Purpose: Create event review
- Auth: Required
- Request Body:
  ```json
  {
    "rating": 5,
    "comment": "Amazing concert!"
  }
  ```
- Response (201): Created review object


#### Booking Endpoints

**GET /api/eventra/bookings/**
- Purpose: List user bookings
- Auth: Required
- Query Params:
  - status: string (pending, confirmed, completed, cancelled)
- Response (200):
  ```json
  {
    "count": 5,
    "results": [
      {
        "id": 1,
        "booking_reference": "EB-A1B2C3D4",
        "event": 1,
        "event_name": "Rock Concert 2024",
        "status": "confirmed",
        "total_tickets": 2,
        "subtotal": "3000.00",
        "tax": "540.00",
        "total": "3540.00",
        "booked_seats": [
          {
            "id": 1,
            "seat": {
              "id": 1,
              "section": "Section A",
              "row": "A",
              "seat_number": "1",
              "status": "booked",
              "ticket_type_name": "Standard",
              "price": "1500.00"
            }
          }
        ],
        "booking_date": "2024-01-01T12:00:00Z",
        "confirmation_sent": "2024-01-01T12:01:00Z"
      }
    ]
  }
  ```

**POST /api/eventra/bookings/**
- Purpose: Create new booking
- Auth: Required
- Request Body:
  ```json
  {
    "event_id": 1,
    "payment_method": "credit_card",
    "tickets": [
      {
        "ticket_type_id": 1,
        "quantity": 2,
        "seats": [1, 2]
      }
    ]
  }
  ```
- Response (201): Created booking object with payment confirmation
- Errors: 400 (seats not available, insufficient quantity)

**GET /api/eventra/bookings/:id/**
- Purpose: Get booking details
- Auth: Required
- Response (200): Booking object

**PATCH /api/eventra/bookings/:id/cancel/**
- Purpose: Cancel booking
- Auth: Required
- Response (200):
  ```json
  {
    "booking": {/* booking object */},
    "message": "Booking cancelled. Refund will be processed.",
    "refund_amount": 3540.00
  }
  ```
- Errors: 400 (cannot cancel at this stage)

#### Notification Endpoints

**GET /api/notifications/**
- Purpose: List user notifications
- Auth: Required
- Query Params:
  - unread: boolean (true to filter unread only)
- Response (200):
  ```json
  {
    "count": 15,
    "results": [
      {
        "id": 1,
        "type": "order_status",
        "title": "Order Confirmed",
        "message": "Your order from Pizza Palace has been confirmed",
        "related_id": 1,
        "related_type": "order",
        "is_read": false,
        "created_at": "2024-01-01T12:00:00Z"
      }
    ]
  }
  ```

**PATCH /api/notifications/:id/mark_read/**
- Purpose: Mark notification as read
- Auth: Required
- Response (200): Updated notification object

**PATCH /api/notifications/mark_all_read/**
- Purpose: Mark all notifications as read
- Auth: Required
- Response (200):
  ```json
  {
    "message": "All notifications marked as read."
  }
  ```

#### Search Endpoint

**GET /api/search/**
- Purpose: Global search across restaurants, events, and menu items
- Auth: Optional
- Query Params:
  - query: string (required)
  - scope: string (all, restaurants, events, menu)
  - limit: number (default 10)
- Response (200):
  ```json
  {
    "restaurants": [/* restaurant objects */],
    "events": [/* event objects */],
    "menu_items": [/* menu item objects */]
  }
  ```

### API Client Implementation

The frontend API client is implemented using Axios with interceptors for authentication and error handling:

```typescript
// api/client.ts
import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add access token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(
          `${apiClient.defaults.baseURL}/auth/token/refresh/`,
          { refresh: refreshToken }
        );

        const { access, refresh } = response.data;
        setTokens(access, refresh);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```


### State Management

The application uses React Context API for global state management:

#### AuthContext

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}
```

#### CartContext (Zesty)

```typescript
interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  restaurant: Restaurant | null;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
}

interface CartContextType extends CartState {
  addItem: (menuItem: MenuItem, quantity: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  removeItem: (menuItemId: number) => void;
  clearCart: () => void;
  setRestaurant: (restaurant: Restaurant) => void;
}
```

#### BookingContext (Eventra)

```typescript
interface BookingState {
  event: Event | null;
  selectedSeats: Seat[];
  ticketType: TicketType | null;
  subtotal: number;
  tax: number;
  total: number;
}

interface BookingContextType extends BookingState {
  setEvent: (event: Event) => void;
  setTicketType: (ticketType: TicketType) => void;
  addSeat: (seat: Seat) => void;
  removeSeat: (seatId: number) => void;
  clearBooking: () => void;
}
```

#### NotificationContext

```typescript
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
}

interface NotificationContextType extends NotificationState {
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}
```

## Data Models

The backend uses the following Django models (already implemented):

### Core Models

**User**
- Fields: id, email, username, password, first_name, last_name, phone, avatar, role, is_email_verified, created_at, updated_at
- Roles: customer, restaurant_owner, event_organizer, delivery_partner, admin
- Extends: AbstractUser

**Address**
- Fields: id, user (FK), label, street, city, state, postal_code, latitude, longitude, is_default, created_at
- Labels: home, work, other
- Constraint: Only one default address per user

**Payment**
- Fields: id, user (FK), amount, currency, method, status, transaction_id, content_type, object_id, created_at, updated_at
- Methods: credit_card, debit_card, upi, wallet, net_banking, cash_on_delivery
- Statuses: pending, completed, failed, refunded
- Note: Simulated payment processing

**Notification**
- Fields: id, user (FK), type, title, message, related_id, related_type, is_read, created_at
- Types: order_status, booking_confirmation, event_reminder, promotion, system

### Zesty Models

**Restaurant**
- Fields: id, owner (FK to User), name, description, cuisine_types, address, latitude, longitude, delivery_fee, delivery_time_min, delivery_time_max, image, banner, rating, review_count, phone, is_active, is_verified, created_at, updated_at
- Methods: update_rating()

**MenuItem**
- Fields: id, restaurant (FK), name, description, price, category, image, is_vegetarian, is_vegan, is_available, created_at

**Order**
- Fields: id, user (FK), restaurant (FK), status, delivery_address (FK to Address), subtotal, delivery_fee, tax, total, estimated_delivery, actual_delivery, special_instructions, payment (OneToOne to Payment), created_at, updated_at
- Statuses: pending, confirmed, preparing, ready, out_for_delivery, delivered, cancelled
- Methods: calculate_totals()

**OrderItem**
- Fields: id, order (FK), menu_item (FK), quantity, unit_price, total

**Review**
- Fields: id, user (FK), restaurant (FK), order (OneToOne), rating, comment, created_at
- Constraint: Unique (user, restaurant)

**DeliveryTracking**
- Fields: id, order (OneToOne), delivery_partner_name, delivery_partner_phone, latitude, longitude, eta, updated_at

### Eventra Models

**Event**
- Fields: id, organizer (FK to User), name, description, category, venue_name, address, latitude, longitude, event_date, event_end_date, image, banner, rating, review_count, total_seats, available_seats, is_published, is_cancelled, created_at, updated_at
- Categories: movie, concert, sports, theater, comedy, expo, dining
- Methods: update_rating()

**TicketType**
- Fields: id, event (FK), name, price, quantity_total, quantity_available, description, benefits

**Seat**
- Fields: id, event (FK), section, row, seat_number, ticket_type (FK), status
- Statuses: available, booked, reserved, blocked
- Constraint: Unique (event, section, row, seat_number)

**Booking**
- Fields: id, user (FK), event (FK), booking_reference, status, total_tickets, subtotal, tax, total, payment (OneToOne to Payment), booking_date, confirmation_sent
- Statuses: pending, confirmed, completed, cancelled
- Methods: Auto-generate booking_reference

**BookingSeat**
- Fields: id, booking (FK), seat (FK)

**EventReview**
- Fields: id, user (FK), event (FK), booking (OneToOne), rating, comment, created_at
- Constraint: Unique (user, event)

**EventAnalytics**
- Fields: id, event (OneToOne), views, bookings_count, revenue, updated_at

### Database Schema Verification

The existing database schema is complete and includes:
- All required tables with proper relationships
- Foreign key constraints
- Unique constraints for reviews and booking references
- Indexes on frequently queried fields (email, role, rating, is_active)
- Proper cascade and protect behaviors for deletions

No migrations are needed as the schema is already implemented and migrated.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies and consolidations:

- Properties 1.2 and 1.3 (registration with valid/invalid data) can be tested separately as they cover different cases
- Properties 5.6 and 5.7 (order creation and total calculation) are related but test different aspects
- Properties 5.9 and 5.10 (successful/failed payment) are complementary error cases
- Properties 7.4 and 7.5 (review creation and rating update) are sequential but test different behaviors
- Properties 10.5 and 10.6 (seat selection/deselection) are inverse operations and should be tested separately
- Properties 11.9 and 11.10 (successful/failed booking payment) are complementary error cases
- Dashboard CRUD operations (14.x and 15.x) can be consolidated into general CRUD properties

The following properties provide unique validation value and will be included:

### Property 1: User Registration Creates Account with Tokens

*For any* valid registration data (email, username, password, first_name, last_name, role), submitting to the registration endpoint should create a new user account and return both access and refresh JWT tokens.

**Validates: Requirements 1.2**

### Property 2: Invalid Registration Data Returns Validation Errors

*For any* invalid registration data (duplicate email, mismatched passwords, missing required fields), the registration endpoint should return descriptive validation errors without creating a user account.

**Validates: Requirements 1.3**

### Property 3: Valid Login Credentials Return JWT Tokens

*For any* existing user with valid credentials (email and password), submitting to the login endpoint should return both access and refresh JWT tokens.

**Validates: Requirements 1.5**

### Property 4: Invalid Login Credentials Return Authentication Error

*For any* invalid login credentials (wrong password, non-existent email), the login endpoint should return an authentication error without issuing tokens.

**Validates: Requirements 1.6**

### Property 5: Authenticated Requests Include Access Token

*For any* authenticated API request, the Authorization header should contain a valid Bearer access token.

**Validates: Requirements 1.8**

### Property 6: Expired Access Token Triggers Automatic Refresh

*For any* API request with an expired access token, the client should automatically attempt to refresh the token using the refresh token before retrying the request.

**Validates: Requirements 1.9**

### Property 7: Profile Updates Persist Changes

*For any* valid profile update (first_name, last_name, phone, avatar), the changes should be persisted and reflected in subsequent profile retrievals.

**Validates: Requirements 1.12**

### Property 8: Password Change Enables Login with New Password

*For any* valid password change, the new password should work for subsequent login attempts and the old password should no longer work.

**Validates: Requirements 1.13**

### Property 9: Logout Clears Authentication State

*For any* authenticated user, logging out should clear tokens and prevent subsequent authenticated requests until re-login.

**Validates: Requirements 1.14**

### Property 10: Address Creation Stores Valid Address

*For any* valid address data (street, city, state, postal_code, label), creating an address should store it and make it available in the user's address list.

**Validates: Requirements 2.2**

### Property 11: Address Updates Persist Changes

*For any* existing address and valid update data, updating the address should persist changes and reflect them in subsequent retrievals.

**Validates: Requirements 2.5**

### Property 12: Address Deletion Removes Address

*For any* existing address, deleting it should remove it from the user's address list.

**Validates: Requirements 2.6**

### Property 13: Only One Default Address Per User

*For any* user, setting an address as default should unset all other addresses as default, maintaining exactly one default address.

**Validates: Requirements 2.7, 2.8**

### Property 14: Restaurant Search Returns Matching Results

*For any* search query (name or cuisine), the restaurant search should return only restaurants whose name or cuisine types contain the query string (case-insensitive).

**Validates: Requirements 3.3**

### Property 15: Restaurant Filters Return Matching Results

*For any* filter criteria (cuisine type, rating range, delivery time range), the restaurant list should return only restaurants that match all applied filters.

**Validates: Requirements 3.4**

### Property 16: Restaurant Sorting Orders Results Correctly

*For any* sort field (rating, delivery_fee, delivery_time_max) and direction (ascending/descending), the restaurant list should return results ordered by that field in the specified direction.

**Validates: Requirements 3.5**

### Property 17: Restaurant Pagination Returns Correct Page

*For any* page number and page size, the restaurant list should return the correct subset of results with proper pagination metadata (count, next, previous).

**Validates: Requirements 3.7**

### Property 18: Adding Item to Cart Increases Cart Size

*For any* menu item and quantity, adding it to the cart should increase the cart item count and update the cart total.

**Validates: Requirements 4.5**

### Property 19: Updating Cart Quantity Updates Totals

*For any* cart item and new quantity, updating the quantity should recalculate the item total and cart totals (subtotal, tax, total).

**Validates: Requirements 4.7**

### Property 20: Removing Item from Cart Decreases Cart Size

*For any* cart item, removing it should decrease the cart item count and update the cart total.

**Validates: Requirements 4.8**

### Property 21: Cart Totals Are Correctly Calculated

*For any* cart state, the subtotal should equal the sum of all item totals, tax should be 5% of subtotal, and total should equal subtotal + delivery_fee + tax.

**Validates: Requirements 4.9**

### Property 22: Checkout Requires Delivery Address

*For any* checkout attempt without a selected delivery address, the order creation should fail with a validation error.

**Validates: Requirements 5.2**

### Property 23: Order Creation Generates Order with Items

*For any* valid order request (restaurant_id, items, delivery_address_id), the backend should create an order with status 'pending' and all specified order items.

**Validates: Requirements 5.6**

### Property 24: Order Totals Are Correctly Calculated

*For any* order, the subtotal should equal the sum of all order item totals, delivery_fee should match the restaurant's delivery fee, tax should be 5% of subtotal, and total should equal subtotal + delivery_fee + tax.

**Validates: Requirements 5.7**

### Property 25: Non-COD Payment Creates Payment Record

*For any* order with payment method other than 'cash_on_delivery', the backend should create a payment record and simulate payment processing.

**Validates: Requirements 5.8**

### Property 26: Successful Payment Confirms Order

*For any* order with successful payment, the order status should be updated to 'confirmed' and payment status should be 'completed'.

**Validates: Requirements 5.9**

### Property 27: Failed Payment Prevents Order Creation

*For any* order with failed payment simulation, the backend should return an error and not persist the order.

**Validates: Requirements 5.10**

### Property 28: Successful Order Clears Cart

*For any* successful order creation, the cart should be cleared (empty items list).

**Validates: Requirements 5.12**

### Property 29: Successful Order Creates Notification

*For any* successful order creation, a notification should be created for the user with type 'order_status' and related_id pointing to the order.

**Validates: Requirements 5.13**

### Property 30: Cancellable Orders Can Be Cancelled

*For any* order with status 'pending' or 'confirmed', the cancel operation should succeed, update status to 'cancelled', and process refund if payment exists.

**Validates: Requirements 6.8, 6.9**

### Property 31: Restaurant Review Requires Delivered Order

*For any* review submission, the backend should validate that the user has at least one delivered order from that restaurant before creating the review.

**Validates: Requirements 7.1, 7.3**

### Property 32: Review Creation Updates Restaurant Rating

*For any* new review, the restaurant's average rating and review count should be recalculated to reflect all reviews.

**Validates: Requirements 7.4, 7.5**

### Property 33: One Review Per User Per Restaurant

*For any* user and restaurant, attempting to create a second review should fail with a unique constraint error.

**Validates: Requirements 7.8**

### Property 34: Event Search Returns Matching Results

*For any* search query (name or venue), the event search should return only events whose name or venue_name contain the query string (case-insensitive).

**Validates: Requirements 8.4**

### Property 35: Event Filters Return Matching Results

*For any* filter criteria (category, date range, price range, city), the event list should return only events that match all applied filters.

**Validates: Requirements 8.5**

### Property 36: Event Sorting Orders Results Correctly

*For any* sort field (event_date, rating) and direction (ascending/descending), the event list should return results ordered by that field in the specified direction.

**Validates: Requirements 8.6**

### Property 37: Event Pagination Returns Correct Page

*For any* page number and page size, the event list should return the correct subset of results with proper pagination metadata (count, next, previous).

**Validates: Requirements 8.8**

### Property 38: Sold Out Events Prevent Booking

*For any* event with available_seats = 0, booking attempts should fail with an error indicating no seats available.

**Validates: Requirements 9.6**

### Property 39: Cancelled Events Prevent Booking

*For any* event with is_cancelled = true, booking attempts should fail with an error indicating the event is cancelled.

**Validates: Requirements 9.7**

### Property 40: Available Seats Can Be Selected

*For any* seat with status 'available', the seat selection operation should succeed and add the seat to the booking state.

**Validates: Requirements 10.4, 10.5**

### Property 41: Selected Seats Can Be Deselected

*For any* selected seat, the deselection operation should succeed and remove the seat from the booking state.

**Validates: Requirements 10.6**

### Property 42: Seat Selection Respects Maximum Limit

*For any* booking attempt exceeding the maximum seats per booking limit, the selection should fail or be prevented.

**Validates: Requirements 10.8**

### Property 43: Unavailable Seats Cannot Be Selected

*For any* seat with status 'booked', 'reserved', or 'blocked', the seat selection operation should fail or be prevented.

**Validates: Requirements 10.9**

### Property 44: Seat Reservation Marks Seats as Reserved

*For any* set of selected seats, confirming the selection should mark all seats as 'reserved' with an expiration timestamp.

**Validates: Requirements 10.10, 10.11**

### Property 45: Expired Reservations Return Seats to Available

*For any* reserved seat past its expiration time, the seat status should automatically return to 'available'.

**Validates: Requirements 10.12**

### Property 46: Booking Creation Generates Booking with Reference

*For any* valid booking request (event_id, tickets with seat selections), the backend should create a booking with status 'pending' and a unique booking_reference.

**Validates: Requirements 11.5**

### Property 47: Booking Links to Selected Seats

*For any* booking, booking_seat records should be created linking the booking to all selected seats.

**Validates: Requirements 11.6**

### Property 48: Booking Totals Are Correctly Calculated

*For any* booking, the subtotal should equal the sum of all ticket prices, tax should be 18% of subtotal, and total should equal subtotal + tax.

**Validates: Requirements 11.7**

### Property 49: Booking Payment Creates Payment Record

*For any* booking, the backend should create a payment record and simulate payment processing.

**Validates: Requirements 11.8**

### Property 50: Successful Booking Payment Confirms Booking

*For any* booking with successful payment, the booking status should be 'confirmed', payment status should be 'completed', and all seat statuses should be 'booked'.

**Validates: Requirements 11.9**

### Property 51: Failed Booking Payment Rolls Back

*For any* booking with failed payment, the backend should delete the booking and return all seats to 'available' status.

**Validates: Requirements 11.10**

### Property 52: Successful Booking Creates Notification

*For any* successful booking creation, a notification should be created for the user with type 'booking_confirmation' and related_id pointing to the booking.

**Validates: Requirements 11.12**

### Property 53: Cancellable Bookings Can Be Cancelled

*For any* booking with status 'pending' or 'confirmed' and event_date at least 24 hours in the future, the cancel operation should succeed, update status to 'cancelled', return seats to 'available', and process refund.

**Validates: Requirements 12.6, 12.7**

### Property 54: Event Review Requires Confirmed Booking

*For any* event review submission, the backend should validate that the user has at least one confirmed booking for that event before creating the review.

**Validates: Requirements 13.1, 13.3**

### Property 55: Event Review Creation Updates Event Rating

*For any* new event review, the event's average rating and review count should be recalculated to reflect all reviews.

**Validates: Requirements 13.4, 13.5**

### Property 56: One Review Per User Per Event

*For any* user and event, attempting to create a second review should fail with a unique constraint error.

**Validates: Requirements 13.8**

### Property 57: Restaurant CRUD Operations Persist Changes

*For any* restaurant owner, creating, updating, or deleting restaurants should persist changes and reflect them in subsequent retrievals.

**Validates: Requirements 14.3, 14.4**

### Property 58: Menu Item CRUD Operations Persist Changes

*For any* restaurant owner, creating, updating, or deleting menu items for their restaurants should persist changes and reflect them in subsequent retrievals.

**Validates: Requirements 14.8, 14.9, 14.11**

### Property 59: Order Status Updates Trigger Notifications

*For any* order status change, a notification should be created for the user with type 'order_status' and the new status information.

**Validates: Requirements 14.13, 16.1**

### Property 60: Event CRUD Operations Persist Changes

*For any* event organizer, creating, updating, or deleting events should persist changes and reflect them in subsequent retrievals.

**Validates: Requirements 15.3, 15.4**

### Property 61: Ticket Type CRUD Operations Persist Changes

*For any* event organizer, creating, updating ticket types for their events should persist changes and reflect them in subsequent retrievals.

**Validates: Requirements 15.9, 15.10**

### Property 62: Booking Status Changes Trigger Notifications

*For any* booking confirmation or cancellation, a notification should be created for the user with type 'booking_confirmation' and the booking information.

**Validates: Requirements 16.2**

### Property 63: Event Reminders Created 24 Hours Before Event

*For any* confirmed booking, a notification with type 'event_reminder' should be created 24 hours before the event_date.

**Validates: Requirements 16.3**

### Property 64: Form Validation Prevents Invalid Submissions

*For any* form with validation rules (email format, password strength, required fields, numeric ranges), submitting invalid data should display inline validation errors and prevent submission.

**Validates: Requirements 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8**

### Property 65: Backend Validation Returns Detailed Errors

*For any* API request with invalid data, the backend should return detailed validation errors with field names and error messages.

**Validates: Requirements 22.9, 22.10**

### Property 66: Business Rule Validation Enforces Constraints

*For any* operation violating business rules (booking more seats than available, reviewing without order/booking), the backend should return a validation error preventing the operation.

**Validates: Requirements 22.11**


## Error Handling

### Frontend Error Handling Strategy

The frontend implements a comprehensive error handling strategy through the API client and UI components:

#### API Client Error Handling

1. **Network Errors**: Display user-friendly message "Unable to connect to server. Please check your internet connection."
2. **401 Unauthorized**: Automatically attempt token refresh; redirect to login if refresh fails
3. **403 Forbidden**: Display "You don't have permission to perform this action"
4. **404 Not Found**: Redirect to 404 error page or display "Resource not found"
5. **400 Bad Request**: Display validation errors from response body
6. **500 Internal Server Error**: Display "Something went wrong. Please try again later."
7. **Timeout Errors**: Retry up to 3 times with exponential backoff

#### Error Display Components

- **Inline Field Errors**: Display validation errors below form fields
- **Toast Notifications**: Display temporary error messages for failed operations
- **Error Boundaries**: Catch React component errors and display fallback UI
- **Retry Buttons**: Provide retry functionality for failed requests

### Backend Error Handling Strategy

The backend implements consistent error responses and validation:

#### HTTP Status Codes

- **200 OK**: Successful GET, PATCH, PUT requests
- **201 Created**: Successful POST requests creating resources
- **204 No Content**: Successful DELETE requests
- **400 Bad Request**: Validation errors, business rule violations
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions for operation
- **404 Not Found**: Resource does not exist
- **500 Internal Server Error**: Unexpected server errors

#### Error Response Format

All error responses follow a consistent JSON format:

```json
{
  "error": "High-level error message",
  "details": {
    "field_name": ["Specific error for this field"],
    "another_field": ["Another error message"]
  }
}
```

#### Validation Error Handling

- **Model Validation**: Django model validators ensure data integrity
- **Serializer Validation**: DRF serializers validate request data before processing
- **Business Logic Validation**: Custom validation in views for complex rules
- **Database Constraints**: Unique constraints, foreign key constraints enforced at DB level

#### Transaction Management

- **Order Creation**: Wrapped in database transaction; rollback on payment failure
- **Booking Creation**: Wrapped in database transaction; rollback on payment failure or seat unavailability
- **Seat Reservation**: Atomic operations to prevent race conditions

### Error Scenarios and Handling

#### Authentication Errors

- **Invalid Credentials**: Return 401 with "Invalid email or password"
- **Expired Token**: Return 401 triggering automatic refresh
- **Invalid Refresh Token**: Return 401 forcing re-login

#### Validation Errors

- **Missing Required Fields**: Return 400 with field-specific errors
- **Invalid Format**: Return 400 with format requirements
- **Duplicate Values**: Return 400 with "Already exists" message

#### Business Logic Errors

- **Insufficient Seats**: Return 400 with "Only X seats available"
- **Event Cancelled**: Return 400 with "Event has been cancelled"
- **Order Not Cancellable**: Return 400 with "Order cannot be cancelled at this stage"
- **Review Without Order**: Return 400 with "You must have a delivered order to review"

#### Race Condition Handling

- **Concurrent Seat Booking**: Use database-level locking to prevent double-booking
- **Concurrent Order Creation**: Use transactions to ensure consistency
- **Seat Reservation Expiration**: Background task or lazy evaluation to release expired reservations

## Testing Strategy

### Backend Testing

#### Unit Tests

**Model Tests**
- Test model methods (calculate_totals, update_rating, simulate_payment)
- Test model constraints (unique constraints, foreign key relationships)
- Test model save/delete behavior (default address logic, booking reference generation)

**Serializer Tests**
- Test serialization of model instances to JSON
- Test deserialization and validation of request data
- Test custom validation logic

**View Tests**
- Test endpoint responses for valid requests
- Test authentication and permission checks
- Test error responses for invalid requests

#### Integration Tests

**Authentication Flow**
- Test registration → login → authenticated request → logout flow
- Test token refresh flow
- Test password change flow

**Order Flow**
- Test restaurant browsing → menu viewing → cart → checkout → order creation → tracking
- Test order cancellation and refund
- Test review submission after delivery

**Booking Flow**
- Test event browsing → event details → seat selection → booking creation → confirmation
- Test booking cancellation and refund
- Test review submission after event

**Payment Processing**
- Test successful payment simulation
- Test failed payment handling
- Test refund processing

#### Property-Based Tests

Each correctness property should be implemented as a property-based test using a Python PBT library (e.g., Hypothesis):

- **Configuration**: Minimum 100 iterations per test
- **Tagging**: Each test tagged with `@pytest.mark.property` and comment referencing design property
- **Example Tag**: `# Feature: complete-platform-integration, Property 1: User Registration Creates Account with Tokens`

**Example Property Test**:

```python
from hypothesis import given, strategies as st
import pytest

@pytest.mark.property
# Feature: complete-platform-integration, Property 2: Invalid Registration Data Returns Validation Errors
@given(
    email=st.one_of(
        st.just("invalid-email"),  # Invalid format
        st.just(""),  # Empty
    ),
    password=st.text(min_size=1, max_size=7),  # Too short
)
def test_invalid_registration_returns_errors(email, password):
    response = client.post('/api/auth/register/', {
        'email': email,
        'username': 'testuser',
        'password': password,
        'password_confirm': password,
        'first_name': 'Test',
        'last_name': 'User',
    })
    assert response.status_code == 400
    assert 'error' in response.json() or 'details' in response.json()
```

### Frontend Testing

#### Unit Tests

**Utility Functions**
- Test API client token management functions
- Test calculation functions (cart totals, booking totals)
- Test validation functions (email format, password strength)
- Test date/time formatting functions

**Custom Hooks**
- Test useAuth hook state management
- Test useCart hook operations
- Test useBooking hook operations
- Test useNotifications hook polling

#### Component Tests

**Form Components**
- Test form validation and error display
- Test form submission with valid/invalid data
- Test form reset and clear functionality

**List Components**
- Test filtering and sorting
- Test pagination and infinite scroll
- Test empty states and loading states

**Cart/Booking Components**
- Test add/remove/update operations
- Test total calculations
- Test clear functionality

#### Integration Tests

**User Flows**
- Test login → browse restaurants → add to cart → checkout → order confirmation
- Test login → browse events → select seats → checkout → booking confirmation
- Test registration → profile update → address management
- Test order tracking with status updates
- Test booking cancellation flow

**API Client Tests**
- Test request interceptor adds auth token
- Test response interceptor handles 401 and refreshes token
- Test error handling for different status codes
- Test retry logic for failed requests

#### Property-Based Tests

Selected critical frontend properties should be tested with a JavaScript PBT library (e.g., fast-check):

- **Configuration**: Minimum 100 iterations per test
- **Tagging**: Each test tagged with comment referencing design property
- **Example Tag**: `// Feature: complete-platform-integration, Property 21: Cart Totals Are Correctly Calculated`

**Example Property Test**:

```typescript
import fc from 'fast-check';

// Feature: complete-platform-integration, Property 21: Cart Totals Are Correctly Calculated
test('cart totals are correctly calculated for any cart state', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          price: fc.float({ min: 0, max: 10000 }),
          quantity: fc.integer({ min: 1, max: 10 }),
        })
      ),
      fc.float({ min: 0, max: 100 }),
      (items, deliveryFee) => {
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const tax = subtotal * 0.05;
        const total = subtotal + deliveryFee + tax;

        const cart = calculateCartTotals(items, deliveryFee);

        expect(cart.subtotal).toBeCloseTo(subtotal, 2);
        expect(cart.tax).toBeCloseTo(tax, 2);
        expect(cart.total).toBeCloseTo(total, 2);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Testing Coverage Goals

- **Backend**: 80% code coverage for critical paths (models, views, serializers)
- **Frontend**: 70% code coverage for critical paths (API client, state management, utility functions)
- **Integration Tests**: Cover all major user flows (registration, login, order, booking)
- **Property Tests**: Implement all 66 correctness properties

### Testing Tools

**Backend**:
- pytest: Test runner
- pytest-django: Django integration
- Hypothesis: Property-based testing
- factory_boy: Test data generation
- coverage.py: Code coverage

**Frontend**:
- Vitest: Test runner
- React Testing Library: Component testing
- fast-check: Property-based testing
- MSW (Mock Service Worker): API mocking
- @vitest/coverage-v8: Code coverage

### Continuous Integration

- Run all tests on every pull request
- Enforce minimum coverage thresholds
- Run property tests with increased iterations (1000+) in CI
- Run integration tests against test database
- Generate and publish coverage reports

