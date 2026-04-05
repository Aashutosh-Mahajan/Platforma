# Implementation Plan: Complete Platform Integration

## Overview

This implementation plan covers the complete integration of the Platforma dual-platform application (Zesty food delivery + Eventra event booking). The backend Django REST API has existing models and basic structure, but requires complete implementation of serializers, views, authentication, and business logic. The frontend React application needs to be built from scratch with proper API integration, state management, and user flows.

The implementation follows an incremental approach: backend endpoints first, then frontend components, then integration and testing.

## Tasks

- [x] 1. Backend: Core authentication and user management
  - [x] 1.1 Implement authentication serializers and views
    - Create RegisterSerializer with password validation and confirmation
    - Create LoginSerializer for email/password authentication
    - Create UserProfileSerializer for profile retrieval and updates
    - Implement RegisterView (POST /api/auth/register/)
    - Implement LoginView (POST /api/auth/login/)
    - Implement LogoutView (POST /api/auth/logout/)
    - Implement TokenRefreshView (POST /api/auth/token/refresh/)
    - Implement ProfileView (GET/PATCH /api/users/profile/)
    - Implement PasswordChangeView (POST /api/auth/password/change/)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.11, 1.12, 1.13_
  
  - [ ]* 1.2 Write property tests for authentication
    - **Property 1: User Registration Creates Account with Tokens**
    - **Validates: Requirements 1.2**
    - **Property 2: Invalid Registration Data Returns Validation Errors**
    - **Validates: Requirements 1.3**
    - **Property 3: Valid Login Credentials Return JWT Tokens**
    - **Validates: Requirements 1.5**
    - **Property 4: Invalid Login Credentials Return Authentication Error**
    - **Validates: Requirements 1.6**

  - [x] 1.3 Implement address management endpoints
    - Create AddressSerializer with validation
    - Implement AddressListCreateView (GET/POST /api/users/addresses/)
    - Implement AddressDetailView (GET/PATCH/DELETE /api/users/addresses/:id/)
    - Implement set_default action for addresses
    - Add permission checks (user can only access own addresses)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [ ]* 1.4 Write property tests for address management
    - **Property 10: Address Creation Stores Valid Address**
    - **Validates: Requirements 2.2**
    - **Property 11: Address Updates Persist Changes**
    - **Validates: Requirements 2.5**
    - **Property 12: Address Deletion Removes Address**
    - **Validates: Requirements 2.6**
    - **Property 13: Only One Default Address Per User**
    - **Validates: Requirements 2.7, 2.8**

- [x] 2. Backend: Zesty restaurant and menu endpoints
  - [x] 2.1 Implement restaurant serializers and views
    - Create RestaurantListSerializer (summary view)
    - Create RestaurantDetailSerializer (with menu items)
    - Implement RestaurantViewSet with list, retrieve actions
    - Add search filter for name and cuisine_types
    - Add ordering filters for rating, delivery_fee, delivery_time_max
    - Add pagination support
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_
  
  - [x] 2.2 Implement menu item endpoints
    - Create MenuItemSerializer
    - Implement menu_items action on RestaurantViewSet (GET /api/zesty/restaurants/:id/menu/)
    - Add category filtering
    - Add search filtering
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 2.3 Write property tests for restaurant browsing
    - **Property 14: Restaurant Search Returns Matching Results**
    - **Validates: Requirements 3.3**
    - **Property 15: Restaurant Filters Return Matching Results**
    - **Validates: Requirements 3.4**
    - **Property 16: Restaurant Sorting Orders Results Correctly**
    - **Validates: Requirements 3.5**
    - **Property 17: Restaurant Pagination Returns Correct Page**
    - **Validates: Requirements 3.7**

