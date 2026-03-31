'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import Link from 'next/link';
import ClientLayout from '@/components/ClientLayout';
import { useTheme } from '@/context/ThemeContext';
import { HiArrowRight, HiLocationMarker, HiTicket } from 'react-icons/hi';

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 }
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.4 } }
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 60, filter: 'blur(12px)' },
  show: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 80, damping: 15 } 
  }
};

const ZestyHero = ({ mousePos }: { mousePos: { x: number, y: number } }) => (
  <motion.div 
    variants={staggerContainer} 
    initial="hidden" 
    animate="show" 
    exit="exit"
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 10 }}
  >
    <motion.div variants={fadeUp} style={{ marginBottom: '24px' }}>
      <span style={{ 
        padding: '8px 16px', 
        borderRadius: '30px', 
        background: 'rgba(255, 90, 31, 0.1)', 
        border: '1px solid rgba(255, 90, 31, 0.3)',
        color: 'var(--primary)',
        fontWeight: 600,
        letterSpacing: '1px',
        fontSize: '14px',
        boxShadow: '0 0 15px rgba(255,90,31,0.2)'
      }}>
        🔥 THE ULTIMATE FOOD DESTINATION
      </span>
    </motion.div>
    
    <motion.h1 variants={fadeUp} style={{
      fontSize: 'clamp(48px, 8vw, 100px)',
      fontWeight: 900,
      fontFamily: 'var(--font-display)',
      lineHeight: 1.05,
      marginBottom: '24px',
      letterSpacing: '-2px',
      color: '#fff',
      textShadow: '0 10px 40px rgba(0,0,0,0.5)'
    }}>
      Taste the <br />
      <span style={{
        background: 'var(--gradient-primary)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        filter: 'drop-shadow(0 0 20px rgba(255,90,31,0.4))'
      }}>
        Extraordinary.
      </span>
    </motion.h1>

    <motion.p variants={fadeUp} style={{
      fontSize: 'clamp(16px, 2vw, 22px)',
      color: 'var(--text-secondary)',
      maxWidth: '700px',
      marginBottom: '48px',
      lineHeight: 1.6,
      fontWeight: 400
    }}>
      Craving something delicious? Get piping hot meals from top-rated restaurants delivered straight to your door in minutes. 
    </motion.p>

    <motion.div variants={fadeUp} style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Link href="/zesty/restaurants">
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(255,90,31,0.6)' }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '16px 40px',
            borderRadius: '40px',
            background: 'var(--gradient-primary)',
            color: 'white',
            border: 'none',
            fontSize: '18px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          Explore Restaurants <HiArrowRight />
        </motion.button>
      </Link>
      <Link href="/zesty/orders">
        <motion.button
          whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '16px 40px',
            borderRadius: '40px',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            fontSize: '18px',
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
          }}
        >
          Track Order
        </motion.button>
      </Link>
    </motion.div>

    {/* Abstract 3D floating pizza/burger simulation elements */}
    <motion.div
      animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute', right: '-10%', top: '10%', fontSize: '100px', filter: 'drop-shadow(0 20px 30px rgba(255,90,31,0.4))',
        transform: `translate(${mousePos.x * -0.05}px, ${mousePos.y * -0.05}px)`,
        pointerEvents: 'none'
      }}
    >🍕</motion.div>
    <motion.div
      animate={{ y: [0, 30, 0], rotate: [0, -10, 10, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      style={{
        position: 'absolute', left: '-5%', bottom: '20%', fontSize: '120px', filter: 'drop-shadow(0 20px 30px rgba(255,150,0,0.3))',
        transform: `translate(${mousePos.x * 0.04}px, ${mousePos.y * 0.04}px)`,
        pointerEvents: 'none'
      }}
    >🍔</motion.div>
  </motion.div>
);

const EventraHero = ({ mousePos }: { mousePos: { x: number, y: number } }) => (
  <motion.div 
    variants={staggerContainer} 
    initial="hidden" 
    animate="show" 
    exit="exit"
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 10 }}
  >
    <motion.div variants={fadeUp} style={{ marginBottom: '24px' }}>
      <span style={{ 
        padding: '8px 16px', 
        borderRadius: '30px', 
        background: 'rgba(155, 89, 182, 0.1)', 
        border: '1px solid rgba(155, 89, 182, 0.3)',
        color: 'var(--primary)',
        fontWeight: 600,
        letterSpacing: '1px',
        fontSize: '14px',
        boxShadow: '0 0 15px rgba(155, 89, 182,0.2)'
      }}>
        ✨ LIVE THE EXPERIENCE
      </span>
    </motion.div>
    
    <motion.h1 variants={fadeUp} style={{
      fontSize: 'clamp(48px, 8vw, 100px)',
      fontWeight: 900,
      fontFamily: 'var(--font-display)',
      lineHeight: 1.05,
      marginBottom: '24px',
      letterSpacing: '-2px',
      color: '#fff',
      textShadow: '0 10px 40px rgba(0,0,0,0.5)'
    }}>
      Unforgettable <br />
      <span style={{
        background: 'var(--gradient-primary)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        filter: 'drop-shadow(0 0 20px rgba(155, 89, 182,0.5))'
      }}>
        Moments.
      </span>
    </motion.h1>

    <motion.p variants={fadeUp} style={{
      fontSize: 'clamp(16px, 2vw, 22px)',
      color: 'var(--text-secondary)',
      maxWidth: '700px',
      marginBottom: '48px',
      lineHeight: 1.6,
      fontWeight: 400
    }}>
      Discover concerts, theater, art exhibitions, and exclusive networking events near you. Your next great memory is just a ticket away.
    </motion.p>

    <motion.div variants={fadeUp} style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Link href="/eventra/events">
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(155, 89, 182,0.6)' }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '16px 40px',
            borderRadius: '40px',
            background: 'var(--gradient-primary)',
            color: 'white',
            border: 'none',
            fontSize: '18px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <HiTicket size={24} /> Get Tickets 
        </motion.button>
      </Link>
      <Link href="/eventra/bookings">
        <motion.button
          whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '16px 40px',
            borderRadius: '40px',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            fontSize: '18px',
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
          }}
        >
          My Bookings
        </motion.button>
      </Link>
    </motion.div>

    {/* Abstract 3D floating event elements */}
    <motion.div
      animate={{ y: [0, -30, 0], rotate: [0, -15, 15, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute', right: '-8%', top: '5%', fontSize: '110px', filter: 'drop-shadow(0 20px 30px rgba(155, 89, 182,0.4))',
        transform: `translate(${mousePos.x * -0.05}px, ${mousePos.y * -0.05}px)`,
        pointerEvents: 'none'
      }}
    >🎸</motion.div>
    <motion.div
      animate={{ y: [0, 25, 0], rotate: [0, 10, -10, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      style={{
        position: 'absolute', left: '-10%', bottom: '10%', fontSize: '100px', filter: 'drop-shadow(0 20px 30px rgba(233, 30, 99,0.3))',
        transform: `translate(${mousePos.x * 0.04}px, ${mousePos.y * 0.04}px)`,
        pointerEvents: 'none'
      }}
    >🎭</motion.div>
  </motion.div>
);

function LandingContent() {
  const { isZesty } = useTheme();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX - window.innerWidth / 2,
        y: e.clientY - window.innerHeight / 2
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div style={{ position: 'relative', overflowX: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Dynamic Background Noise & Gradients */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.4, 
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        zIndex: 0, pointerEvents: 'none'
      }} />

      <motion.div
        animate={{
          background: isZesty 
            ? 'radial-gradient(circle at 50% 0%, rgba(255,90,31,0.2) 0%, rgba(0,0,0,0) 70%)' 
            : 'radial-gradient(circle at 50% 0%, rgba(155,89,182,0.2) 0%, rgba(0,0,0,0) 70%)'
        }}
        transition={{ duration: 1 }}
        style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      />

      <section style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px 60px 24px',
        position: 'relative',
      }}>
        <AnimatePresence mode="wait">
          {isZesty ? (
             <ZestyHero key="zesty" mousePos={mousePos} />
          ) : (
             <EventraHero key="eventra" mousePos={mousePos} />
          )}
        </AnimatePresence>
      </section>

      {/* Futuristic Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
      >
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)' }}>Scroll</span>
        <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
          <motion.div 
            animate={{ y: ['-100%', '100%'] }} 
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            style={{ width: '100%', height: '50%', background: 'var(--primary)' }} 
          />
        </div>
      </motion.div>

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
