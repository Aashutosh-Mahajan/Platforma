import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
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
const UserDashboardPage = lazy(() => import('./pages/dashboard/UserDashboardPage'));
const ZestyDashboardPage = lazy(() => import('./pages/dashboard/ZestyDashboardPage'));
const EventraDashboardPage = lazy(() => import('./pages/dashboard/EventraDashboardPage'));
const RestaurantsPage = lazy(() => import('./pages/restaurants.jsx'));

// Zesty pages
const RestaurantDetailPage = lazy(() => import('./pages/zesty/RestaurantDetailPage'));
const CartPage = lazy(() => import('./pages/zesty/CartPage'));
const CheckoutPage = lazy(() => import('./pages/zesty/CheckoutPage'));
const OrderHistoryPage = lazy(() => import('./pages/zesty/OrderHistoryPage'));
const OrderDetailPage = lazy(() => import('./pages/zesty/OrderDetailPage'));

// Eventra pages
const EventListPage = lazy(() => import('./pages/eventra/EventListPage'));
const EventraPremiumLandingPage = lazy(() => import('./pages/eventra/EventraPremiumLandingPage'));
const EventraLegacyDiscoverPage = lazy(() => import('./pages/eventra/EventraLandingPage.jsx'));
const EventDetailPage = lazy(() => import('./pages/eventra/EventDetailPage'));
const SeatSelectionPage = lazy(() => import('./pages/eventra/SeatSelectionPage'));
const BookingCheckoutPage = lazy(() => import('./pages/eventra/BookingCheckoutPage'));
const BookingHistoryPage = lazy(() => import('./pages/eventra/BookingHistoryPage'));
const BookingDetailPage = lazy(() => import('./pages/eventra/BookingDetailPage'));

// Dashboard pages
const RestaurantOwnerDashboard = lazy(() => import('./pages/dashboard/RestaurantOwnerDashboard'));
const EventOrganizerDashboard = lazy(() => import('./pages/dashboard/EventOrganizerDashboard'));

// Component to handle page title updates based on route
const PageTitleUpdater = () => {
  const location = useLocation();

  useEffect(() => {
    // Keep SPA navigation behavior consistent with a hard refresh.
    window.scrollTo(0, 0);

    const routeTitles: Record<string, string> = {
      '/': 'Explore The Best Food & Events',
      '/login': 'Login',
      '/register': 'Register',
      '/profile': 'Profile',
      '/dashboard': 'Dashboard',
      '/dashboard/zesty': 'Zesty Dashboard',
      '/dashboard/eventra': 'Eventra Dashboard',
      '/zesty': 'Restaurants',
      '/zesty/': 'Restaurants',
      '/zesty/restaurants': 'Restaurants',
      '/restaurants': 'Restaurants',
      '/zesty/cart': 'Cart',
      '/zesty/checkout': 'Checkout',
      '/zesty/orders': 'Order History',
      '/evetra': 'Eventra | The Digital Curator',
      '/evetra/': 'Eventra | The Digital Curator',
      '/eventra/events': 'Events',
      '/eventra/checkout': 'Booking Checkout',
      '/eventra/bookings': 'Booking History',
      '/eventra': 'Eventra | The Digital Curator',
      '/eventra/discover': 'Eventra Discover',
      '/dashboard/restaurant-owner': 'Restaurant Dashboard',
      '/dashboard/event-organizer': 'Event Dashboard',
    };

    // Check for exact match first
    let title = routeTitles[location.pathname];

    // Check for dynamic routes
    if (!title) {
      if (location.pathname.startsWith('/zesty/restaurants/')) {
        title = 'Restaurant Details';
      } else if (location.pathname.startsWith('/restaurants/')) {
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

const LegacyRestaurantsRedirect = () => <Navigate to="/zesty" replace />;

const LegacyRestaurantDetailRedirect = () => {
  const { id } = useParams();

  if (!id) {
    return <Navigate to="/zesty" replace />;
  }

  return <Navigate to={`/zesty/restaurants/${id}`} replace />;
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
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <UserDashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/zesty"
                      element={
                        <ProtectedRoute>
                          <ZestyDashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/eventra"
                      element={
                        <ProtectedRoute>
                          <EventraDashboardPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Zesty Routes */}
                    <Route path="/zesty" element={<RestaurantsPage />} />
                    <Route path="/zesty/" element={<RestaurantsPage />} />
                    <Route path="/restaurants" element={<LegacyRestaurantsRedirect />} />
                    <Route path="/restaurants/:id" element={<LegacyRestaurantDetailRedirect />} />
                    <Route path="/restaurants/*" element={<LegacyRestaurantsRedirect />} />
                    <Route path="/zesty/restaurants" element={<Navigate to="/zesty" replace />} />
                    <Route path="/zesty/restaurants/" element={<Navigate to="/zesty" replace />} />
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
                    <Route path="/evetra" element={<EventraPremiumLandingPage />} />
                    <Route path="/evetra/" element={<EventraPremiumLandingPage />} />
                    <Route path="/eventra" element={<EventraPremiumLandingPage />} />
                    <Route path="/eventra/discover" element={<EventraLegacyDiscoverPage />} />
                    <Route path="/eventra/events" element={<EventListPage />} />
                    <Route path="/eventra/events/:id" element={<EventDetailPage />} />
                    <Route
                      path="/eventra/events/:id/seats"
                      element={
                        <ProtectedRoute>
                          <SeatSelectionPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="/eventra/seats/stadium-enhanced" element={ <Navigate to="/eventra/events" replace /> } />
                    <Route path="/eventra/seats/cinema-enhanced" element={ <Navigate to="/eventra/events" replace /> } />
                    <Route path="/eventra/seats/theatre-enhanced" element={ <Navigate to="/eventra/events" replace /> } />
                    <Route path="/eventra/seats/theater-enhanced" element={ <Navigate to="/eventra/events" replace /> } />
                    <Route path="/eventra/seats/concert-enhanced" element={ <Navigate to="/eventra/events" replace /> } />
                    <Route path="/eventra/seats/ground-enhanced" element={ <Navigate to="/eventra/events" replace /> } />
                    <Route path="/eventra/seats/stadium" element={ <Navigate to="/eventra/events" replace /> } />
                    <Route path="/eventra/seats/cinema" element={ <Navigate to="/eventra/events" replace /> } />
                    <Route path="/eventra/seats/concert" element={ <Navigate to="/eventra/events" replace /> } />
                    
                    <Route
                      path="/eventra/checkout"
                      element={
                        <ProtectedRoute>
                          <BookingCheckoutPage />
                        </ProtectedRoute>
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
