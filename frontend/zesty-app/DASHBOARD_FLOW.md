# Dashboard Flow Diagram

## User Authentication & Dashboard Access Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Journey                              │
└─────────────────────────────────────────────────────────────────┘

1. REGISTRATION
   ┌──────────────┐
   │ /register    │
   │ RegisterPage │
   └──────┬───────┘
          │ Select role: restaurant_owner or event_organizer
          │ Submit form
          ▼
   ┌──────────────────────┐
   │ POST /api/auth/register/
   │ Returns: user + tokens
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │ AuthContext stores:  │
   │ - user               │
   │ - access token       │
   │ - refresh token      │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────┐
   │ Redirect to  │
   │ /login       │
   └──────────────┘

2. LOGIN
   ┌──────────────┐
   │ /login       │
   │ LoginPage    │
   └──────┬───────┘
          │ Enter email & password
          │ Submit form
          ▼
   ┌──────────────────────┐
   │ POST /api/auth/login/│
   │ Returns: tokens      │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────────────┐
   │ AuthContext stores:  │
   │ - user               │
   │ - access token       │
   │ - refresh token      │
   └──────┬───────────────┘
          │
          ▼
   ┌──────────────┐
   │ Redirect to  │
   │ /            │
   │ (home)       │
   └──────────────┘

3. HEADER DISPLAY
   ┌──────────────────────────────────────────┐
   │ Header Component                         │
   ├──────────────────────────────────────────┤
   │ Logo | Home | Profile | Dashboard | 🔔  │
   │                              ▲           │
   │                              │           │
   │                    Shows only if:        │
   │                    - user.role ==        │
   │                      restaurant_owner    │
   │                      OR                  │
   │                      event_organizer     │
   └──────────────────────────────────────────┘

4. DASHBOARD ACCESS
   ┌──────────────────────────────────────────┐
   │ User clicks "Dashboard" in Header        │
   └──────┬───────────────────────────────────┘
          │
          ▼
   ┌──────────────────────────────────────────┐
   │ ProtectedRoute checks:                   │
   │ 1. Is user authenticated?                │
   │ 2. Does user have required role?         │
   └──────┬───────────────────────────────────┘
          │
          ├─ YES ──────────────────────────────┐
          │                                    │
          ▼                                    ▼
   ┌──────────────────────┐    ┌──────────────────────┐
   │ restaurant_owner     │    │ event_organizer      │
   │ role?                │    │ role?                │
   └──────┬───────────────┘    └──────┬───────────────┘
          │                           │
          ▼                           ▼
   ┌──────────────────────┐    ┌──────────────────────┐
   │ /dashboard/          │    │ /dashboard/          │
   │ restaurant-owner     │    │ event-organizer      │
   │                      │    │                      │
   │ RestaurantOwner      │    │ EventOrganizer       │
   │ Dashboard            │    │ Dashboard            │
   └──────────────────────┘    └──────────────────────┘
          │
          └─ NO ──────────────────────────────┐
                                              │
                                              ▼
                                      ┌──────────────────┐
                                      │ Access Denied    │
                                      │ Error Message    │
                                      └──────────────────┘
```

## Restaurant Owner Dashboard Flow

```
┌─────────────────────────────────────────────────────────────────┐
│         Restaurant Owner Dashboard                              │
│         /dashboard/restaurant-owner                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Tab Navigation                                                  │
├─────────────────────────────────────────────────────────────────┤
│ [Restaurants] [Menu Items] [Orders]                             │
└─────────────────────────────────────────────────────────────────┘

TAB 1: RESTAURANTS
┌─────────────────────────────────────────────────────────────────┐
│ GET /api/zesty/restaurants/                                     │
│ ↓                                                               │
│ Display: Grid of restaurant cards                              │
│ ├─ Restaurant Name                                             │
│ ├─ Description                                                 │
│ ├─ Cuisine Types                                               │
│ ├─ Rating                                                      │
│ └─ Status (Active/Inactive)                                    │
│                                                                 │
│ User Action: Click restaurant card                             │
│ ↓                                                               │
│ Set selectedRestaurant                                         │
│ ↓                                                               │
│ Load Menu Items & Orders for selected restaurant               │
└─────────────────────────────────────────────────────────────────┘

TAB 2: MENU ITEMS
┌─────────────────────────────────────────────────────────────────┐
│ GET /api/zesty/restaurants/:id/menu/                            │
│ ↓                                                               │
│ Display: Grid of menu item cards for selected restaurant       │
│ ├─ Item Name                                                   │
│ ├─ Description                                                 │
│ ├─ Price                                                       │
│ ├─ Category                                                    │
│ ├─ Status (Available/Unavailable)                              │
│ └─ [Edit] [Delete] buttons                                     │
│                                                                 │
│ User Actions:                                                  │
│ ├─ Click [Edit] → Edit menu item (to be implemented)          │
│ └─ Click [Delete] → Delete menu item (to be implemented)      │
└─────────────────────────────────────────────────────────────────┘