- [x] 3. Backend: Zesty order and payment endpoints
  - [x] 3.1 Implement order serializers and views
    - Create OrderItemSerializer
    - Create OrderCreateSerializer (for order creation)
    - Create OrderListSerializer (summary view)
    - Create OrderDetailSerializer (with items and tracking)
    - Implement OrderViewSet with list, create, retrieve actions
    - Add status filtering
    - Implement calculate_totals logic in order creation
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4_
  
  - [x] 3.2 Implement payment simulation and order confirmation
    - Create payment record for non-COD orders
    - Call Payment.simulate_payment() method
    - Update order status to 'confirmed' on successful payment
    - Create notification for order confirmation
    - Handle payment failure with proper error response
    - Wrap order creation in database transaction
    - _Requirements: 5.8, 5.9, 5.10, 5.11, 5.13_
  
  - [x] 3.3 Implement order cancellation endpoint
    - Implement cancel action on OrderViewSet (PATCH /api/zesty/orders/:id/cancel/)
    - Validate order status is 'pending' or 'confirmed'
    - Update order status to 'cancelled'
    - Process refund if payment exists
    - Create notification for cancellation
    - _Requirements: 6.8, 6.9_

  - [x] 3.4 Implement delivery tracking endpoint
    - Create DeliveryTrackingSerializer
    - Implement tracking action on OrderViewSet (GET /api/zesty/orders/:id/tracking/)
    - Return tracking info or create placeholder if not exists
    - _Requirements: 6.5, 6.6, 6.7_
  
  - [ ]* 3.5 Write property tests for order management
    - **Property 22: Checkout Requires Delivery Address**
    - **Validates: Requirements 5.2**
    - **Property 23: Order Creation Generates Order with Items**
    - **Validates: Requirements 5.6**
    - **Property 24: Order Totals Are Correctly Calculated**
    - **Validates: Requirements 5.7**
    - **Property 25: Non-COD Payment Creates Payment Record**
    - **Validates: Requirements 5.8**
    - **Property 26: Successful Payment Confirms Order**
    - **Validates: Requirements 5.9**
    - **Property 27: Failed Payment Prevents Order Creation**
    - **Validates: Requirements 5.10**
    - **Property 30: Cancellable Orders Can Be Cancelled**
    - **Validates: Requirements 6.8, 6.9**

- [x] 4. Backend: Zesty review endpoints
  - [x] 4.1 Implement restaurant review endpoints
    - Create ReviewSerializer
    - Implement reviews action on RestaurantViewSet (GET /api/zesty/restaurants/:id/reviews/)
    - Implement create_review action (POST /api/zesty/restaurants/:id/reviews/)
    - Validate user has delivered order from restaurant
    - Call restaurant.update_rating() after review creation
    - Handle unique constraint (one review per user per restaurant)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_
  
  - [ ]* 4.2 Write property tests for restaurant reviews
    - **Property 31: Restaurant Review Requires Delivered Order**
    - **Validates: Requirements 7.1, 7.3**
    - **Property 32: Review Creation Updates Restaurant Rating**
    - **Validates: Requirements 7.4, 7.5**
    - **Property 33: One Review Per User Per Restaurant**
    - **Validates: Requirements 7.8**


- [x] 5. Backend: Eventra event and ticket endpoints
  - [x] 5.1 Implement event serializers and views
    - Create EventListSerializer (summary view)
    - Create EventDetailSerializer (with ticket types)
    - Create TicketTypeSerializer
    - Implement EventViewSet with list, retrieve actions
    - Add search filter for name and venue_name
    - Add filters for category, date range, price range, city
    - Add ordering filters for event_date, rating
    - Add pagination support
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 9.1, 9.2, 9.3, 9.4_
  
  - [x] 5.2 Implement seat selection endpoint
    - Create SeatSerializer
    - Implement seats action on EventViewSet (GET /api/eventra/events/:id/seats/)
    - Add filters for ticket_type_id, section, status
    - Group seats by section in response
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ]* 5.3 Write property tests for event browsing
    - **Property 34: Event Search Returns Matching Results**
    - **Validates: Requirements 8.4**
    - **Property 35: Event Filters Return Matching Results**
    - **Validates: Requirements 8.5**
    - **Property 36: Event Sorting Orders Results Correctly**
    - **Validates: Requirements 8.6**
    - **Property 37: Event Pagination Returns Correct Page**
    - **Validates: Requirements 8.8**
    - **Property 38: Sold Out Events Prevent Booking**
    - **Validates: Requirements 9.6**
    - **Property 39: Cancelled Events Prevent Booking**
    - **Validates: Requirements 9.7**

