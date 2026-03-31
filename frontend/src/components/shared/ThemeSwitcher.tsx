'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const isZesty = theme === 'zesty';

  return (
    <motion.button
      onClick={toggleTheme}
      className="theme-switcher"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${isZesty ? 'Eventra' : 'Zesty'}`}
      title={`Switch to ${isZesty ? 'Eventra' : 'Zesty'}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 6px 6px 8px',
        borderRadius: '50px',
        border: 'none',
        cursor: 'pointer',
        background: 'transparent',
      }}
    >
      {/* Track */}
      <motion.div
        style={{
          width: '64px',
          height: '32px',
          borderRadius: '16px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          padding: '3px',
        }}
        animate={{
          background: isZesty
            ? 'linear-gradient(135deg, #FF6B35, #F7931E)'
            : 'linear-gradient(135deg, #9B59B6, #E91E63)',
        }}
        transition={{ duration: 0.5 }}
      >
        {/* Thumb */}
        <motion.div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '13px',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
          animate={{ x: isZesty ? 0 : 32 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          {isZesty ? '🍕' : '🎭'}
        </motion.div>
      </motion.div>

      {/* Label */}
      <motion.span
        style={{
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'var(--font-display)',
          color: 'var(--text-primary)',
          minWidth: '52px',
        }}
        key={theme}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {isZesty ? 'Zesty' : 'Eventra'}
      </motion.span>
    </motion.button>
  );
}