TAB 3: ORDERS
┌─────────────────────────────────────────────────────────────────┐
│ GET /api/zesty/orders/                                          │
│ ↓                                                               │
│ Display: List of incoming orders                               │
│ ├─ Order ID                                                    │
│ ├─ Order Date/Time                                             │
│ ├─ Order Items (with quantities)                               │
│ ├─ Total Amount                                                │
│ ├─ Current Status (badge)                                      │
│ └─ Status Update Dropdown                                      │
│    ├─ Confirmed                                                │
│    ├─ Preparing                                                │
│    └─ Ready                                                    │
│                                                                 │
│ User Action: Change status in dropdown                         │
│ ↓                                                               │
│ PATCH /api/zesty/orders/:id/update_status/                     │
│ ↓                                                               │
│ Update order status                                            │
│ ↓                                                               │
│ Notification sent to customer                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Event Organizer Dashboard Flow

```
┌─────────────────────────────────────────────────────────────────┐
│         Event Organizer Dashboard                               │
│         /dashboard/event-organizer                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Tab Navigation                                                  │
├─────────────────────────────────────────────────────────────────┤
│ [Events] [Ticket Types] [Bookings]                              │
└─────────────────────────────────────────────────────────────────┘

TAB 1: EVENTS
┌─────────────────────────────────────────────────────────────────┐
│ GET /api/eventra/events/                                        │
│ ↓                                                               │
│ Display: Grid of event cards                                   │
│ ├─ Event Name                                                  │
│ ├─ Description                                                 │
│ ├─ Category                                                    │
│ ├─ Event Date                                                  │
│ ├─ Available Seats / Total Seats                               │
│ ├─ Rating                                                      │
│ └─ Status (Published/Draft)                                    │
│                                                                 │
│ User Action: Click event card                                  │
│ ↓                                                               │
│ Set selectedEvent                                              │
│ ↓                                                               │
│ Load Ticket Types & Bookings for selected event                │
└─────────────────────────────────────────────────────────────────┘

TAB 2: TICKET TYPES
┌─────────────────────────────────────────────────────────────────┐
│ Display: Grid of ticket type cards for selected event           │
│ ├─ Ticket Type Name                                             │
│ ├─ Description                                                  │
│ ├─ Price                                                        │
│ ├─ Available / Total Quantity                                   │
│ └─ [Edit] [Delete] buttons                                      │
│                                                                 │
│ User Actions:                                                  │
│ ├─ Click [Edit] → Edit ticket type (to be implemented)         │
│ └─ Click [Delete] → Delete ticket type (to be implemented)     │
│                                                                 │
│ If no ticket types:                                            │
│ └─ [Create Ticket Type] button                                 │
└─────────────────────────────────────────────────────────────────┘

TAB 3: BOOKINGS
┌─────────────────────────────────────────────────────────────────┐
│ GET /api/eventra/bookings/                                      │
│ ↓                                                               │
│ Display: List of event bookings                                │
│ ├─ Booking Reference                                           │
│ ├─ Event Name                                                  │
│ ├─ Number of Tickets                                           │
│ ├─ Total Amount                                                │
│ ├─ Booking Date                                                │
│ └─ Status (badge)                                              │
│    ├─ Pending (yellow)                                         │
│    ├─ Confirmed (green)                                        │
│    └─ Cancelled (gray)                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Notification System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│         Notification System                                     │
└─────────────────────────────────────────────────────────────────┘

INITIALIZATION
┌──────────────────────────────────────────┐
│ NotificationProvider mounts              │
│ ↓                                        │
│ fetchNotifications()                     │
│ ↓                                        │
│ GET /api/notifications/                  │
│ ↓                                        │
│ Store notifications in state             │
│ ↓                                        │
│ Set up polling interval (60 seconds)     │
└──────────────────────────────────────────┘

POLLING
┌──────────────────────────────────────────┐
│ Every 60 seconds:                        │
│ ├─ GET /api/notifications/               │
│ ├─ Update notifications state            │
│ └─ Calculate unreadCount                 │
└──────────────────────────────────────────┘

HEADER DISPLAY
┌──────────────────────────────────────────┐
│ NotificationDropdown Component           │
│ ├─ Bell Icon                             │
│ └─ Unread Count Badge                    │
│    (shows only if unreadCount > 0)       │
└──────────────────────────────────────────┘

USER INTERACTION
┌──────────────────────────────────────────┐
│ User clicks bell icon                    │
│ ↓                                        │
│ Show dropdown with notifications         │
│ ├─ Notification Title                    │
│ ├─ Notification Message                  │
│ ├─ Timestamp                             │
│ └─ Unread indicator (blue dot)           │
│                                          │
│ User clicks notification                 │
│ ↓                                        │
│ PATCH /api/notifications/:id/mark_read/  │
│ ↓                                        │
│ Mark as read in state                    │
│ ↓                                        │
│ Navigate to related item                 │
│ ├─ If order: /orders/:id                 │
│ └─ If booking: /bookings/:id             │
│                                          │
│ User clicks "Mark all as read"           │
│ ↓                                        │
│ PATCH /api/notifications/mark_all_read/  │
│ ↓                                        │
│ Mark all as read in state                │
└──────────────────────────────────────────┘
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    State Management                             │
└─────────────────────────────────────────────────────────────────┘

AuthContext
├─ user: User | null
├─ isAuthenticated: boolean
├─ loading: boolean
├─ error: string | null
├─ login(email, password)
├─ register(data)
├─ logout()
├─ updateProfile(data)
└─ clearError()

CartContext (Zesty)
├─ items: CartItem[]
├─ restaurant: Restaurant | null
├─ subtotal: number
├─ deliveryFee: number
├─ tax: number
├─ total: number
├─ addItem(menuItem, quantity)
├─ updateQuantity(menuItemId, quantity)
├─ removeItem(menuItemId)
├─ clearCart()
└─ setRestaurant(restaurant)

BookingContext (Eventra)
├─ event: Event | null
├─ selectedSeats: Seat[]
├─ ticketType: TicketType | null
├─ subtotal: number
├─ tax: number
├─ total: number
├─ setEvent(event)
├─ setTicketType(ticketType)
├─ addSeat(seat)
├─ removeSeat(seatId)
└─ clearBooking()

NotificationContext
├─ notifications: Notification[]
├─ unreadCount: number
├─ loading: boolean
├─ fetchNotifications()
├─ markAsRead(notificationId)
└─ markAllAsRead()
```

