import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { validateRequired } from '../../utils/validation';
import AddressManager from '../../components/AddressManager';
import { BadgeCheck, CalendarDays, Mail, Pencil, Phone, ShieldCheck } from 'lucide-react';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { ErrorBanner, Field, KpiLedger, Panel, SkeletonRows } from '../../components/dashboard/primitives';
import { navForRole } from '../../components/dashboard/roleNav';
import { formatDate, humanize, themes } from '../../components/dashboard/theme';

const W = 'platforma' as const;
const t = themes[W];

interface FormErrors {
  first_name?: string;
  last_name?: string;
  phone?: string;
  general?: string;
}

const ProfilePage: React.FC = () => {
  const { user, updateProfile, loading: authLoading, error: authError, clearError } = useAuth();

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!validateRequired(formData.first_name)) {
      newErrors.first_name = 'First name is required';
    }

    if (!validateRequired(formData.last_name)) {
      newErrors.last_name = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await updateProfile(formData);
      setSuccessMessage('Profile updated successfully!');
      setEditing(false);
    } catch (err: any) {
      // Handle API validation errors
      if (err.response?.data) {
        const apiErrors: FormErrors = {};
        Object.keys(err.response.data).forEach((key) => {
          const errorMessages = err.response.data[key];
          if (Array.isArray(errorMessages)) {
            apiErrors[key as keyof FormErrors] = errorMessages[0];
          }
        });
        setErrors(apiErrors);
      } else {
        setErrors({ general: authError || 'Failed to update profile. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
      });
    }
    setErrors({});
    setEditing(false);
    clearError();
  };

  const verified = (ok?: boolean) => (ok ? 'Verified' : 'Not verified');

  return (
    <DashboardShell
      world={W}
      context="Your account"
      nav={navForRole(user?.role)}
      activeKey="profile"
      image="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1800&q=80"
      imagePosition="center 55%"
      title={
        user ? (
          <>
            {user.first_name || user.username} <span className={t.titleAccent}>{user.last_name}</span>
          </>
        ) : (
          'Your profile'
        )
      }
      subtitle={user ? `${humanize(user.role)} · ${user.email}` : undefined}
      actions={
        user && !editing ? (
          <button type="button" onClick={() => setEditing(true)} className={t.btnOnImagePrimary}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit profile
          </button>
        ) : undefined
      }
      ledger={
        <KpiLedger
          world={W}
          loading={authLoading && !user}
          items={[
            { label: 'Member since', icon: CalendarDays, value: <span className="text-2xl sm:text-[26px]">{formatDate(user?.created_at)}</span> },
            { label: 'Role', icon: ShieldCheck, value: <span className="text-2xl sm:text-[26px]">{humanize(user?.role ?? '')}</span> },
            { label: 'Email', icon: Mail, value: <span className="text-2xl sm:text-[26px]">{verified(user?.is_email_verified)}</span> },
            { label: 'Phone', icon: Phone, value: <span className="text-2xl sm:text-[26px]">{user?.phone ? verified(user?.is_phone_verified) : 'Not added'}</span> },
          ]}
        />
      }
    >
      {!user ? (
        authLoading ? (
          <Panel world={W}>
            <SkeletonRows world={W} rows={4} />
          </Panel>
        ) : (
          <ErrorBanner world={W} message="Unable to load your profile. Try signing in again." />
        )
      ) : (
        <div className="space-y-6">
          {successMessage && (
            <div role="status" className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm ring-1 ring-inset ${t.tones.success}`}>
              <BadgeCheck className="h-4 w-4" aria-hidden="true" /> {successMessage}
            </div>
          )}
          {errors.general && <ErrorBanner world={W} message={errors.general} />}

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel
              world={W}
              className="xl:col-span-2"
              title="Personal details"
              description={editing ? 'Update your name and phone number.' : 'How restaurants and organizers see you.'}
              action={
                !editing ? (
                  <button type="button" onClick={() => setEditing(true)} className={t.btnSecondary}>
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                  </button>
                ) : undefined
              }
            >
              <form onSubmit={handleSubmit} noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field world={W} label="First name" htmlFor="first_name" error={errors.first_name}>
                    <input id="first_name" name="first_name" type="text" value={formData.first_name} onChange={handleChange} disabled={!editing} aria-invalid={!!errors.first_name} className={`${t.input} ${errors.first_name ? '!border-rose-400' : ''}`} />
                  </Field>
                  <Field world={W} label="Last name" htmlFor="last_name" error={errors.last_name}>
                    <input id="last_name" name="last_name" type="text" value={formData.last_name} onChange={handleChange} disabled={!editing} aria-invalid={!!errors.last_name} className={`${t.input} ${errors.last_name ? '!border-rose-400' : ''}`} />
                  </Field>
                  <Field world={W} label="Phone number" htmlFor="phone" error={errors.phone} hint="Include the country code, e.g. +91" className="sm:col-span-2">
                    <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} disabled={!editing} placeholder="+919876543210" aria-invalid={!!errors.phone} className={`${t.input} ${errors.phone ? '!border-rose-400' : ''}`} />
                  </Field>
                </div>
                {editing && (
                  <div className={`mt-6 flex justify-end gap-2 border-t pt-5 ${t.hairline}`}>
                    <button type="button" onClick={handleCancel} className={t.btnGhost}>Cancel</button>
                    <button type="submit" disabled={loading} aria-busy={loading} className={t.btnPrimary}>
                      {loading ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                )}
              </form>
            </Panel>

            <Panel world={W} title="Sign-in" description="These can't be changed here.">
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className={t.muted}>Email</dt>
                  <dd className="mt-0.5 break-all font-medium">{user.email}</dd>
                </div>
                <div>
                  <dt className={t.muted}>Username</dt>
                  <dd className="mt-0.5 font-medium">{user.username}</dd>
                </div>
                <div>
                  <dt className={t.muted}>Account type</dt>
                  <dd className="mt-0.5 font-medium">{humanize(user.role)}</dd>
                </div>
              </dl>
            </Panel>
          </div>

          <AddressManager />
        </div>
      )}
    </DashboardShell>
  );
};

export default ProfilePage;
