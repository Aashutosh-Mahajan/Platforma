'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ClientLayout from '@/components/ClientLayout';
import { useAuth } from '@/context/AuthContext';
import { HiMail, HiUser, HiPhone, HiLockClosed } from 'react-icons/hi';

type RegisterForm = {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
  password_confirm: string;
};

const INITIAL_FORM: RegisterForm = {
  email: '',
  username: '',
  first_name: '',
  last_name: '',
  phone: '',
  password: '',
  password_confirm: '',
};

function RegisterContent() {
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState<RegisterForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key: keyof RegisterForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (form.password !== form.password_confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(form);
      router.replace('/');
    } catch {
      setError('Unable to create account. Try a different email or username.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 128px)',
      padding: '24px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '36px',
          borderRadius: '20px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h1 style={{ fontSize: '30px', fontFamily: 'var(--font-display)', textAlign: 'center', marginBottom: '8px' }}>
          Create your Platforma account
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          One account for food delivery and event bookings.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            First name
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <HiUser style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={form.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                required
                style={{ width: '100%', padding: '12px 12px 12px 34px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-variant)', color: 'var(--text-primary)' }}
              />
            </div>
          </label>

          <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Last name
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <HiUser style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={form.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                required
                style={{ width: '100%', padding: '12px 12px 12px 34px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-variant)', color: 'var(--text-primary)' }}
              />
            </div>
          </label>

          <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Username
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <HiUser style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={form.username}
                onChange={(e) => handleChange('username', e.target.value)}
                required
                style={{ width: '100%', padding: '12px 12px 12px 34px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-variant)', color: 'var(--text-primary)' }}
              />
            </div>
          </label>

          <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Email
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <HiMail style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                style={{ width: '100%', padding: '12px 12px 12px 34px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-variant)', color: 'var(--text-primary)' }}
              />
            </div>
          </label>

          <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Phone (optional)
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <HiPhone style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 34px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-variant)', color: 'var(--text-primary)' }}
              />
            </div>
          </label>

          <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Password
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <HiLockClosed style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={form.password}
                minLength={8}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                style={{ width: '100%', padding: '12px 12px 12px 34px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-variant)', color: 'var(--text-primary)' }}
              />
            </div>
          </label>

          <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Confirm password
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <HiLockClosed style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={form.password_confirm}
                minLength={8}
                onChange={(e) => handleChange('password_confirm', e.target.value)}
                required
                style={{ width: '100%', padding: '12px 12px 12px 34px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-variant)', color: 'var(--text-primary)' }}
              />
            </div>
          </label>

          {error ? <p style={{ color: 'var(--error)', textAlign: 'center' }}>{error}</p> : null}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            style={{
              marginTop: '8px',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              background: 'var(--gradient-primary)',
              color: '#fff',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </motion.button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return <ClientLayout><RegisterContent /></ClientLayout>;
}