- [x] 6. Backend: Eventra booking and payment endpoints
  - [x] 6.1 Implement booking serializers and views
    - Create BookingSeatSerializer
    - Create BookingCreateSerializer (for booking creation)
    - Create BookingListSerializer (summary view)
    - Create BookingDetailSerializer (with seats)
    - Implement BookingViewSet with list, create, retrieve actions
    - Add status filtering
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 6.2 Implement seat reservation and booking logic
    - Validate seats are available before booking
    - Mark seats as 'reserved' with 10-minute expiration
    - Generate unique booking_reference
    - Create booking_seat records
    - Calculate booking totals (subtotal, tax 18%, total)
    - Create payment record and simulate payment
    - On success: update booking to 'confirmed', seats to 'booked', create notification
    - On failure: delete booking, return seats to 'available'
    - Wrap booking creation in database transaction
    - Use database locking to prevent race conditions
    - _Requirements: 10.10, 10.11, 10.12, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11, 11.12_
  
  - [x] 6.3 Implement booking cancellation endpoint
    - Implement cancel action on BookingViewSet (PATCH /api/eventra/bookings/:id/cancel/)
    - Validate booking status is 'pending' or 'confirmed'
    - Validate event_date is at least 24 hours in future
    - Update booking status to 'cancelled'
    - Return seats to 'available' status
    - Process refund if payment exists
    - Create notification for cancellation
    - _Requirements: 12.6, 12.7_
  
  - [ ]* 6.4 Write property tests for booking management
    - **Property 40: Available Seats Can Be Selected**
    - **Validates: Requirements 10.4, 10.5**
    - **Property 43: Unavailable Seats Cannot Be Selected**
    - **Validates: Requirements 10.9**
    - **Property 44: Seat Reservation Marks Seats as Reserved**
    - **Validates: Requirements 10.10, 10.11**
    - **Property 46: Booking Creation Generates Booking with Reference**
    - **Validates: Requirements 11.5**
    - **Property 47: Booking Links to Selected Seats**
    - **Validates: Requirements 11.6**
    - **Property 48: Booking Totals Are Correctly Calculated**
    - **Validates: Requirements 11.7**
    - **Property 49: Booking Payment Creates Payment Record**
    - **Validates: Requirements 11.8**
    - **Property 50: Successful Booking Payment Confirms Booking**
    - **Validates: Requirements 11.9**
    - **Property 51: Failed Booking Payment Rolls Back**
    - **Validates: Requirements 11.10**
    - **Property 53: Cancellable Bookings Can Be Cancelled**
    - **Validates: Requirements 12.6, 12.7**


- [x] 7. Backend: Eventra review endpoints
  - [x] 7.1 Implement event review endpoints
    - Create EventReviewSerializer
    - Implement reviews action on EventViewSet (GET /api/eventra/events/:id/reviews/)
    - Implement create_review action (POST /api/eventra/events/:id/reviews/)
    - Validate user has confirmed booking for event
    - Call event.update_rating() after review creation
    - Handle unique constraint (one review per user per event)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_
  
  - [ ]* 7.2 Write property tests for event reviews
    - **Property 54: Event Review Requires Confirmed Booking**
    - **Validates: Requirements 13.1, 13.3**
    - **Property 55: Event Review Creation Updates Event Rating**
    - **Validates: Requirements 13.4, 13.5**
    - **Property 56: One Review Per User Per Event**
    - **Validates: Requirements 13.8**

- [x] 8. Backend: Notification and search endpoints
  - [x] 8.1 Implement notification endpoints
    - Create NotificationSerializer
    - Implement NotificationViewSet with list action
    - Add unread filter
    - Implement mark_read action (PATCH /api/notifications/:id/mark_read/)
    - Implement mark_all_read action (PATCH /api/notifications/mark_all_read/)
    - _Requirements: 16.4, 16.5, 16.6, 16.7, 16.8, 16.9_
  
  - [x] 8.2 Implement global search endpoint
    - Create SearchView (GET /api/search/)
    - Search across restaurants (name, cuisine_types)
    - Search across events (name, venue_name)
    - Search across menu items (name, description)
    - Add scope parameter (all, restaurants, events, menu)
    - Add limit parameter
    - _Requirements: 20.14_

- [-] 9. Backend: Dashboard endpoints for restaurant owners
  - [x] 9.1 Implement restaurant owner CRUD endpoints
    - Add create, update, destroy actions to RestaurantViewSet
    - Add permission check: IsRestaurantOwner
    - Filter restaurants by owner in list view
    - Add toggle_active action
    - _Requirements: 14.2, 14.3, 14.4, 14.5, 14.6_

  - [x] 9.2 Implement menu item CRUD endpoints
    - Create MenuItemViewSet with CRUD actions
    - Add permission check: IsRestaurantOwner (owns the restaurant)
    - Filter menu items by restaurant
    - Add toggle_available action
    - _Requirements: 14.7, 14.8, 14.9, 14.10, 14.11_
  
  - [x] 9.3 Implement order status update endpoint
    - Implement update_status action on OrderViewSet
    - Add permission check: IsRestaurantOwner or IsAdmin
    - Validate status transitions (confirmed → preparing → ready)
    - Create notification on status change
    - _Requirements: 14.12, 14.13, 16.1_
  
  - [ ]* 9.4 Write property tests for restaurant owner operations
    - **Property 57: Restaurant CRUD Operations Persist Changes**
    - **Validates: Requirements 14.3, 14.4**
    - **Property 58: Menu Item CRUD Operations Persist Changes**
    - **Validates: Requirements 14.8, 14.9, 14.11**
    - **Property 59: Order Status Updates Trigger Notifications**
    - **Validates: Requirements 14.13, 16.1**

