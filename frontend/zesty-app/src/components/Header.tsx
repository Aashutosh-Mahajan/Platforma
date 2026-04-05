import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_CONTENT } from '../data/mockData';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header 
      className="absolute top-0 left-0 w-full z-50 bg-transparent"
      role="banner"
    >
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      
      <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-4 lg:py-6 max-w-7xl mx-auto">
        <div className="text-2xl sm:text-3xl font-black text-white italic font-lexend tracking-tight">
          <Link to="/" aria-label="Platforma Home">
            {APP_CONTENT.header.title}
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden text-white p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          <span className="sr-only">
            {mobileMenuOpen ? 'Close menu' : 'Open menu'}
          </span>
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8" role="navigation" aria-label="Main navigation">
          {APP_CONTENT.header.navLinks.map((link, idx) => (
            <a 
              key={idx} 
              href="#" 
              className="text-white/90 font-medium hover:text-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded px-2 py-1"
            >
              {link}
            </a>
          ))}
        </nav>
      </div>

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <nav 
          className="md:hidden bg-white/95 backdrop-blur-sm shadow-lg"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="px-4 py-4 space-y-2">
            {APP_CONTENT.header.navLinks.map((link, idx) => (
              <a 
                key={idx} 
                href="#" 
                className="block px-4 py-3 text-gray-900 font-medium hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};
