'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';

export default function Footer() {
  const { isZesty } = useTheme();

  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      backgroundColor: 'var(--surface)',
      padding: '48px 24px 24px',
      marginTop: '64px',
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '32px',
      }}>
        {/* Brand */}
        <div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px',
          }}>
            Platforma
          </h3>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '13px',
            lineHeight: '1.6',
          }}>
            {isZesty
              ? 'Delicious food delivered to your doorstep.'
              : 'Discover and book amazing events near you.'}
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '12px', fontSize: '14px' }}>
            Quick Links
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link href={isZesty ? '/zesty' : '/eventra'} style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Home
            </Link>
            <Link href={isZesty ? '/zesty/restaurants' : '/eventra/events'} style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              {isZesty ? 'Restaurants' : 'Events'}
            </Link>
          </div>
        </div>

        {/* Support */}
        <div>
          <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '12px', fontSize: '14px' }}>
            Support
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link href="#" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Help Center</Link>
            <Link href="#" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Contact Us</Link>
            <Link href="#" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Terms of Service</Link>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1280px',
        margin: '32px auto 0',
        paddingTop: '16px',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '12px',
      }}>
        © 2026 Platforma. All rights reserved.
      </div>
    </footer>
  );
}