- [-] 10. Backend: Dashboard endpoints for event organizers
  - [x] 10.1 Implement event organizer CRUD endpoints
    - Add create, update, destroy actions to EventViewSet
    - Add permission check: IsEventOrganizer
    - Filter events by organizer in list view
    - Add toggle_published action
    - Add cancel_event action
    - _Requirements: 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8_
  
  - [x] 10.2 Implement ticket type CRUD endpoints
    - Create TicketTypeViewSet with CRUD actions
    - Add permission check: IsEventOrganizer (owns the event)
    - Filter ticket types by event
    - _Requirements: 15.9, 15.10_
  
  - [x] 10.3 Implement seat management endpoints
    - Create SeatViewSet with CRUD actions
    - Add permission check: IsEventOrganizer (owns the event)
    - Add bulk_create action for creating multiple seats
    - _Requirements: 15.11, 15.12_

  - [ ]* 10.4 Write property tests for event organizer operations
    - **Property 60: Event CRUD Operations Persist Changes**
    - **Validates: Requirements 15.3, 15.4**
    - **Property 61: Ticket Type CRUD Operations Persist Changes**
    - **Validates: Requirements 15.9, 15.10**

- [x] 11. Checkpoint - Backend API complete
  - Ensure all backend tests pass, verify API endpoints work with manual testing or Postman, ask the user if questions arise.

- [-] 12. Frontend: Project setup and configuration
  - [x] 12.1 Initialize React + TypeScript + Vite project
    - Create frontend directory structure (src/components, src/pages, src/contexts, src/api, src/types, src/utils)
    - Install dependencies: react, react-dom, react-router-dom, axios, tailwindcss
    - Configure Vite with TypeScript
    - Configure Tailwind CSS with PostCSS
    - Create .env file with VITE_API_BASE_URL
    - _Requirements: 21.1_
  
  - [x] 12.2 Implement API client with interceptors
    - Create src/api/client.ts with axios instance
    - Implement request interceptor to add Authorization header
    - Implement response interceptor for token refresh on 401
    - Create token management functions (getAccessToken, getRefreshToken, setTokens, clearTokens)
    - Store tokens in memory or localStorage
    - _Requirements: 1.7, 1.8, 1.9, 1.10, 17.1, 17.2, 17.3_
  
  - [x] 12.3 Create TypeScript type definitions
    - Define User, Address, Restaurant, MenuItem, Order, OrderItem types
    - Define Event, TicketType, Seat, Booking, BookingSeat types
    - Define Notification, Payment types
    - Define API response types (PaginatedResponse, ErrorResponse)
    - _Requirements: All_

- [-] 13. Frontend: Authentication context and pages
  - [x] 13.1 Implement AuthContext
    - Create src/contexts/AuthContext.tsx
    - Implement AuthProvider with state (user, isAuthenticated, loading)
    - Implement login, register, logout, updateProfile functions
    - Persist authentication state across page refreshes
    - _Requirements: 1.1, 1.2, 1.5, 1.12, 1.14, 19.2, 19.6_

  - [x] 13.2 Implement authentication pages
    - Create src/pages/auth/LoginPage.tsx with email/password form
    - Create src/pages/auth/RegisterPage.tsx with registration form
    - Create src/pages/auth/ProfilePage.tsx with profile view and edit
    - Add form validation (email format, password strength, required fields)
    - Display inline validation errors
    - Handle API errors and display error messages
    - Redirect to home on successful login/register
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.11, 1.12, 1.13, 22.1, 22.2, 22.3, 22.4, 22.5_
  
  - [x] 13.3 Implement address management UI
    - Create src/components/AddressManager.tsx
    - Display list of user addresses
    - Add form for creating new address
    - Add edit and delete functionality
    - Add set as default functionality
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_
  
  - [ ]* 13.4 Write unit tests for authentication
    - Test AuthContext state management
    - Test login/register/logout functions
    - Test token refresh logic
    - Test form validation

