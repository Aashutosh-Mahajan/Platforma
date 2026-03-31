'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { HiStar, HiClock, HiTruck, HiFilter, HiSearch } from 'react-icons/hi';

function RestaurantsContent() {
  const restaurants = [
    { id: 1, name: 'Pizza Paradise', cuisine: 'Italian, Continental', rating: 4.5, time: '25-40', fee: 40, image: '🍕', reviews: 250 },
    { id: 2, name: 'Burger Barn', cuisine: 'American, Fast Food', rating: 4.3, time: '20-30', fee: 30, image: '🍔', reviews: 180 },
    { id: 3, name: 'Sushi Star', cuisine: 'Japanese', rating: 4.7, time: '30-45', fee: 50, image: '🍣', reviews: 320 },
    { id: 4, name: 'Curry House', cuisine: 'Indian, North Indian', rating: 4.6, time: '25-35', fee: 35, image: '🍛', reviews: 410 },
    { id: 5, name: 'Taco Fiesta', cuisine: 'Mexican', rating: 4.4, time: '20-30', fee: 0, image: '🌮', reviews: 150 },
    { id: 6, name: 'Noodle Bar', cuisine: 'Chinese, Asian', rating: 4.2, time: '25-35', fee: 25, image: '🍜', reviews: 200 },
    { id: 7, name: 'Green Bites', cuisine: 'Healthy, Salads', rating: 4.5, time: '15-25', fee: 20, image: '🥗', reviews: 130 },
    { id: 8, name: 'Sweet Cravings', cuisine: 'Desserts, Bakery', rating: 4.8, time: '20-30', fee: 30, image: '🧁', reviews: 290 },
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          All Restaurants
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
            borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)',
          }}>
            <HiSearch style={{ color: 'var(--text-muted)' }} />
            <input placeholder="Search..." style={{
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
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px',
      }}>
        {restaurants.map((r, i) => (
          <motion.div key={r.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }}
            style={{
              borderRadius: '16px', overflow: 'hidden', background: 'var(--surface)',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Link href={`/zesty/restaurants/${r.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                height: '150px', background: 'var(--surface-variant)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '56px',
              }}>{r.image}</div>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{r.name}</h3>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '2px', background: '#4CAF50',
                    color: 'white', padding: '2px 6px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                  }}><HiStar /> {r.rating}</div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 12px' }}>{r.cuisine}</p>
                <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><HiClock /> {r.time} min</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><HiTruck /> {r.fee ? `₹${r.fee}` : 'FREE'}</span>
                  <span>{r.reviews} reviews</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function RestaurantsPage() {
  return <ClientLayout><RestaurantsContent /></ClientLayout>;
}
