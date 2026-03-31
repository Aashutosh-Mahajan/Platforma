'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useTheme } from '@/context/ThemeContext';

function LandingContent() {
  const { theme, isZesty, setTheme } = useTheme();

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '80px 24px',
        textAlign: 'center',
        background: 'var(--gradient-hero)',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Animated background orbs */}
        <motion.div
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'var(--primary)',
            opacity: 0.08,
            top: '-100px',
            right: '-100px',
            filter: 'blur(80px)',
          }}
        />
        <motion.div
          animate={{
            x: [0, -30, 20, 0],
            y: [0, 30, -20, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'var(--secondary)',
            opacity: 0.08,
            bottom: '-80px',
            left: '-80px',
            filter: 'blur(60px)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ position: 'relative', zIndex: 1, maxWidth: '720px' }}
        >
          <motion.h1
            style={{
              fontSize: 'clamp(36px, 6vw, 64px)',
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
              lineHeight: 1.1,
              marginBottom: '16px',
              color: isZesty ? 'var(--text-primary)' : '#FFFFFF',
            }}
          >
            Welcome to{' '}
            <span style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Platforma
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: '18px',
              color: isZesty ? 'var(--text-secondary)' : '#cccccc',
              lineHeight: 1.6,
              marginBottom: '40px',
              fontFamily: 'var(--font-body)',
            }}
          >
            One platform, two worlds. Order delicious food with <strong>Zesty</strong> or
            discover amazing events with <strong>Eventra</strong>.
          </motion.p>

          {/* Platform Selector Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            maxWidth: '600px',
            margin: '0 auto',
          }}>
            {/* Zesty Card */}
            <motion.div
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTheme('zesty')}
              style={{ cursor: 'pointer' }}
            >
              <Link href="/zesty" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '32px 24px',
                  borderRadius: '16px',
                  background: isZesty
                    ? 'linear-gradient(135deg, #FF6B35, #F7931E)'
                    : 'var(--surface)',
                  border: `2px solid ${isZesty ? '#FF6B35' : 'var(--border)'}`,
                  textAlign: 'center',
                  boxShadow: isZesty ? '0 8px 32px rgba(255,107,53,0.3)' : 'var(--shadow-md)',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍕</div>
                  <h3 style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    fontFamily: "'Poppins', sans-serif",
                    color: isZesty ? 'white' : 'var(--text-primary)',
                    marginBottom: '8px',
                  }}>
                    Zesty
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: isZesty ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)',
                  }}>
                    Food delivery from your favorite restaurants
                  </p>
                </div>
              </Link>
            </motion.div>

            {/* Eventra Card */}
            <motion.div
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTheme('eventra')}
              style={{ cursor: 'pointer' }}
            >
              <Link href="/eventra" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '32px 24px',
                  borderRadius: '16px',
                  background: !isZesty
                    ? 'linear-gradient(135deg, #9B59B6, #E91E63)'
                    : 'var(--surface)',
                  border: `2px solid ${!isZesty ? '#9B59B6' : 'var(--border)'}`,
                  textAlign: 'center',
                  boxShadow: !isZesty ? '0 8px 32px rgba(155,89,182,0.3)' : 'var(--shadow-md)',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎭</div>
                  <h3 style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    fontFamily: "'Montserrat', sans-serif",
                    color: !isZesty ? 'white' : 'var(--text-primary)',
                    marginBottom: '8px',
                  }}>
                    Eventra
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: !isZesty ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)',
                  }}>
                    Movies, concerts, dining & more
                  </p>
                </div>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: '80px 24px',
        maxWidth: '1280px',
        margin: '0 auto',
      }}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            textAlign: 'center',
            fontSize: '32px',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            marginBottom: '48px',
          }}
        >
          Why Platforma?
        </motion.h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {[
            { icon: '⚡', title: 'Dual Platform', desc: 'Switch between food delivery and events seamlessly with a single tap.' },
            { icon: '🔒', title: 'Secure Payments', desc: 'Safe and simulated payment processing for all transactions.' },
            { icon: '🎨', title: 'Beautiful UI', desc: 'Two distinct, stunning themes that adapt to each experience.' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              whileHover={{ y: -4 }}
              style={{
                padding: '32px',
                borderRadius: '16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '16px' }}>{feature.icon}</div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
                marginBottom: '8px',
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}>
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <ClientLayout>
      <LandingContent />
    </ClientLayout>
  );
}
