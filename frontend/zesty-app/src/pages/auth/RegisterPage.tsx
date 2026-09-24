import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ShoppingBag, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { parseApiError, type RegisterData } from '../../api/auth';
import { validateEmail } from '../../utils/validation';
import { getPostAuthRedirectPath } from '../../utils';
import {
  AuthField,
  AuthHeading,
  AuthLayout,
  Notice,
  PasswordInput,
  PasswordStrength,
  PrimaryButton,
  inputClass,
  passwordChecks,
  type AuthAudience,
} from '../../components/auth/AuthKit';

const ROLES: { id: AuthAudience; title: string; blurb: string; icon: LucideIcon; tint: string; perks: string[] }[] = [
  {
    id: 'customer',
    title: 'Order & book',
    blurb: 'Get food delivered and book tickets for events.',
    icon: ShoppingBag,
    tint: 'text-[#56652f] bg-[#8a9a5b]/15',
    perks: ['Zesty food delivery', 'Eventra tickets and seats'],
  },
  {
    id: 'restaurant_owner',
    title: 'Restaurant partner',
    blurb: 'List your restaurant and take orders on Zesty.',
    icon: Store,
    tint: 'text-[#b7122a] bg-[#e23744]/10',
    perks: ['Menu and live orders', 'Promotions and payouts'],
  },
  {
    id: 'event_organizer',
    title: 'Event organizer',
    blurb: 'Publish events and sell seats on Eventra.',
    icon: CalendarDays,
    tint: 'text-[#9a4a10] bg-[#c4621a]/12',
    perks: ['Seat maps and ticket tiers', 'Box office analytics'],
  },
];

type Step = 'role' | 'details';
type FieldErrors = Partial<Record<keyof RegisterData | 'terms' | 'general', string>>;

const isRole = (value: string | null): value is AuthAudience =>
  value === 'customer' || value === 'restaurant_owner' || value === 'event_organizer';