- [x] 14. Frontend: Zesty restaurant browsing and cart
  - [x] 14.1 Implement CartContext
    - Create src/contexts/CartContext.tsx
    - Implement CartProvider with state (items, restaurant, totals)
    - Implement addItem, updateQuantity, removeItem, clearCart functions
    - Calculate totals (subtotal, deliveryFee, tax 5%, total)
    - Persist cart state in sessionStorage
    - _Requirements: 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 19.3_
  
  - [x] 14.2 Implement restaurant list page
    - Create src/pages/zesty/RestaurantListPage.tsx
    - Fetch restaurants from API with pagination
    - Display restaurant cards with image, name, cuisine, rating, delivery info
    - Add search input with debouncing
    - Add filter controls (cuisine, rating, delivery time)
    - Add sorting dropdown (rating, delivery fee, delivery time)
    - Implement infinite scroll or pagination
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 14.3 Implement restaurant detail page
    - Create src/pages/zesty/RestaurantDetailPage.tsx
    - Fetch restaurant details and menu items from API
    - Display restaurant info (banner, name, description, rating, delivery info)
    - Display menu items grouped by category
    - Add "Add to Cart" buttons with quantity selector
    - Display cart summary sidebar
    - Handle cart restaurant change warning
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.11_
  
  - [x] 14.4 Implement cart and checkout pages
    - Create src/pages/zesty/CartPage.tsx
    - Display cart items with quantities and prices
    - Add update quantity and remove item controls
    - Display totals breakdown (subtotal, delivery fee, tax, total)
    - Add "Proceed to Checkout" button
    - Create src/pages/zesty/CheckoutPage.tsx
    - Display cart summary
    - Add address selection (fetch from API)
    - Add special instructions input
    - Add payment method selection
    - Implement order creation on submit
    - Clear cart on successful order
    - Redirect to order detail page
    - _Requirements: 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 5.5, 5.11, 5.12_
  
  - [ ]* 14.5 Write property tests for cart management
    - **Property 18: Adding Item to Cart Increases Cart Size**
    - **Validates: Requirements 4.5**
    - **Property 19: Updating Cart Quantity Updates Totals**
    - **Validates: Requirements 4.7**
    - **Property 20: Removing Item from Cart Decreases Cart Size**
    - **Validates: Requirements 4.8**
    - **Property 21: Cart Totals Are Correctly Calculated**
    - **Validates: Requirements 4.9**

- [x] 15. Frontend: Zesty order tracking and reviews
  - [x] 15.1 Implement order history and detail pages
    - Create src/pages/zesty/OrderHistoryPage.tsx
    - Fetch user orders from API
    - Display order cards with restaurant, items, total, status, date
    - Add status filter dropdown
    - Create src/pages/zesty/OrderDetailPage.tsx
    - Fetch order details from API
    - Display order info, items, delivery address, totals
    - Display status timeline with current status highlighted
    - Poll API for status updates every 30 seconds for active orders
    - Add cancel order button (if status allows)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.8, 6.9, 6.10_

  - [x] 15.2 Implement restaurant review UI
    - Add review form to RestaurantDetailPage
    - Display existing reviews with rating, comment, author, date
    - Validate user has delivered order before showing review form
    - Submit review to API
    - Handle unique constraint error (already reviewed)
    - _Requirements: 7.1, 7.2, 7.3, 7.6, 7.7_

