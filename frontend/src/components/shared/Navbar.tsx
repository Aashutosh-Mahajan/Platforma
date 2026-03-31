'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import ThemeSwitcher from './ThemeSwitcher';
import { HiMenu, HiX, HiSearch, HiUser, HiBell } from 'react-icons/hi';

export default function Navbar() {
  const { theme, isZesty } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const zestyLinks = [
    { href: '/zesty', label: 'Home' },
    { href: '/zesty/restaurants', label: 'Restaurants' },
    { href: '/zesty/orders', label: 'Orders' },
  ];

  const eventraLinks = [
    { href: '/eventra', label: 'Home' },
    { href: '/eventra/events', label: 'Events' },
    { href: '/eventra/bookings', label: 'Bookings' },
  ];

  const links = isZesty ? zestyLinks : eventraLinks;

  return (
    <motion.nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backdropFilter: 'var(--navbar-blur)',
        WebkitBackdropFilter: 'var(--navbar-blur)',
        backgroundColor: 'var(--navbar-bg)',
        borderBottom: '1px solid var(--border)',
      }}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
      }}>
        {/* Logo */}
        <Link href={isZesty ? '/zesty' : '/eventra'} style={{ textDecoration: 'none' }}>
          <motion.div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            whileHover={{ scale: 1.02 }}
          >
            <span style={{
              fontSize: '24px',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Platforma
            </span>
            <motion.span
              key={theme}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'var(--primary)',
                color: 'white',
                fontFamily: 'var(--font-body)',
              }}
            >
              {isZesty ? 'ZESTY' : 'EVENTRA'}
            </motion.span>
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
        }}
          className="desktop-nav"
        >
          {/* Nav Links */}
          <div style={{ display: 'flex', gap: '24px' }} className="nav-links-desktop">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  fontSize: '14px',
                  fontFamily: 'var(--font-body)',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Search */}
          <motion.button
            onClick={() => setSearchOpen(!searchOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '20px',
              display: 'flex',
            }}
          >
            <HiSearch />
          </motion.button>

          {/* Theme Switcher */}
          <ThemeSwitcher />

          {/* Auth */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '20px',
                  display: 'flex',
                }}
              >
                <HiBell />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={logout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--surface-variant)',
                  border: '1px solid var(--border)',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <HiUser />
                {user?.first_name || 'Account'}
              </motion.button>
            </div>
          ) : (
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: 'var(--gradient-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Sign In
              </motion.button>
            </Link>
          )}

          {/* Mobile Menu Button */}
          <motion.button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            whileTap={{ scale: 0.9 }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: '24px',
              display: 'none',
            }}
          >
            {mobileMenuOpen ? <HiX /> : <HiMenu />}
          </motion.button>
        </div>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              borderTop: '1px solid var(--border)',
              padding: '12px 24px',
              maxWidth: '1280px',
              margin: '0 auto',
            }}
          >
            <input
              type="text"
              placeholder={isZesty ? 'Search restaurants, cuisines...' : 'Search events, concerts...'}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'var(--font-body)',
                outline: 'none',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              borderTop: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              padding: '16px 24px',
            }}
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '12px 0',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  fontSize: '16px',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--border-light)',
                }}
              >
                {link.label}
              </Link>
            ))}
            <div style={{ padding: '16px 0' }}>
              <ThemeSwitcher />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>
    </motion.nav>
  );
}
