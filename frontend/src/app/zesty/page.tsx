'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useTheme } from '@/context/ThemeContext';
import { HiStar, HiClock, HiTruck, HiSearch, HiArrowRight } from 'react-icons/hi';

function ZestyHomeContent() {
  const { setTheme } = useTheme();

  useEffect(() => { setTheme('zesty'); }, [setTheme]);

  const categories = [
    { emoji: '🍕', name: 'Pizza' },
    { emoji: '🍔', name: 'Burgers' },
    { emoji: '🍣', name: 'Sushi' },
    { emoji: '🥗', name: 'Salads' },
    { emoji: '🌮', name: 'Mexican' },
    { emoji: '🍜', name: 'Chinese' },
    { emoji: '🍛', name: 'Indian' },
    { emoji: '🧁', name: 'Desserts' },
  ];

  const featuredRestaurants = [
    { id: 1, name: 'Pizza Paradise', cuisine: 'Italian, Continental', rating: 4.5, time: '25-40 min', fee: '₹40', image: '🍕' },
    { id: 2, name: 'Burger Barn', cuisine: 'American, Fast Food', rating: 4.3, time: '20-30 min', fee: '₹30', image: '🍔' },
    { id: 3, name: 'Sushi Star', cuisine: 'Japanese', rating: 4.7, time: '30-45 min', fee: '₹50', image: '🍣' },
    { id: 4, name: 'Curry House', cuisine: 'Indian, North Indian', rating: 4.6, time: '25-35 min', fee: '₹35', image: '🍛' },
    { id: 5, name: 'Taco Fiesta', cuisine: 'Mexican', rating: 4.4, time: '20-30 min', fee: 'FREE', image: '🌮' },
    { id: 6, name: 'Noodle Bar', cuisine: 'Chinese, Asian', rating: 4.2, time: '25-35 min', fee: '₹25', image: '🍜' },
  ];

  return (
    <div>
      {/* Hero */}
      <section style={{
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
            What are you <span style={{ color: 'var(--primary)' }}>craving</span> today?
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '16px',
            marginBottom: '24px',
          }}>
            Order from the best restaurants near you
          </p>

          {/* Search Bar */}
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
              placeholder="Search restaurants, cuisines, dishes..."
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
          Explore by Cuisine
        </h2>
        <div style={{
          display: 'flex',
          gap: '16px',
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

      {/* Featured Restaurants */}
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
            Featured Restaurants
          </h2>
          <Link href="/zesty/restaurants" style={{
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
          {featuredRestaurants.map((restaurant, i) => (
            <motion.div
              key={restaurant.id}
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
              <Link href={`/zesty/restaurants/${restaurant.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                {/* Image placeholder */}
                <div style={{
                  height: '160px',
                  background: 'var(--surface-variant)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '64px',
                }}>
                  {restaurant.image}
                </div>

                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-display)',
                      marginBottom: '4px',
                    }}>
                      {restaurant.name}
                    </h3>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      background: '#4CAF50',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      <HiStar /> {restaurant.rating}
                    </div>
                  </div>

                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    marginBottom: '12px',
                  }}>
                    {restaurant.cuisine}
                  </p>

                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <HiClock /> {restaurant.time}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <HiTruck /> {restaurant.fee}
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

export default function ZestyPage() {
  return (
    <ClientLayout>
      <ZestyHomeContent />
    </ClientLayout>
  );
}