const suggestUsername = (first: string, last: string, email: string) => {
  const base =
    `${first}${last}`.toLowerCase().replace(/[^a-z0-9]/g, '') ||
    email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '');
  return base.slice(0, 24);
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { register, isAuthenticated, user } = useAuth();

  const presetRole = params.get('role');
  const [role, setRole] = useState<AuthAudience>(isRole(presetRole) ? presetRole : 'customer');
  const [step, setStep] = useState<Step>(isRole(presetRole) ? 'details' : 'role');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    username: '',
    business: '',
    password: '',
    password_confirm: '',
  });
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(getPostAuthRedirectPath(user?.role), { replace: true });
  }, [isAuthenticated, user?.role, navigate]);

  // Keep the username suggestion in step with the name until the user edits it.
  useEffect(() => {
    if (!usernameTouched) {
      setForm((f) => ({ ...f, username: suggestUsername(f.first_name, f.last_name, f.email) }));
    }
  }, [form.first_name, form.last_name, form.email, usernameTouched]);

  const selected = ROLES.find((r) => r.id === role)!;
  const SelectedIcon = selected.icon;
  const businessKey: keyof FieldErrors = role === 'restaurant_owner' ? 'restaurant_name' : 'company_name';
  const businessLabel = role === 'restaurant_owner' ? 'Restaurant name' : 'Company or brand name';

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    const errorKey = (key === 'business' ? businessKey : key) as keyof FieldErrors;
    if (errors[errorKey] || errors.general) setErrors((prev) => ({ ...prev, [errorKey]: undefined, general: undefined }));
  };

  const chooseRole = (next: AuthAudience) => {
    setRole(next);
    setParams(next === 'customer' ? {} : { role: next }, { replace: true });
  };

  const context = useMemo(
    () => [form.first_name, form.last_name, form.email.split('@')[0], form.username],
    [form.first_name, form.last_name, form.email, form.username]
  );

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!form.first_name.trim()) next.first_name = 'Enter your first name.';
    if (!form.last_name.trim()) next.last_name = 'Enter your last name.';
    if (role !== 'customer' && !form.business.trim()) {
      next[businessKey] = role === 'restaurant_owner' ? 'Enter your restaurant name.' : 'Enter your company or brand name.';
    }
    if (!form.email.trim()) next.email = 'Enter your email address.';
    else if (!validateEmail(form.email.trim())) next.email = "That doesn't look like an email address.";
    if (!form.username.trim()) next.username = 'Choose a username.';
    else if (!/^[\w.@+-]{3,150}$/.test(form.username.trim())) next.username = 'Use 3+ letters, numbers or . _ - only.';
    if (form.phone.trim() && !/^\+?[0-9\s-]{8,16}$/.test(form.phone.trim())) next.phone = 'Use digits, with an optional country code like +91.';
    const checks = passwordChecks(form.password, context);
    if (!form.password) next.password = 'Create a password.';
    else if (!checks[0].ok || !checks[1].ok) next.password = 'Use at least 8 characters with letters and numbers.';
    if (form.password && form.password_confirm !== form.password) next.password_confirm = "Passwords don't match.";
    if (!terms) next.terms = 'Please accept the terms to continue.';
    return next;
  };

  const focusFirstError = (errs: FieldErrors) => {
    const first = Object.keys(errs)[0];
    const id = first === 'restaurant_name' || first === 'company_name' ? 'business' : first === 'terms' ? 'terms' : first;
    document.getElementById(id)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      focusFirstError(next);
      return;
    }
    setSubmitting(true);
    try {
      const result = await register({
        role,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        username: form.username.trim(),
        password: form.password,
        password_confirm: form.password_confirm,
        restaurant_name: role === 'restaurant_owner' ? form.business.trim() : undefined,
        company_name: role === 'event_organizer' ? form.business.trim() : undefined,
      });
      navigate('/verify-email', {
        state: { email: result.email, resendIn: result.resend_in, devCode: result.dev_code, reason: 'signup', role },
      });
    } catch (err) {
      const { fields, message } = parseApiError(err);
      const apiErrors = { ...(fields as FieldErrors) };
      if (Object.keys(apiErrors).length === 0) apiErrors.general = message || 'Sign-up failed. Please try again.';
      setErrors(apiErrors);
      focusFirstError(apiErrors);
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = step === 'role' ? 0 : 1;

  return (
    <AuthLayout
      audience={role}
      aside={
        <>
          Have an account?{' '}
          <Link to="/login" className="font-semibold text-[#141414] underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <ol className="mb-8 flex flex-wrap items-center gap-2 text-xs font-semibold" aria-label="Sign-up steps">
        {['Account type', 'Your details', 'Verify email'].map((label, i) => {
          const done = i < stepIndex;
          const current = i === stepIndex;
          return (
            <li key={label} className="flex items-center gap-2" aria-current={current ? 'step' : undefined}>
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${
                  done ? 'bg-[#6f7f42] text-white' : current ? 'bg-[#141414] text-white' : 'bg-[#e6e2d8] text-[#77756c]'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span className={current ? 'text-[#141414]' : 'text-[#9c9a90]'}>{label}</span>
              {i < 2 && <span className="mx-1 h-px w-5 bg-[#dedad0]" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      {step === 'role' ? (
        <>
          <AuthHeading
            title="Create your account"
            subtitle="How will you use Platforma? Account types can't be switched later, so pick the one that fits."
          />
          <div className="space-y-3" role="radiogroup" aria-label="Account type">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const active = r.id === role;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => chooseRole(r.id)}
                  className={`flex w-full items-start gap-4 rounded-2xl border bg-white p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7f42] ${
                    active ? 'border-[#141414] ring-1 ring-[#141414]' : 'border-[#e6e2d8] hover:border-[#9c9a90]'
                  }`}
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${r.tint}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{r.title}</span>
                    <span className="mt-0.5 block text-sm text-[#6b6a63]">{r.blurb}</span>
                    <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#77756c]">
                      {r.perks.map((p) => (
                        <span key={p} className="inline-flex items-center gap-1">
                          <Check className="h-3 w-3 text-[#6f7f42]" aria-hidden="true" /> {p}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span
                    className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                      active ? 'border-[#141414] bg-[#141414]' : 'border-[#cfcabd]'
                    }`}
                    aria-hidden="true"
                  >
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                </button>
              );
            })}
          </div>
          <PrimaryButton type="button" className="mt-8" onClick={() => setStep('details')}>
            Continue as {selected.title.toLowerCase()} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </PrimaryButton>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setStep('role')}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e6e2d8] bg-white py-1.5 pl-1.5 pr-3 text-sm transition-colors hover:border-[#9c9a90]"
          >
            <span className={`grid h-6 w-6 place-items-center rounded-full ${selected.tint}`}>
              <SelectedIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="font-medium">{selected.title}</span>
            <span className="text-[#9c9a90]">Change</span>
          </button>
          <AuthHeading
            title={role === 'customer' ? 'Tell us about you' : role === 'restaurant_owner' ? 'Set up your partner account' : 'Set up your organizer account'}
            subtitle="We'll email you a 6-digit code to confirm it's really you."
          />

          {errors.general && <Notice tone="error">{errors.general}</Notice>}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <AuthField label="First name" htmlFor="first_name" error={errors.first_name}>
                <input id="first_name" autoComplete="given-name" value={form.first_name} onChange={update('first_name')} aria-invalid={!!errors.first_name} className={inputClass(!!errors.first_name)} />
              </AuthField>
              <AuthField label="Last name" htmlFor="last_name" error={errors.last_name}>
                <input id="last_name" autoComplete="family-name" value={form.last_name} onChange={update('last_name')} aria-invalid={!!errors.last_name} className={inputClass(!!errors.last_name)} />
              </AuthField>
            </div>

            {role !== 'customer' && (
              <AuthField
                label={businessLabel}
                htmlFor="business"
                error={errors[businessKey]}
                hint={role === 'restaurant_owner' ? 'As customers will see it. You can add more restaurants later.' : 'Shown on your event pages.'}
              >
                <input id="business" autoComplete="organization" value={form.business} onChange={update('business')} aria-invalid={!!errors[businessKey]} className={inputClass(!!errors[businessKey])} />
              </AuthField>
            )}

            <AuthField label="Email" htmlFor="email" error={errors.email} hint="Your verification code goes here.">
              <input id="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={update('email')} aria-invalid={!!errors.email} className={inputClass(!!errors.email)} />
            </AuthField>

            <div className="grid gap-5 sm:grid-cols-2">
              <AuthField label="Username" htmlFor="username" error={errors.username}>
                <input
                  id="username"
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => {
                    setUsernameTouched(true);
                    update('username')(e);
                  }}
                  aria-invalid={!!errors.username}
                  className={inputClass(!!errors.username)}
                />
              </AuthField>
              <AuthField label="Phone" htmlFor="phone" optional error={errors.phone}>
                <input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" value={form.phone} onChange={update('phone')} aria-invalid={!!errors.phone} className={inputClass(!!errors.phone)} />
              </AuthField>
            </div>

            <AuthField label="Password" htmlFor="password" error={errors.password}>
              <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={update('password')} aria-invalid={!!errors.password} hasError={!!errors.password} />
              <PasswordStrength password={form.password} context={context} />
            </AuthField>

            <AuthField label="Confirm password" htmlFor="password_confirm" error={errors.password_confirm}>
              <PasswordInput
                id="password_confirm"
                autoComplete="new-password"
                value={form.password_confirm}
                onChange={update('password_confirm')}
                aria-invalid={!!errors.password_confirm}
                hasError={!!errors.password_confirm}
              />
            </AuthField>

            <div>
              <label className="flex items-start gap-3 text-sm text-[#4a4943]">
                <input
                  id="terms"
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => {
                    setTerms(e.target.checked);
                    if (errors.terms) setErrors((p) => ({ ...p, terms: undefined }));
                  }}
                  className="mt-0.5 h-4 w-4 rounded accent-[#141414]"
                />
                <span>
                  I agree to Platforma's terms of service and privacy policy
                  {role !== 'customer' && ', including the partner commission and payout terms'}.
                </span>
              </label>
              {errors.terms && (
                <p role="alert" className="mt-1.5 pl-7 text-[13px] text-rose-600">
                  {errors.terms}
                </p>
              )}
            </div>

            <PrimaryButton type="submit" busy={submitting} busyLabel="Creating your account…">
              Create account <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryButton>
          </form>

          <button type="button" onClick={() => setStep('role')} className="mt-6 inline-flex items-center gap-1.5 text-sm text-[#6b6a63] hover:text-[#141414]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Choose a different account type
          </button>
        </>
      )}
    </AuthLayout>
  );
};

export default RegisterPage;
