'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useTheme } from '@/context/ThemeContext';
import { HiStar, HiCalendar, HiLocationMarker, HiSearch, HiArrowRight, HiTicket } from 'react-icons/hi';

function EventraHomeContent() {
  const { setTheme } = useTheme();

  useEffect(() => { setTheme('eventra'); }, [setTheme]);

  const categories = [
    { emoji: '🎬', name: 'Movies' },
    { emoji: '🎵', name: 'Concerts' },
    { emoji: '⚽', name: 'Sports' },
    { emoji: '🎭', name: 'Theater' },
    { emoji: '😂', name: 'Comedy' },
    { emoji: '🎪', name: 'Expo' },
    { emoji: '🍽️', name: 'Dining' },
  ];

  const featuredEvents = [
    { id: 1, name: 'Coldplay: Music of the Spheres', category: 'Concert', venue: 'DY Patil Stadium', date: 'Apr 15, 2026', price: '₹1,500', image: '🎵', rating: 4.8 },
    { id: 2, name: 'Avengers: Secret Wars', category: 'Movie', venue: 'PVR Cinemas', date: 'May 1, 2026', price: '₹350', image: '🎬', rating: 4.9 },
    { id: 3, name: 'IPL Final 2026', category: 'Sports', venue: 'Wankhede Stadium', date: 'May 28, 2026', price: '₹2,000', image: '⚽', rating: 4.7 },
    { id: 4, name: 'Stand-Up Night: Zakir Khan', category: 'Comedy', venue: 'NCPA', date: 'Apr 22, 2026', price: '₹800', image: '😂', rating: 4.6 },
    { id: 5, name: 'Hamilton Musical', category: 'Theater', venue: 'Royal Opera House', date: 'Jun 10, 2026', price: '₹1,200', image: '🎭', rating: 4.8 },
    { id: 6, name: 'Tech Summit 2026', category: 'Expo', venue: 'BKC Convention', date: 'Jul 5, 2026', price: '₹500', image: '🎪', rating: 4.3 },
  ];

  return (
    <div>
      {/* Hero */}
      <section style={{
        position: 'relative',
        padding: '48px 24px 32px',
        maxWidth: '1280px',
        margin: '0 auto',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            marginBottom: '8px',
          }}>
            Discover <span style={{ color: 'var(--primary)' }}>amazing</span> events
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '16px',
            marginBottom: '24px',
          }}>
            Movies, concerts, sports, and more — all in one place
          </p>

          {/* Search */}
          <motion.div
            whileHover={{ boxShadow: 'var(--shadow-lg)' }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'var(--surface)',
              border: '2px solid var(--border)',
              maxWidth: '560px',
            }}
          >
            <HiSearch style={{ color: 'var(--text-muted)', fontSize: '20px' }} />
            <input
              placeholder="Search events, artists, venues..."
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '15px',
                fontFamily: 'var(--font-body)',
                outline: 'none',
              }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'var(--gradient-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Search
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* Categories */}
      <section style={{
        padding: '0 24px 32px',
        maxWidth: '1280px',
        margin: '0 auto',
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          marginBottom: '16px',
        }}>
          Browse Categories
        </h2>
        <div style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}>
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.08, y: -4 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                minWidth: '90px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span style={{ fontSize: '32px' }}>{cat.emoji}</span>
              <span style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}>
                {cat.name}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Events */}
      <section style={{
        padding: '0 24px 48px',
        maxWidth: '1280px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
          }}>
            Trending Events
          </h2>
          <Link href="/eventra/events" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--primary)',
          }}>
            View All <HiArrowRight />
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}>
          {featuredEvents.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }}
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Link href={`/eventra/events/${event.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                {/* Image */}
                <div style={{
                  height: '180px',
                  background: 'linear-gradient(135deg, var(--surface-variant), var(--border))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '64px',
                  position: 'relative',
                }}>
                  {event.image}
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'var(--primary)',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '6px',
                  }}>
                    {event.category}
                  </span>
                </div>

                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-display)',
                      marginBottom: '8px',
                      flex: 1,
                    }}>
                      {event.name}
                    </h3>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      color: 'var(--warning)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}>
                      <HiStar /> {event.rating}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <HiCalendar style={{ color: 'var(--accent)' }} /> {event.date}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <HiLocationMarker style={{ color: 'var(--secondary)' }} /> {event.venue}
                    </span>
                  </div>

                  <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: '16px',
                    }}>
                      {event.price}
                    </span>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: 'var(--accent)',
                      fontWeight: 500,
                    }}>
                      <HiTicket /> Book Now
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function EventraPage() {
  return (
    <ClientLayout>
      <EventraHomeContent />
    </ClientLayout>
  );
}
