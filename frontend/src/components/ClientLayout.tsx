'use client';

import React from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Navbar />
        <main style={{ paddingTop: '64px', minHeight: '100vh' }}>
          {children}
        </main>
        <Footer />
      </AuthProvider>
    </ThemeProvider>
  );
}