## Component Hierarchy

```
App
├── Header
│   ├── Logo (Link to /)
│   ├── Navigation Links
│   │   ├── Home
│   │   ├── Profile
│   │   └── Dashboard (conditional)
│   ├── NotificationDropdown
│   │   ├── Bell Icon
│   │   ├── Unread Badge
│   │   └── Dropdown Menu
│   │       ├── Notification List
│   │       └── Mark All as Read
│   └── User Menu
│       ├── User Name
│       ├── Email & Role
│       └── Logout Button
│
├── Routes
│   ├── Public Routes
│   │   ├── / (HomePage)
│   │   ├── /login (LoginPage)
│   │   └── /register (RegisterPage)
│   │
│   ├── Protected Routes
│   │   ├── /profile (ProfilePage)
│   │   ├── /dashboard/restaurant-owner (RestaurantOwnerDashboard)
│   │   └── /dashboard/event-organizer (EventOrganizerDashboard)
│   │
│   ├── Zesty Routes (to be implemented)
│   │   ├── /restaurants (RestaurantListPage)
│   │   ├── /restaurants/:id (RestaurantDetailPage)
│   │   ├── /cart (CartPage)
│   │   ├── /checkout (CheckoutPage)
│   │   ├── /orders (OrderHistoryPage)
│   │   └── /orders/:id (OrderDetailPage)
│   │
│   └── Eventra Routes (to be implemented)
│       ├── /events (EventListPage)
│       ├── /events/:id (EventDetailPage)
│       ├── /events/:id/seats (SeatSelectionPage)
│       ├── /bookings/checkout (BookingCheckoutPage)
│       ├── /bookings (BookingHistoryPage)
│       └── /bookings/:id (BookingDetailPage)
│
└── Providers
    ├── AuthProvider
    ├── CartProvider
    ├── BookingProvider
    └── NotificationProvider
```

## API Call Flow

```
Frontend Component
    ↓
API Function (e.g., zestyAPI.listRestaurants())
    ↓
Axios Instance (api/client.ts)
    ├─ Request Interceptor
    │  └─ Add Authorization header with access token
    ├─ Make HTTP request
    └─ Response Interceptor
       ├─ If 401 (Unauthorized)
       │  ├─ Get refresh token
       │  ├─ POST /api/auth/token/refresh/
       │  ├─ Store new tokens
       │  └─ Retry original request
       └─ Return response
    ↓
Component receives data
    ↓
Update state
    ↓
Re-render component
```
