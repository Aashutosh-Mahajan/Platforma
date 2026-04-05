'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const isZesty = theme === 'zesty';

  const handleToggle = () => {
    if (isZesty) {
      setTheme('eventra');
      router.push('/eventra');
    } else {
      setTheme('zesty');
      router.push('/zesty');
    }
  };

  return (
    <motion.button
      onClick={handleToggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${isZesty ? 'Eventra' : 'Zesty'}`}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '4px',
        borderRadius: '50px',
        cursor: 'pointer',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(16px)',
        width: '180px',
        height: '44px',
        justifyContent: 'space-between',
        outline: 'none',
      }}
    >
      {/* Animated Active Pill Background */}
      <motion.div
        initial={false}
        animate={{
          x: isZesty ? 0 : 86,
          background: isZesty 
            ? 'linear-gradient(135deg, #FF5A1F, #F7931E)' 
            : 'linear-gradient(135deg, #9B59B6, #E91E63)'
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        style={{
          position: 'absolute',
          top: '4px',
          bottom: '4px',
          left: '4px',
          width: '84px',
          borderRadius: '40px',
          boxShadow: 'var(--glow)',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '50%', color: isZesty ? '#fff' : 'var(--text-muted)' }}>
        <motion.span 
           animate={{ opacity: isZesty ? 1 : 0.7 }}
           style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🍕 ZESTY
        </motion.span>
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '50%', color: !isZesty ? '#fff' : 'var(--text-muted)' }}>
         <motion.span 
           animate={{ opacity: !isZesty ? 1 : 0.7 }}
           style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🎭 EVENTRA
        </motion.span>
      </div>
    </motion.button>
  );
}