- [x] 16. Frontend: Eventra event browsing and seat selection
  - [x] 16.1 Implement BookingContext
    - Create src/contexts/BookingContext.tsx
    - Implement BookingProvider with state (event, selectedSeats, ticketType, totals)
    - Implement setEvent, setTicketType, addSeat, removeSeat, clearBooking functions
    - Calculate totals (subtotal, tax 18%, total)
    - _Requirements: 10.5, 10.6, 19.4_
  
  - [x] 16.2 Implement event list page
    - Create src/pages/eventra/EventListPage.tsx
    - Fetch events from API with pagination
    - Display category tabs (movie, concert, sports, theater, comedy, expo, dining)
    - Display event cards with image, name, venue, date, rating, price
    - Add search input with debouncing
    - Add filter controls (category, date range, price range)
    - Add sorting dropdown (date, rating, price)
    - Implement infinite scroll or pagination
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_
  
  - [x] 16.3 Implement event detail page
    - Create src/pages/eventra/EventDetailPage.tsx
    - Fetch event details from API
    - Display event info (banner, name, description, venue, date, rating)
    - Display ticket types with price, quantity available, benefits
    - Add "Book Tickets" button for each ticket type
    - Display "Sold Out" if no seats available
    - Display "Event Cancelled" if event is cancelled
    - Display event reviews
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [x] 16.4 Implement seat selection page
    - Create src/pages/eventra/SeatSelectionPage.tsx
    - Fetch seat map from API
    - Render visual seat map based on event category (cinema, concert, stadium, theater)
    - Display seats with status indicators (available, booked, reserved, blocked)
    - Implement seat selection/deselection on click
    - Prevent selection of unavailable seats
    - Display booking summary with selected seats and total
    - Add "Proceed to Checkout" button
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_

  - [ ]* 16.5 Write property tests for seat selection
    - **Property 41: Selected Seats Can Be Deselected**
    - **Validates: Requirements 10.6**
    - **Property 42: Seat Selection Respects Maximum Limit**
    - **Validates: Requirements 10.8**

- [x] 17. Frontend: Eventra booking management and reviews
  - [x] 17.1 Implement booking checkout page
    - Create src/pages/eventra/BookingCheckoutPage.tsx
    - Display booking summary with selected seats, event info, totals
    - Add payment method selection
    - Implement booking creation on submit
    - Clear booking context on success
    - Redirect to booking detail page
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 17.2 Implement booking history and detail pages
    - Create src/pages/eventra/BookingHistoryPage.tsx
    - Fetch user bookings from API
    - Display booking cards with event, date, venue, tickets, total, status
    - Add status filter dropdown
    - Create src/pages/eventra/BookingDetailPage.tsx
    - Fetch booking details from API
    - Display booking reference, event info, selected seats, totals
    - Display QR code or booking reference for entry
    - Add cancel booking button (if status and date allow)
    - Add download/share booking confirmation
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_
  
  - [x] 17.3 Implement event review UI
    - Add review form to EventDetailPage
    - Display existing reviews with rating, comment, author, date
    - Validate user has confirmed booking before showing review form
    - Submit review to API
    - Handle unique constraint error (already reviewed)
    - _Requirements: 13.1, 13.2, 13.6, 13.7_

- [ ] 18. Frontend: Notification system
  - [x] 18.1 Implement NotificationContext
    - Create src/contexts/NotificationContext.tsx
    - Implement NotificationProvider with state (notifications, unreadCount, loading)
    - Implement fetchNotifications, markAsRead, markAllAsRead functions
    - Poll API for new notifications every 60 seconds
    - _Requirements: 16.9, 19.5_

  - [x] 18.2 Implement notification dropdown component
    - Create src/components/NotificationDropdown.tsx
    - Display notification icon in header with unread count badge
    - Display dropdown with recent notifications on click
    - Show notification title, message, timestamp
    - Mark notification as read when viewed
    - Add "Mark all as read" button
    - Add navigation to related order/booking on click
    - _Requirements: 16.4, 16.5, 16.6, 16.7, 16.8_

- [-] 19. Frontend: Dashboard pages
  - [x] 19.1 Implement restaurant owner dashboard
    - Create src/pages/dashboard/RestaurantOwnerDashboard.tsx
    - Add ProtectedRoute with role check (restaurant_owner)
    - Display list of owned restaurants
    - Add create restaurant form/modal
    - Add edit restaurant functionality
    - Add toggle active status
    - Display menu items for selected restaurant
    - Add create/edit/delete menu item functionality
    - Add toggle menu item availability
    - Display incoming orders for restaurant
    - Add order status update controls
    - Display analytics (total orders, revenue, rating)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10, 14.11, 14.12, 14.13, 14.14_
  
  - [x] 19.2 Implement event organizer dashboard
    - Create src/pages/dashboard/EventOrganizerDashboard.tsx
    - Add ProtectedRoute with role check (event_organizer)
    - Display list of created events
    - Add create event form/modal
    - Add edit event functionality
    - Add toggle published status
    - Add cancel event functionality
    - Display ticket types for selected event
    - Add create/edit ticket type functionality
    - Display seat layout management
    - Add create seats functionality (bulk)
    - Display bookings for event
    - Display analytics (total bookings, revenue, available seats)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10, 15.11, 15.12, 15.13, 15.14, 15.15_

