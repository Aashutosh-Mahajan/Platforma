'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Theme = 'zesty' | 'eventra';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isZesty: boolean;
  isEventra: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('zesty');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('platforma-theme') as Theme | null;
    if (saved && (saved === 'zesty' || saved === 'eventra')) {
      setThemeState(saved);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('platforma-theme', theme);
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'zesty' ? 'eventra' : 'zesty'));
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  // Prevent flash of unstyled content
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      setTheme,
      isZesty: theme === 'zesty',
      isEventra: theme === 'eventra',
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // SSR fallback — return safe defaults during prerender
    return {
      theme: 'zesty' as Theme,
      toggleTheme: () => {},
      setTheme: () => {},
      isZesty: true,
      isEventra: false,
    };
  }
  return context;
}
