# Quick Start Guide - Frontend Dashboard Implementation

## What's New

Your frontend now has:
- ✅ Restaurant Owner Dashboard
- ✅ Event Organizer Dashboard  
- ✅ Header with navigation and notifications
- ✅ Role-based routing
- ✅ Notification system

## Running the Application

### 1. Install Dependencies
```bash
cd frontend/zesty-app
npm install
```

### 2. Configure Environment
Create `.env` file:
```
VITE_API_BASE_URL=http://localhost:8000/api
```

### 3. Start Development Server
```bash
npm run dev
```

Application runs on `http://localhost:5173`

## Testing the Dashboards

### Test Restaurant Owner Dashboard

1. **Register as Restaurant Owner**
   - Go to `/register`
   - Select role: `restaurant_owner`
   - Submit form

2. **Login**
   - Go to `/login`
   - Enter credentials
   - Click login

3. **Access Dashboard**
   - Click "Dashboard" in header
   - Should see `/dashboard/restaurant-owner`
   - View restaurants, menu items, and orders

### Test Event Organizer Dashboard

1. **Register as Event Organizer**
   - Go to `/register`
   - Select role: `event_organizer`
   - Submit form

2. **Login**
   - Go to `/login`
   - Enter credentials
   - Click login

3. **Access Dashboard**
   - Click "Dashboard" in header
   - Should see `/dashboard/event-organizer`
   - View events, ticket types, and bookings

## Dashboard Features

### Restaurant Owner Dashboard

**Restaurants Tab**
- View all owned restaurants
- Click to select restaurant
- See restaurant details (name, cuisine, rating, status)

**Menu Items Tab**
- View menu items for selected restaurant
- See item details (name, price, category, availability)
- Edit/Delete buttons (to be implemented)

**Orders Tab**
- View incoming orders
- See order details (items, total, status)
- Update order status dropdown (confirmed → preparing → ready)

### Event Organizer Dashboard

**Events Tab**
- View all created events
- Click to select event
- See event details (name, category, date, available seats, status)

**Ticket Types Tab**
- View ticket types for selected event
- See ticket details (name, price, available quantity)
- Edit/Delete buttons (to be implemented)

**Bookings Tab**
- View all event bookings
- See booking details (reference, event, tickets, amount, status)

## Header Features

**Navigation**
- Logo (links to home)
- Home link
- Profile link
- Dashboard link (only for owners/organizers)

**Notifications**
- Bell icon with unread count badge
- Click to open notification dropdown
- View recent notifications
- Mark as read
- Click notification to navigate to related order/booking

**User Menu**
- Shows user name
- Click to open menu
- Shows email and role
- Logout button

## File Structure

```
src/
├── pages/
│   └── dashboard/
│       ├── RestaurantOwnerDashboard.tsx
│       └── EventOrganizerDashboard.tsx
├── components/shared/
│   ├── Header.tsx
│   └── NotificationDropdown.tsx
├── App.tsx (updated with routes)
└── contexts/
    └── NotificationContext.tsx (updated)
```

## Next Steps

### 1. Implement Authentication Pages
- [ ] LoginPage with email/password form
- [ ] RegisterPage with role selection
- [ ] ProfilePage with user info and edit

### 2. Implement Zesty Pages
- [ ] RestaurantListPage with search/filter
- [ ] RestaurantDetailPage with menu
- [ ] CartPage with items
- [ ] CheckoutPage with address/payment
- [ ] OrderHistoryPage
- [ ] OrderDetailPage with tracking

### 3. Implement Eventra Pages
- [ ] EventListPage with categories
- [ ] EventDetailPage with ticket types
- [ ] SeatSelectionPage with visual map
- [ ] BookingCheckoutPage
- [ ] BookingHistoryPage
- [ ] BookingDetailPage

### 4. Add Features
- [ ] Form validation
- [ ] Error handling
- [ ] Loading states
- [ ] Image uploads
- [ ] Search/filtering
- [ ] Pagination
- [ ] Responsive design

## API Integration

The dashboards already call these API endpoints:

**Restaurant Owner**
- `GET /api/zesty/restaurants/` - List restaurants
- `GET /api/zesty/restaurants/:id/menu/` - List menu items
- `GET /api/zesty/orders/` - List orders

**Event Organizer**
- `GET /api/eventra/events/` - List events
- `GET /api/eventra/bookings/` - List bookings

**Notifications**
- `GET /api/notifications/` - List notifications
- `PATCH /api/notifications/:id/mark_read/` - Mark as read
- `PATCH /api/notifications/mark_all_read/` - Mark all as read

## Troubleshooting

### Dashboard Not Loading
- Check if user is authenticated (check AuthContext)
- Check if user has correct role (restaurant_owner or event_organizer)
- Check browser console for errors
- Verify API is running and accessible

### Notifications Not Showing
- Check if NotificationContext is properly initialized
- Verify API endpoint is working
- Check browser console for errors
- Notifications poll every 60 seconds

### Header Not Showing
- Verify Header component is imported in App.tsx
- Check if Header is rendered before Routes
- Verify CSS is loading (Tailwind)

## Documentation

- **FRONTEND_STRUCTURE.md** - Complete architecture overview
- **UPDATES_SUMMARY.md** - Detailed list of changes
- **QUICK_START.md** - This file

## Support

For issues or questions:
1. Check the documentation files
2. Review the component code
3. Check browser console for errors
4. Verify backend API is running
5. Check network tab for API calls