- [x] 20. Frontend: Shared components and routing
  - [x] 20.1 Implement shared components
    - Create src/components/Header.tsx with navigation, notification icon, user menu
    - Create src/components/ProtectedRoute.tsx for authentication check
    - Create src/components/LoadingSpinner.tsx
    - Create src/components/ErrorMessage.tsx with retry button
    - Create src/components/ErrorBoundary.tsx
    - _Requirements: 17.9, 17.10, 17.11, 21.6, 21.7_

  - [x] 20.2 Implement routing configuration
    - Create src/App.tsx with React Router setup
    - Add routes for home, login, register, profile
    - Add routes for Zesty: restaurants, restaurant detail, cart, checkout, order history, order detail
    - Add routes for Eventra: events, event detail, seat selection, booking checkout, booking history, booking detail
    - Add routes for dashboards (restaurant owner, event organizer)
    - Implement protected routes with authentication check
    - Implement role-based routes with role check
    - Add 404 page
    - Update page titles based on route
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9, 21.10, 21.11_

- [x] 21. Frontend: Error handling and validation
  - [x] 21.1 Implement comprehensive error handling
    - Add error handling in API client for network errors
    - Add error handling for 400, 401, 403, 404, 500 status codes
    - Display user-friendly error messages
    - Implement retry logic with exponential backoff
    - Add timeout handling
    - _Requirements: 17.1, 17.4, 17.5, 17.6, 17.7, 17.8_
  
  - [x] 21.2 Implement form validation
    - Add validation for email format
    - Add validation for password strength (min 8 chars, uppercase, lowercase, number)
    - Add validation for phone number format
    - Add validation for required fields
    - Add validation for numeric fields
    - Add validation for date fields
    - Display inline validation errors
    - Prevent form submission with invalid data
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8_
  
  - [ ]* 21.3 Write property tests for validation
    - **Property 64: Form Validation Prevents Invalid Submissions**
    - **Validates: Requirements 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8**

- [x] 22. Frontend: Responsive design and accessibility
  - [x] 22.1 Implement responsive design
    - Use Tailwind CSS breakpoints for mobile (320px-767px)
    - Use Tailwind CSS breakpoints for tablet (768px-1023px)
    - Use Tailwind CSS breakpoints for desktop (1024px+)
    - Test all pages on different screen sizes
    - Ensure proper layout and readability on all devices
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 22.2 Implement accessibility features
    - Use semantic HTML elements (header, nav, main, section, article, footer)
    - Add alt text for all images
    - Ensure color contrast meets WCAG AA standard
    - Support keyboard navigation for all interactive elements
    - Add focus indicators for keyboard navigation
    - Add ARIA labels and roles where appropriate
    - Test with screen reader
    - _Requirements: 18.5, 18.6, 18.7, 18.8, 18.9, 18.10_

- [x] 23. Frontend: Performance optimization
  - [x] 23.1 Implement performance optimizations
    - Add code splitting with React.lazy for route-based lazy loading
    - Optimize images (use appropriate formats and sizes)
    - Implement lazy loading for images below the fold
    - Add debouncing for search inputs (300ms delay)
    - Implement virtual scrolling for long lists (if needed)
    - Cache API responses where appropriate (React Query or SWR)
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6_

- [x] 24. Checkpoint - Frontend application complete
  - Ensure all frontend pages render correctly, test user flows manually, verify API integration works, ask the user if questions arise.

- [ ] 25. Integration testing and bug fixes
  - [ ] 25.1 Test complete user flows
    - Test registration → login → profile update flow
    - Test restaurant browsing → menu viewing → cart → checkout → order creation → tracking flow
    - Test event browsing → seat selection → booking creation → confirmation flow
    - Test order cancellation and refund flow
    - Test booking cancellation and refund flow
    - Test review submission for restaurants and events
    - Test restaurant owner dashboard CRUD operations
    - Test event organizer dashboard CRUD operations
    - Test notification system (creation, display, mark as read)
    - _Requirements: All_
  
  - [ ] 25.2 Fix integration bugs
    - Fix any bugs discovered during integration testing
    - Ensure proper error handling throughout the application
    - Verify all validation rules work correctly
    - Test edge cases and boundary conditions
  
  - [ ]* 25.3 Write end-to-end tests for critical flows
    - Test login → order creation → order tracking flow
    - Test login → booking creation → booking confirmation flow
    - Test dashboard operations (restaurant owner, event organizer)


