import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import {
  AuthProvider,
  CartProvider,
  BookingProvider,
  NotificationProvider,
} from './contexts';
import { ErrorBoundary, ProtectedRoute, Header, LoadingFallback } from './components/shared';

// Lazy load page components for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/auth/ProfilePage'));

// Zesty pages
const RestaurantListPage = lazy(() => import('./pages/zesty/RestaurantListPage'));
const RestaurantDetailPage = lazy(() => import('./pages/zesty/RestaurantDetailPage'));
const CartPage = lazy(() => import('./pages/zesty/CartPage'));
const CheckoutPage = lazy(() => import('./pages/zesty/CheckoutPage'));
const OrderHistoryPage = lazy(() => import('./pages/zesty/OrderHistoryPage'));
const OrderDetailPage = lazy(() => import('./pages/zesty/OrderDetailPage'));

// Eventra pages
const EventListPage = lazy(() => import('./pages/eventra/EventListPage'));
const EventraLandingPage = lazy(() => import('./pages/eventra/EventraLandingPage.jsx'));
const EventDetailsandBooking = lazy(() => import('./pages/eventra/EventDetailsandBooking.jsx'));
const EnhancedStadiumMapSelection = lazy(() => import('./pages/eventra/EnhancedStadiumMapSelection.jsx'));
const CheckoutandTransaction = lazy(() => import('./pages/eventra/CheckoutandTransaction.jsx'));
const BookingHistoryPage = lazy(() => import('./pages/eventra/BookingHistoryPage'));
const BookingDetailPage = lazy(() => import('./pages/eventra/BookingDetailPage'));

const EnhancedCinemaSeatMap = lazy(() => import('./pages/eventra/EnhancedCinemaSeatMap.jsx'));
const EnhancedConcertMapSelection = lazy(() => import('./pages/eventra/EnhancedConcertMapSelection.jsx'));
const StadiumSeatSelection = lazy(() => import('./pages/eventra/StadiumSeatSelection.jsx'));
const CinemaSeatSelection = lazy(() => import('./pages/eventra/CinemaSeatSelection.jsx'));
const ConcertSeatSelection = lazy(() => import('./pages/eventra/ConcertSeatSelection.jsx'));

// Dashboard pages
const RestaurantOwnerDashboard = lazy(() => import('./pages/dashboard/RestaurantOwnerDashboard'));
const EventOrganizerDashboard = lazy(() => import('./pages/dashboard/EventOrganizerDashboard'));

// Component to handle page title updates based on route
const PageTitleUpdater = () => {
  const location = useLocation();

  useEffect(() => {
    const routeTitles: Record<string, string> = {
      '/': 'Home',
      '/login': 'Login',
      '/register': 'Register',
      '/profile': 'Profile',
      '/zesty/restaurants': 'Restaurants',
      '/zesty/cart': 'Cart',
      '/zesty/checkout': 'Checkout',
      '/zesty/orders': 'Order History',
      '/eventra/events': 'Events',
      '/eventra/checkout': 'Booking Checkout',
      '/eventra/bookings': 'Booking History',
      '/eventra': 'Eventra | The Digital Curator',
      '/dashboard/restaurant-owner': 'Restaurant Dashboard',
      '/dashboard/event-organizer': 'Event Dashboard',
    };

    // Check for exact match first
    let title = routeTitles[location.pathname];

    // Check for dynamic routes
    if (!title) {
      if (location.pathname.startsWith('/zesty/restaurants/')) {
        title = 'Restaurant Details';
      } else if (location.pathname.startsWith('/zesty/orders/')) {
        title = 'Order Details';
      } else if (location.pathname.startsWith('/eventra/events/') && location.pathname.includes('/seats')) {
        title = 'Seat Selection';
      } else if (location.pathname.startsWith('/eventra/events/')) {
        title = 'Event Details';
      } else if (location.pathname.startsWith('/eventra/bookings/')) {
        title = 'Booking Details';
      } else {
        title = 'Page Not Found';
      }
    }

    document.title = title ? `${title} | Platforma` : 'Platforma';
  }, [location]);

  return null;
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <CartProvider>
            <BookingProvider>
              <NotificationProvider>
                <PageTitleUpdater />
                <Header />
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Protected Routes */}
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <ProfilePage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Zesty Routes */}
                    <Route path="/zesty/restaurants" element={<RestaurantListPage />} />
                    <Route path="/zesty/restaurants/:id" element={<RestaurantDetailPage />} />
                    <Route path="/zesty/cart" element={<CartPage />} />
                    <Route
                      path="/zesty/checkout"
                      element={
                        <ProtectedRoute>
                          <CheckoutPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/zesty/orders"
                      element={
                        <ProtectedRoute>
                          <OrderHistoryPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/zesty/orders/:id"
                      element={
                        <ProtectedRoute>
                          <OrderDetailPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Eventra Routes */}
                    <Route path="/eventra" element={<EventraLandingPage />} />
                    <Route path="/eventra/events" element={<EventListPage />} />
                    <Route path="/eventra/events/:id" element={<EventDetailsandBooking />} />
                    <Route path="/eventra/events/:id/seats" element={<EnhancedStadiumMapSelection />} />
                    
                    <Route path="/eventra/seats/stadium-enhanced" element={ <EnhancedStadiumMapSelection /> } />
                    <Route path="/eventra/seats/cinema-enhanced" element={ <EnhancedCinemaSeatMap /> } />
                    <Route path="/eventra/seats/concert-enhanced" element={ <EnhancedConcertMapSelection /> } />
                    <Route path="/eventra/seats/stadium" element={ <StadiumSeatSelection /> } />
                    <Route path="/eventra/seats/cinema" element={ <CinemaSeatSelection /> } />
                    <Route path="/eventra/seats/concert" element={ <ConcertSeatSelection /> } />
                    
                    <Route
                      path="/eventra/checkout"
                      element={
                        <CheckoutandTransaction />
                      }
                    />
                    <Route
                      path="/eventra/bookings"
                      element={
                        <ProtectedRoute>
                          <BookingHistoryPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/eventra/bookings/:id"
                      element={
                        <ProtectedRoute>
                          <BookingDetailPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Dashboard Routes */}
                    <Route
                      path="/dashboard/restaurant-owner"
                      element={
                        <ProtectedRoute requiredRole="restaurant_owner">
                          <RestaurantOwnerDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/event-organizer"
                      element={
                        <ProtectedRoute requiredRole="event_organizer">
                          <EventOrganizerDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* 404 Not Found - Catch all */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </NotificationProvider>
            </BookingProvider>
          </CartProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
