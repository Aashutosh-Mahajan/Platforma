'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { HiStar, HiCalendar, HiLocationMarker, HiFilter, HiSearch, HiTicket } from 'react-icons/hi';

function EventsContent() {
  const events = [
    { id: 1, name: 'Coldplay: Music of the Spheres', cat: 'Concert', venue: 'DY Patil Stadium', date: 'Apr 15, 2026', price: '₹1,500', emoji: '🎵', rating: 4.8, seats: '15,000' },
    { id: 2, name: 'Avengers: Secret Wars', cat: 'Movie', venue: 'PVR Cinemas, Juhu', date: 'May 1, 2026', price: '₹350', emoji: '🎬', rating: 4.9, seats: '450' },
    { id: 3, name: 'IPL Final 2026', cat: 'Sports', venue: 'Wankhede Stadium', date: 'May 28, 2026', price: '₹2,000', emoji: '⚽', rating: 4.7, seats: '33,000' },
    { id: 4, name: 'Zakir Khan Live', cat: 'Comedy', venue: 'NCPA', date: 'Apr 22, 2026', price: '₹800', emoji: '😂', rating: 4.6, seats: '1,200' },
    { id: 5, name: 'Hamilton Musical', cat: 'Theater', venue: 'Royal Opera House', date: 'Jun 10, 2026', price: '₹1,200', emoji: '🎭', rating: 4.8, seats: '800' },
    { id: 6, name: 'Tech Summit 2026', cat: 'Expo', venue: 'BKC Convention', date: 'Jul 5, 2026', price: '₹500', emoji: '🎪', rating: 4.3, seats: '5,000' },
    { id: 7, name: 'AR Rahman Concert', cat: 'Concert', venue: 'NSCI Dome', date: 'Aug 12, 2026', price: '₹1,800', emoji: '🎵', rating: 4.9, seats: '8,000' },
    { id: 8, name: 'Food & Wine Festival', cat: 'Dining', venue: 'Mahalaxmi Racecourse', date: 'Sep 1, 2026', price: '₹600', emoji: '🍽️', rating: 4.4, seats: '3,000' },
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>All Events</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
            borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)',
          }}>
            <HiSearch style={{ color: 'var(--text-muted)' }} />
            <input placeholder="Search events..." style={{
              border: 'none', background: 'transparent', color: 'var(--text-primary)',
              fontSize: '14px', outline: 'none', width: '150px', fontFamily: 'var(--font-body)',
            }} />
          </div>
          <motion.button whileHover={{ scale: 1.05 }} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)',
            cursor: 'pointer', color: 'var(--text-primary)', fontSize: '14px',
          }}>
            <HiFilter /> Filter
          </motion.button>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px',
      }}>
        {events.map((e, i) => (
          <motion.div key={e.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }}
            style={{
              borderRadius: '16px', overflow: 'hidden', background: 'var(--surface)',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Link href={`/eventra/events/${e.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                height: '170px',
                background: 'linear-gradient(135deg, var(--surface-variant), var(--border))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '56px', position: 'relative',
              }}>
                {e.emoji}
                <span style={{
                  position: 'absolute', top: '12px', left: '12px', background: 'var(--primary)',
                  color: 'white', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px',
                }}>{e.cat}</span>
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-display)', flex: 1 }}>{e.name}</h3>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--warning)', fontSize: '13px', fontWeight: 600 }}>
                    <HiStar /> {e.rating}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '8px 0 12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><HiCalendar style={{ color: 'var(--accent)' }} /> {e.date}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><HiLocationMarker style={{ color: 'var(--secondary)' }} /> {e.venue}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '16px' }}>From {e.price}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>
                    <HiTicket /> {e.seats} seats
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function EventsPage() {
  return <ClientLayout><EventsContent /></ClientLayout>;
}
