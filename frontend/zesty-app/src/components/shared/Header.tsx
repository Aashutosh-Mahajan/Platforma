import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { NotificationDropdown } from './NotificationDropdown';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (user?.role === 'restaurant_owner') {
      return '/dashboard/restaurant-owner';
    } else if (user?.role === 'event_organizer') {
      return '/dashboard/event-organizer';
    }
    return null;
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Close mobile menu on navigation
  const handleMobileNavClick = () => {
    setShowMobileMenu(false);
  };

  return (
    <header className="bg-white shadow" role="banner">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4" role="navigation" aria-label="Main navigation">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            to="/" 
            className="text-xl sm:text-2xl font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="Platforma Home"
          >
            Platforma
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-expanded={showMobileMenu}
            aria-label="Toggle navigation menu"
          >
            <span className="sr-only">{showMobileMenu ? 'Close menu' : 'Open menu'}</span>
            {showMobileMenu ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-4 lg:gap-6 items-center">
            {isAuthenticated ? (
              <>
                <Link 
                  to="/" 
                  className="text-sm lg:text-base text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                >
                  Home
                </Link>
                <Link 
                  to="/profile" 
                  className="text-sm lg:text-base text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                >
                  Profile
                </Link>

                {/* Dashboard Link for Owners/Organizers */}
                {getDashboardLink() && (
                  <Link 
                    to={getDashboardLink()!} 
                    className="text-sm lg:text-base text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                  >
                    Dashboard
                  </Link>
                )}

                {/* Notifications */}
                <NotificationDropdown />

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-expanded={showUserMenu}
                    aria-haspopup="true"
                    aria-label="User menu"
                  >
                    <span className="text-sm font-medium">{user?.first_name}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showUserMenu && (
                    <div 
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10"
                      role="menu"
                      aria-orientation="vertical"
                    >
                      <div className="p-4 border-b">
                        <p className="text-sm font-medium">{user?.email}</p>
                        <p className="text-xs text-gray-600 capitalize">{user?.role.replace('_', ' ')}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-b-lg"
                        role="menuitem"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-sm lg:text-base text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="px-4 py-2 bg-blue-600 text-white text-sm lg:text-base rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <div className="md:hidden mt-4 pb-4 border-t pt-4">
            {isAuthenticated ? (
              <div className="space-y-2">
                <Link 
                  to="/" 
                  onClick={handleMobileNavClick}
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Home
                </Link>
                <Link 
                  to="/profile" 
                  onClick={handleMobileNavClick}
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Profile
                </Link>

                {getDashboardLink() && (
                  <Link 
                    to={getDashboardLink()!} 
                    onClick={handleMobileNavClick}
                    className="block px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Dashboard
                  </Link>
                )}

                <div className="px-4 py-2 border-t mt-2 pt-2">
                  <p className="text-sm font-medium text-gray-900">{user?.first_name}</p>
                  <p className="text-xs text-gray-600">{user?.email}</p>
                  <p className="text-xs text-gray-600 capitalize">{user?.role.replace('_', ' ')}</p>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link 
                  to="/login" 
                  onClick={handleMobileNavClick}
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  onClick={handleMobileNavClick}
                  className="block px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
};
