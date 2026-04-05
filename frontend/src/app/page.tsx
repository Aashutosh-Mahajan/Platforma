'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';
import { useTheme } from '@/context/ThemeContext';

function LandingRedirect() {
  const { isZesty } = useTheme();
  const router = useRouter();

  useEffect(() => {
    // Redirect to the appropriate home page based on the current theme
    router.replace(isZesty ? '/zesty' : '/eventra');
  }, [isZesty, router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'var(--font-display)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '48px',
          fontWeight: 900,
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
        }}>
          Platforma
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
          Redirecting...
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <ClientLayout>
      <LandingRedirect />
    </ClientLayout>
  );
}
