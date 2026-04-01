'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ClientLayout from '@/components/ClientLayout';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HiMail, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi';

function LoginContent() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const redirectTo = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect') || '/'
        : '/';
      router.replace(redirectTo);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        setError('Invalid email or password.');
      } else {
        setError('Unable to sign in right now. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: 'calc(100vh - 128px)', padding: '24px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{
          maxWidth: '420px', width: '100%', padding: '40px', borderRadius: '20px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h1 style={{
          fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '8px',
          fontFamily: 'var(--font-display)',
        }}>Welcome Back</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px' }}>
          Sign in to your Platforma account
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <HiMail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{
                width: '100%', padding: '12px 12px 12px 36px', borderRadius: '10px',
                border: '1px solid var(--border)', background: 'var(--surface-variant)',
                color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none',
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <HiLockClosed style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required
              style={{
                width: '100%', padding: '12px 40px 12px 36px', borderRadius: '10px',
                border: '1px solid var(--border)', background: 'var(--surface-variant)',
                color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none',
              }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
              }}
            >
              {showPassword ? <HiEyeOff /> : <HiEye />}
            </button>
          </div>

          {error && <p style={{ color: 'var(--error)', fontSize: '13px', textAlign: 'center' }}>{error}</p>}

          <motion.button type="submit" disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
            style={{
              width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
              background: 'var(--gradient-primary)', color: 'white', fontSize: '15px',
              fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontFamily: 'var(--font-body)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign Up</Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return <ClientLayout><LoginContent /></ClientLayout>;
}
