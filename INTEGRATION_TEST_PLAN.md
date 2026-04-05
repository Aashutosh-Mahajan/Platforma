# Integration Test Plan - Task 25

## Test Environment
- Backend: http://127.0.0.1:8000/
- Frontend: http://localhost:5173/
- Test Date: 2026-04-05

## Test Flows (Task 25.1)

### Flow 1: Registration → Login → Profile Update
**Steps:**
1. Navigate to registration page
2. Fill registration form with valid data
3. Submit registration
4. Verify JWT tokens received
5. Verify redirect to home page
6. Navigate to profile page
7. Update profile information
8. Verify profile updates persist

**Expected Results:**
- Registration creates new user account
- Login returns access and refresh tokens
- Profile page displays user information
- Profile updates are saved successfully

**Status:** ⏳ Pending

---

### Flow 2: Restaurant Browsing → Menu Viewing → Cart → Checkout → Order Creation → Tracking
**Steps:**
1. Login as customer
2. Navigate to restaurants page
3. Browse restaurants with filters/search
4. Click on a restaurant
5. View menu items
6. Add items to cart
7. Adjust quantities in cart
8. Proceed to checkout
9. Select delivery address
10. Choose payment method
11. Complete order
12. View order confirmation
13. Navigate to order tracking
14. View order status updates

**Expected Results:**
- Restaurants display with correct information
- Menu items can be added to cart
- Cart calculations are correct
- Order is created successfully
- Payment is processed
- Order status is tracked

**Status:** ⏳ Pending

---

### Flow 3: Event Browsing → Seat Selection → Booking Creation → Confirmation
**Steps:**
1. Login as customer
2. Navigate to events page
3. Browse events with filters/search
4. Click on an event
5. View event details and ticket types
6. Select ticket type
7. Navigate to seat selection
8. Select seats from seat map
9. Proceed to checkout
10. Choose payment method
11. Complete booking
12. View booking confirmation with reference

**Expected Results:**
- Events display with correct information
- Seat map renders correctly
- Seats can be selected/deselected
- Booking is created successfully
- Payment is processed
- Booking reference is generated

**Status:** ⏳ Pending

---

### Flow 4: Order Cancellation and Refund
**Steps:**
1. Login as customer with existing order
2. Navigate to order history
3. Select a cancellable order (pending/confirmed)
4. Click cancel order
5. Confirm cancellation
6. Verify order status updated to cancelled
7. Verify refund processed (if payment was made)

**Expected Results:**
- Only cancellable orders show cancel button
- Order status updates to cancelled
- Refund is processed for paid orders
- Notification is sent

**Status:** ⏳ Pending

---

### Flow 5: Booking Cancellation and Refund
**Steps:**
1. Login as customer with existing booking
2. Navigate to booking history
3. Select a cancellable booking (>24h before event)
4. Click cancel booking
5. Confirm cancellation
6. Verify booking status updated to cancelled
7. Verify seats returned to available
8. Verify refund processed

**Expected Results:**
- Only cancellable bookings show cancel button
- Booking status updates to cancelled
- Seats return to available status
- Refund is processed
- Notification is sent

**Status:** ⏳ Pending

---

### Flow 6: Review Submission for Restaurants and Events
**Steps:**
1. Login as customer with delivered order
2. Navigate to restaurant detail page
3. Submit review with rating and comment
4. Verify review appears on restaurant page
5. Verify restaurant rating updated
6. Login as customer with past event booking
7. Navigate to event detail page
8. Submit review with rating and comment
9. Verify review appears on event page
10. Verify event rating updated

**Expected Results:**
- Reviews can only be submitted after delivery/event
- Reviews are saved and displayed
- Ratings are recalculated correctly
- One review per user per restaurant/event

**Status:** ⏳ Pending

---

### Flow 7: Restaurant Owner Dashboard CRUD Operations
**Steps:**
1. Login as restaurant owner
2. Navigate to restaurant owner dashboard
3. Create new restaurant
4. Edit restaurant information
5. Toggle restaurant active status
6. Add menu items
7. Edit menu items
8. Toggle menu item availability
9. Delete menu item
10. View incoming orders
11. Update order status

**Expected Results:**
- Restaurant CRUD operations work correctly
- Menu item CRUD operations work correctly
- Orders display for owned restaurants
- Order status can be updated
- Notifications sent on status changes

**Status:** ⏳ Pending

---

### Flow 8: Event Organizer Dashboard CRUD Operations
**Steps:**
1. Login as event organizer
2. Navigate to event organizer dashboard
3. Create new event
4. Edit event information
5. Toggle event published status
6. Add ticket types
7. Edit ticket types
8. Create seat layout
9. View bookings
10. Cancel event

**Expected Results:**
- Event CRUD operations work correctly
- Ticket type CRUD operations work correctly
- Seat creation works correctly
- Bookings display for owned events
- Event cancellation works

**Status:** ⏳ Pending

---

### Flow 9: Notification System
**Steps:**
1. Login as customer
2. Place an order
3. Verify order confirmation notification
4. Check notification icon shows unread count
5. Click notification icon
6. View notification dropdown
7. Click notification to navigate to order
8. Verify notification marked as read
9. Test mark all as read functionality

**Expected Results:**
- Notifications created for order/booking events
- Notification icon shows unread count
- Notifications display in dropdown
- Clicking notification navigates to related item
- Mark as read functionality works
- Polling updates notifications

**Status:** ⏳ Pending

---

## Bug Tracking (Task 25.2)

### Bugs Found
| ID | Description | Severity | Status | Fix Details |
|----|-------------|----------|--------|-------------|
| - | - | - | - | - |

---

## Edge Cases and Boundary Conditions

### Test Cases:
1. **Empty cart checkout** - Should prevent checkout
2. **Expired seat reservation** - Should return seats to available
3. **Concurrent seat booking** - Should prevent double booking
4. **Invalid payment** - Should rollback order/booking
5. **Network timeout** - Should show error and retry option
6. **Token expiration** - Should refresh token automatically
7. **Unauthorized access** - Should redirect to login
8. **Role-based access** - Should prevent access to wrong dashboard
9. **Form validation** - Should show inline errors
10. **API errors** - Should display user-friendly messages

---

## Test Results Summary

**Total Flows:** 9
**Completed:** 0
**Passed:** 0
**Failed:** 0
**Bugs Found:** 0

**Test Status:** 🔴 Not Started
