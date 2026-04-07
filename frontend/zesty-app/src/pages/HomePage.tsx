import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts';

const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <main id="main-content" role="main">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16" aria-labelledby="hero-heading">
          <div className="text-center">
            <h1 id="hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              Welcome to <span className="text-blue-600">Platforma</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto px-4">
              Your one-stop destination for food delivery and event bookings
            </p>

            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 sm:mb-16 px-4">
                <Link
                  to="/register"
                  className="px-6 sm:px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Create a new account"
                >
                  Get Started
                </Link>
                <Link
                  to="/login"
                  className="px-6 sm:px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Sign in to your account"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>

          {/* Services Grid */}
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mt-12 sm:mt-16">
            {/* Zesty Card */}
            <article>
              <a
                href="/zesty/"
                className="bg-white rounded-xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition transform hover:-translate-y-1 block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Open Zesty landing page"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0" aria-hidden="true">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 ml-3 sm:ml-4">Zesty</h2>
                </div>
                <p className="text-sm sm:text-base text-gray-600 mb-4">
                  Order delicious food from your favorite restaurants. Fast delivery, great taste!
                </p>
                <div className="flex items-center text-blue-600 font-semibold text-sm sm:text-base">
                  Browse Restaurants
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            </article>

            {/* Eventra Card */}
            <article>
              <Link
                to="/eventra"
                className="bg-white rounded-xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition transform hover:-translate-y-1 block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Explore Eventra events for ticket booking"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0" aria-hidden="true">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 ml-3 sm:ml-4">Eventra</h2>
                </div>
                <p className="text-sm sm:text-base text-gray-600 mb-4">
                  Book tickets for movies, concerts, sports, and more. Never miss an event!
                </p>
                <div className="flex items-center text-blue-600 font-semibold text-sm sm:text-base">
                  Explore Events
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </article>
          </div>

          {/* User Dashboard Links */}
          {isAuthenticated && (
            <section className="mt-12 sm:mt-16 bg-white rounded-xl shadow-lg p-6 sm:p-8" aria-labelledby="quick-access-heading">
              <h2 id="quick-access-heading" className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                Quick Access
              </h2>
              <nav className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Quick access navigation">
                <Link
                  to="/profile"
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Manage your profile"
                >
                  <div className="font-semibold text-gray-900 text-sm sm:text-base">Profile</div>
                  <div className="text-xs sm:text-sm text-gray-600">Manage your account</div>
                </Link>

                <Link
                  to="/zesty/orders"
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Track your food orders"
                >
                  <div className="font-semibold text-gray-900 text-sm sm:text-base">My Orders</div>
                  <div className="text-xs sm:text-sm text-gray-600">Track your food orders</div>
                </Link>

                <Link
                  to="/eventra/bookings"
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="View your event tickets"
                >
                  <div className="font-semibold text-gray-900 text-sm sm:text-base">My Bookings</div>
                  <div className="text-xs sm:text-sm text-gray-600">View your event tickets</div>
                </Link>

                {user?.role === 'restaurant_owner' && (
                  <Link
                    to="/dashboard/restaurant-owner"
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Manage your restaurants"
                  >
                    <div className="font-semibold text-gray-900 text-sm sm:text-base">Restaurant Dashboard</div>
                    <div className="text-xs sm:text-sm text-gray-600">Manage your restaurants</div>
                  </Link>
                )}

                {user?.role === 'event_organizer' && (
                  <Link
                    to="/dashboard/event-organizer"
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Manage your events"
                  >
                    <div className="font-semibold text-gray-900 text-sm sm:text-base">Event Dashboard</div>
                    <div className="text-xs sm:text-sm text-gray-600">Manage your events</div>
                  </Link>
                )}
              </nav>
            </section>
          )}

          {/* Features Section */}
          <section className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8" aria-labelledby="features-heading">
            <h2 id="features-heading" className="sr-only">Platform Features</h2>
            
            <article className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Fast & Reliable</h3>
              <p className="text-sm sm:text-base text-gray-600">Quick delivery and instant booking confirmations</p>
            </article>

            <article className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Secure Payments</h3>
              <p className="text-sm sm:text-base text-gray-600">Safe and secure payment processing</p>
            </article>

            <article className="text-center sm:col-span-2 lg:col-span-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Best Selection</h3>
              <p className="text-sm sm:text-base text-gray-600">Wide variety of restaurants and events</p>
            </article>
          </section>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
