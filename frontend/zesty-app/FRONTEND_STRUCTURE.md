# Frontend Application Structure

## Overview

The Platforma frontend is a React + TypeScript + Vite application with proper state management, API integration, and role-based routing.

## Directory Structure

```
src/
├── api/                    # API client and endpoints
│   ├── client.ts          # Axios instance with interceptors
│   ├── auth.ts            # Authentication endpoints
│   ├── addresses.ts       # Address management endpoints
│   ├── zesty.ts           # Zesty (food delivery) endpoints
│   ├── eventra.ts         # Eventra (event booking) endpoints
│   └── notifications.ts   # Notification endpoints
├── components/            # React components
│   └── shared/           # Shared components
│       ├── Header.tsx    # Navigation header with user menu
│       ├── ProtectedRoute.tsx  # Route protection component
│       ├── NotificationDropdown.tsx  # Notification UI
│       ├── LoadingSpinner.tsx  # Loading indicator
│       ├── ErrorMessage.tsx    # Error display
│       └── ErrorBoundary.tsx   # Error boundary
├── contexts/             # React Context for state management
│   ├── AuthContext.tsx   # Authentication state
│   ├── CartContext.tsx   # Shopping cart state (Zesty)
│   ├── BookingContext.tsx # Booking state (Eventra)
│   └── NotificationContext.tsx # Notifications state
├── pages/                # Page components
│   └── dashboard/
│       ├── RestaurantOwnerDashboard.tsx
│       └── EventOrganizerDashboard.tsx
├── types/               # TypeScript type definitions
│   └── index.ts        # All type interfaces
├── App.tsx             # Main app component with routing
└── main.tsx            # Entry point
```

## Key Features

### 1. Authentication Flow

**Login/Register:**
- User submits credentials via login/register form
- API returns JWT tokens (access + refresh)
- Tokens stored in memory (can be persisted to localStorage)
- Access token included in all API requests via Authorization header

**Token Refresh:**
- When access token expires (401 response), automatically refresh using refresh token
- New tokens returned and stored
- Original request retried with new token
- If refresh fails, redirect to login

**Protected Routes:**
- `ProtectedRoute` component checks authentication
- Redirects unauthenticated users to login
- Supports role-based access (e.g., restaurant_owner, event_organizer)

### 2. State Management

**AuthContext:**
- Manages user authentication state
- Provides login, register, logout, updateProfile functions
- Persists auth state across page refreshes

**CartContext (Zesty):**
- Manages shopping cart for food orders
- Tracks items, quantities, restaurant, and totals
- Persists cart in sessionStorage
- Clears when user changes restaurants

**BookingContext (Eventra):**
- Manages event booking state
- Tracks selected event, seats, ticket type, and totals
- Calculates tax (18%) and total

**NotificationContext:**
- Manages user notifications
- Polls API every 60 seconds for new notifications
- Tracks unread count
- Provides mark as read functionality

### 3. Dashboard Routes

**Restaurant Owner Dashboard** (`/dashboard/restaurant-owner`)
- Requires `restaurant_owner` role
- Three tabs:
  - **Restaurants**: View owned restaurants, toggle active status
  - **Menu Items**: Manage menu items for selected restaurant
  - **Orders**: View incoming orders, update status (confirmed → preparing → ready)

**Event Organizer Dashboard** (`/dashboard/event-organizer`)
- Requires `event_organizer` role
- Three tabs:
  - **Events**: View created events, toggle published status
  - **Ticket Types**: Manage ticket types for selected event
  - **Bookings**: View event bookings with customer details

### 4. API Client

**Axios Instance** (`api/client.ts`):
- Base URL from environment variable `VITE_API_BASE_URL`
- Request interceptor: Adds JWT token to Authorization header
- Response interceptor: Handles token refresh on 401
- Error handling: Catches and logs errors

**Token Management:**
- `getAccessToken()`: Retrieve stored access token
- `getRefreshToken()`: Retrieve stored refresh token
- `setTokens()`: Store new tokens
- `clearTokens()`: Clear tokens on logout

### 5. Component Hierarchy

```
App
├── Header
│   ├── Navigation Links
│   ├── NotificationDropdown
│   └── User Menu
├── Routes
│   ├── Public Routes (/, /login, /register)
│   ├── Protected Routes (/profile)
│   ├── Zesty Routes (restaurants, orders, etc.)
│   ├── Eventra Routes (events, bookings, etc.)
│   └── Dashboard Routes
│       ├── RestaurantOwnerDashboard
│       └── EventOrganizerDashboard
└── Providers
    ├── AuthProvider
    ├── CartProvider
    ├── BookingProvider
    └── NotificationProvider
```

## Routing Structure

### Public Routes
- `/` - Home page
- `/login` - Login page
- `/register` - Registration page

### Protected Routes (Require Authentication)
- `/profile` - User profile management
- `/dashboard/restaurant-owner` - Restaurant owner dashboard (requires restaurant_owner role)
- `/dashboard/event-organizer` - Event organizer dashboard (requires event_organizer role)

### Zesty Routes (To be implemented)
- `/restaurants` - Restaurant listing
- `/restaurants/:id` - Restaurant detail with menu
- `/cart` - Shopping cart
- `/checkout` - Order checkout
- `/orders` - Order history
- `/orders/:id` - Order detail with tracking

### Eventra Routes (To be implemented)
- `/events` - Event listing
- `/events/:id` - Event detail
- `/events/:id/seats` - Seat selection
- `/bookings/checkout` - Booking checkout
- `/bookings` - Booking history
- `/bookings/:id` - Booking detail

## Type Definitions

All TypeScript types are defined in `src/types/index.ts`:

- **User**: User profile with role (customer, restaurant_owner, event_organizer, delivery_partner, admin)
- **Address**: Delivery/billing address
- **Restaurant**: Restaurant details
- **MenuItem**: Menu item with price and availability
- **Order**: Food order with items and status
- **Event**: Event details with ticket types
- **Booking**: Event booking with seats
- **Notification**: User notification
- **Payment**: Payment record

## Environment Variables

Create `.env` file in `frontend/zesty-app/`:

```
VITE_API_BASE_URL=http://localhost:8000/api
```

## Running the Application

```bash
cd frontend/zesty-app
npm install
npm run dev
```

Application runs on `http://localhost:5173`

## Next Steps

1. Implement authentication pages (LoginPage, RegisterPage, ProfilePage)
2. Implement Zesty pages (RestaurantListPage, RestaurantDetailPage, CartPage, CheckoutPage, OrderHistoryPage, OrderDetailPage)
3. Implement Eventra pages (EventListPage, EventDetailPage, SeatSelectionPage, BookingCheckoutPage, BookingHistoryPage, BookingDetailPage)
4. Add form validation and error handling
5. Implement responsive design with Tailwind CSS
6. Add unit and integration tests
7. Optimize performance with code splitting and lazy loading