- [-] 26. Backend: Database optimization and indexing
  - [ ] 26.1 Add database indexes for performance
    - Verify indexes on User (email, phone, role)
    - Verify indexes on Restaurant (rating, is_active)
    - Add indexes on Order (status, created_at, user_id, restaurant_id)
    - Add indexes on Booking (status, booking_date, user_id, event_id)
    - Add indexes on Event (category, event_date, is_published)
    - Add indexes on Seat (event_id, status)
    - _Requirements: 23.7_
  
  - [ ] 26.2 Optimize database queries
    - Use select_related for foreign key relationships
    - Use prefetch_related for reverse foreign key relationships
    - Add database query optimization for list views
    - Verify N+1 query problems are resolved
    - _Requirements: 23.7_

- [-] 27. Backend: Additional validation and business rules
  - [ ] 27.1 Implement comprehensive validation
    - Validate email format in serializers
    - Validate phone number format
    - Validate password strength (min 8 chars, complexity)
    - Validate numeric ranges (price > 0, quantity > 0)
    - Validate date ranges (event_date in future, booking cancellation 24h before)
    - Sanitize user inputs to prevent XSS
    - _Requirements: 22.9, 22.10, 22.11, 22.12_
  
  - [ ] 27.2 Implement business rule validation
    - Validate user cannot book more seats than available
    - Validate user cannot review without delivered order/confirmed booking
    - Validate restaurant owner can only modify own restaurants
    - Validate event organizer can only modify own events
    - Validate order cancellation only for pending/confirmed status
    - Validate booking cancellation only for pending/confirmed status and 24h before event
    - _Requirements: 22.11_
  
  - [ ]* 27.3 Write property tests for validation
    - **Property 65: Backend Validation Returns Detailed Errors**
    - **Validates: Requirements 22.9, 22.10**
    - **Property 66: Business Rule Validation Enforces Constraints**
    - **Validates: Requirements 22.11**

- [-] 28. Backend: Permission classes and security
  - [ ] 28.1 Implement custom permission classes
    - Create IsRestaurantOwner permission class
    - Create IsEventOrganizer permission class
    - Create IsOwnerOrReadOnly permission class
    - Apply permissions to all dashboard endpoints
    - _Requirements: 14.1, 15.1_

  - [ ] 28.2 Implement security best practices
    - Ensure CORS is properly configured
    - Verify JWT token expiration and refresh work correctly
    - Ensure sensitive data is not exposed in API responses
    - Verify rate limiting is configured (if needed)
    - Test for SQL injection vulnerabilities
    - Test for XSS vulnerabilities
    - _Requirements: 22.12_

- [-] 29. Documentation and deployment preparation
  - [ ] 29.1 Create API documentation
    - Document all API endpoints with request/response examples
    - Document authentication flow
    - Document error response formats
    - Create Postman collection or OpenAPI/Swagger spec
    - _Requirements: 20.15, 20.16_
  
  - [ ] 29.2 Create deployment documentation
    - Document environment variables for backend
    - Document environment variables for frontend
    - Create deployment guide for backend (Django)
    - Create deployment guide for frontend (Vite build)
    - Document database migration steps
    - Document initial data seeding (if needed)

- [-] 30. Final testing and quality assurance
  - [ ] 30.1 Run comprehensive test suite
    - Run all backend unit tests
    - Run all backend property-based tests
    - Run all frontend unit tests
    - Run all frontend property-based tests
    - Run all integration tests
    - Verify test coverage meets requirements (70%+ for critical paths)
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8, 24.9, 24.10_
  
  - [ ] 30.2 Perform manual testing
    - Test all user flows on different browsers (Chrome, Firefox, Safari)
    - Test on different devices (desktop, tablet, mobile)
    - Test with different user roles (customer, restaurant owner, event organizer)
    - Test edge cases and error scenarios
    - Verify accessibility with screen reader
    - Run Lighthouse audit and verify performance score ≥ 80
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 23.10_
  
  - [ ] 30.3 Fix remaining bugs and issues
    - Address any bugs found during final testing
    - Optimize performance bottlenecks
    - Improve error messages and user feedback
    - Polish UI/UX based on testing feedback

- [x] 31. Final checkpoint - Project complete
  - Ensure all tests pass, verify all requirements are met, confirm application is ready for deployment, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Backend tasks should be completed before frontend tasks for smooth integration
- Property tests validate universal correctness properties from the design document
- Integration tests validate end-to-end user flows across frontend and backend
