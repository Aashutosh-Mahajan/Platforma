'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import ThemeSwitcher from './ThemeSwitcher';
import { HiMenu, HiX, HiSearch, HiUser, HiBell, HiLogout } from 'react-icons/hi';

export default function Navbar() {
  const { isZesty } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

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
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
      }}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '80px',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <motion.div
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span style={{
              fontSize: '28px',
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.5px',
            }}>
              Platforma
            </span>
            <motion.div
              layout
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--primary)',
                boxShadow: 'var(--glow)'
              }}
            />
          </motion.div>
        </Link>
        
        {/* Dynamic Center Theme Switcher */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} className="desktop-nav">
           <ThemeSwitcher />
        </div>

        {/* Desktop Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
        }}
          className="desktop-nav"
        >
          {/* Nav Links */}
          <div style={{ display: 'flex', gap: '28px' }} className="nav-links-desktop">
            <AnimatePresence mode="popLayout">
              {links.map((link) => (
                <motion.div
                  key={link.href + link.label}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Link
                    href={link.href}
                    style={{
                      color: 'var(--text-secondary)',
                      fontWeight: 500,
                      fontSize: '15px',
                      fontFamily: 'var(--font-body)',
                      textDecoration: 'none',
                      transition: 'color 0.3s',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border)' }}></div>

          {/* Search */}
          <motion.button
            onClick={() => setSearchOpen(!searchOpen)}
            whileHover={{ scale: 1.1, color: 'var(--text-primary)' }}
            whileTap={{ scale: 0.9 }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '22px',
              display: 'flex',
              transition: 'color 0.3s',
            }}
          >
            <HiSearch />
          </motion.button>

          {/* Auth */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <motion.button
                whileHover={{ scale: 1.1, color: 'var(--text-primary)' }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '22px',
                  display: 'flex',
                  transition: 'color 0.3s',
                }}
              >
                <HiBell />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, borderColor: 'var(--primary)' }}
                onClick={() => void handleLogout()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '30px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  transition: 'border-color 0.3s',
                }}
              >
                <HiUser />
                {user?.first_name || 'Account'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => void handleLogout()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '30px',
                  padding: '8px 14px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <HiLogout />
                Logout
              </motion.button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link href="/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '30px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Sign Up
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: 'var(--glow)' }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: 'var(--gradient-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '30px',
                    padding: '10px 24px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'box-shadow 0.3s',
                  }}
                >
                  Sign In
                </motion.button>
              </Link>
            </div>
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
              fontSize: '28px',
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
              padding: '16px 32px',
              background: 'var(--navbar-bg)',
              backdropFilter: 'var(--navbar-blur)',
            }}
          >
            <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
              <input
                type="text"
                placeholder={isZesty ? 'Search restaurants, cuisines...' : 'Search events, concerts...'}
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
                }}
              />
            </div>
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
              padding: '24px 32px',
            }}
          >
            <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'center' }}>
               <ThemeSwitcher />
            </div>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '16px 0',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '18px',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--border-light)',
                }}
              >
                {link.label}
              </Link>
            ))}
            {!isAuthenticated ? (
              <>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'block',
                    padding: '16px 0',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '18px',
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--border-light)',
                  }}
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'block',
                    padding: '16px 0',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '18px',
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--border-light)',
                  }}
                >
                  Sign In
                </Link>
              </>
            ) : null}
            {isAuthenticated ? (
              <button
                onClick={() => {
                  void handleLogout();
                  setMobileMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  padding: '12px',
                  cursor: 'pointer',
                }}
              >
                Logout
              </button>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media (max-width: 1024px) {
          .nav-links-desktop { display: none !important; }
        }
        @media (max-width: 768px) {
          .desktop-nav > div:not(.mobile-menu-btn) { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </motion.nav>
  );
}
