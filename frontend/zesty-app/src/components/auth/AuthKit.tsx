import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Eye, EyeOff } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export type AuthAudience = 'customer' | 'restaurant_owner' | 'event_organizer';

const PANELS: Record<AuthAudience, { image: string; position: string; title: React.ReactNode; body: string; points: string[] }> = {
  customer: {
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80',
    position: 'center 55%',
    title: (
      <>
        Dinner, <span className="italic text-[#c3d096]">then the show.</span>
      </>
    ),
    body: 'One Platforma account for Zesty food delivery and Eventra tickets.',
    points: ['Order from local kitchens and track it to your door', 'Pick your exact seats on a live seat map', 'Every order and ticket in one place'],
  },
  restaurant_owner: {
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80',
    position: 'center',
    title: (
      <>
        Your kitchen, <span className="italic text-[#ffb302]">always busy.</span>
      </>
    ),
    body: 'Run your restaurant on Zesty: menu, live orders, promotions and payouts.',
    points: ['Take orders and move them through the kitchen', 'Create promo codes in seconds', 'See what sells, when, and to whom'],
  },
  event_organizer: {
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&q=80',
    position: 'center 35%',
    title: (
      <>
        Sell out <span className="italic text-[#e8824a]">the room.</span>
      </>
    ),
    body: 'Publish events on Eventra with seat maps, ticket tiers and a live box office.',
    points: ['Lay out sections and rows, price by tier', 'Track bookings and sell-through as they happen', 'QR tickets scanned at the door'],
  },
};

export const AuthLayout: React.FC<{
  audience?: AuthAudience;
  /** Small link shown at the top right, e.g. "New here? Create an account". */
  aside?: React.ReactNode;
  children: React.ReactNode;
}> = ({ audience = 'customer', aside, children }) => {
  const panel = PANELS[audience];
  return (
    <div className="min-h-screen bg-[#f6f4ee] font-zesty-body text-[#141414] selection:bg-[#8a9a5b]/30 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Visual panel */}
      <aside className="hidden bg-[#0d0d0d] lg:block">
        <div className="sticky top-0 isolate flex h-screen flex-col justify-between overflow-hidden p-10 xl:p-14">
          {(Object.keys(PANELS) as AuthAudience[]).map((key) => (
            <img
              key={key}
              src={PANELS[key].image}
              alt=""
              className={`absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-700 ${key === audience ? 'opacity-100' : 'opacity-0'}`}
              style={{ objectPosition: PANELS[key].position }}
            />
          ))}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(13,13,13,0.55)_0%,rgba(13,13,13,0.35)_40%,rgba(13,13,13,0.92)_100%)]" aria-hidden="true" />
          <Link to="/" className="font-eventra-display text-[28px] leading-none text-[#f5f2ea]">
            Platforma<span className="text-[#8a9a5b]">.</span>
          </Link>
          <div className="max-w-md">
            <h2 className="font-eventra-display text-5xl font-medium leading-[1.05] text-white">{panel.title}</h2>
            <p className="mt-4 text-base leading-relaxed text-white/75">{panel.body}</p>
            <ul className="mt-8 space-y-3">
              {panel.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-white/85">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Form side */}
      <main className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-10">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-[#6b6a63] transition-colors hover:text-[#141414]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="lg:hidden font-eventra-display text-xl text-[#141414]">Platforma<span className="text-[#8a9a5b]">.</span></span>
            <span className="hidden lg:inline">Back to Platforma</span>
          </Link>
          {aside && <div className="text-sm text-[#6b6a63]">{aside}</div>}
        </div>
        <div className="flex flex-1 items-start justify-center px-5 pb-16 pt-4 sm:px-10 lg:items-center lg:pt-0">
          <div className="w-full max-w-[460px]">{children}</div>
        </div>
      </main>
    </div>
  );
};

export const AuthHeading: React.FC<{ title: React.ReactNode; subtitle?: React.ReactNode }> = ({ title, subtitle }) => (
  <div className="mb-8">
    <h1 className="font-eventra-display text-[40px] font-medium leading-[1.05] tracking-[-0.01em]">{title}</h1>
    {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-[#6b6a63]">{subtitle}</p>}
  </div>
);

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

export const inputClass = (hasError?: boolean) =>
  `w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-[#141414] placeholder:text-[#a8a69c] transition-colors focus:outline-none focus:ring-2 disabled:bg-[#f3f1ea] disabled:text-[#77756c] ${
    hasError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : 'border-[#dedad0] focus:border-[#6f7f42] focus:ring-[#8a9a5b]/25'
  }`;

export const AuthField: React.FC<{
  label: string;
  htmlFor: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ label, htmlFor, error, hint, optional, action, children, className = '' }) => (
  <div className={className}>
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
        {optional && <span className="ml-1 font-normal text-[#9c9a90]">(optional)</span>}
      </label>
      {action}
    </div>
    {children}
    {error ? (
      <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13px] text-rose-600">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {error}
      </p>
    ) : (
      hint && <p className="mt-1.5 text-[13px] text-[#9c9a90]">{hint}</p>
    )}
  </div>
);

export const PasswordInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }
> = ({ hasError, className = '', ...props }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${inputClass(hasError)} pr-12 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#77756c] transition-colors hover:bg-[#f3f1ea] hover:text-[#141414] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a9a5b]/40"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
      </button>
    </div>
  );
};

/** Live checklist + meter. Mirrors Django's validators closely enough to catch problems before submit. */
export const passwordChecks = (password: string, context: string[] = []) => {
  const lower = password.toLowerCase();
  const similar = context.filter((c) => c && c.length >= 3).some((c) => lower.includes(c.toLowerCase()));
  return [
    { key: 'length', label: 'At least 8 characters', ok: password.length >= 8 },
    { key: 'mix', label: 'Letters and numbers', ok: /[a-z]/i.test(password) && /\d/.test(password) },
    { key: 'extra', label: 'An uppercase letter or a symbol', ok: /[A-Z]/.test(password) || /[^a-z0-9]/i.test(password) },
    { key: 'personal', label: 'Not based on your name or email', ok: password.length > 0 && !similar },
  ];
};

export const PasswordStrength: React.FC<{ password: string; context?: string[] }> = ({ password, context }) => {
  const checks = passwordChecks(password, context);
  const score = checks.filter((c) => c.ok).length;
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#e11d48', '#e11d48', '#d97706', '#6f7f42', '#15803d'];
  if (!password) return null;
  return (
    <div className="mt-2.5" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ background: i < score ? colors[score] : '#e6e2d8' }} />
          ))}
        </div>
        <span className="text-xs font-semibold" style={{ color: colors[score] }}>
          {labels[score]}
        </span>
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.key} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-[#46542a]' : 'text-[#9c9a90]'}`}>
            {c.ok ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="mx-[3px] h-2 w-2 rounded-full border border-current" aria-hidden="true" />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* One-time code                                                       */
/* ------------------------------------------------------------------ */

export const OtpInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  hasError?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}> = ({ value, onChange, onComplete, hasError, disabled, autoFocus = true }) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const id = useId();
  // Blank slots are kept as spaces so clearing a middle digit doesn't shift the rest.
  const digits = Array.from({ length: 6 }, (_, i) => (value[i] && value[i] !== ' ' ? value[i] : ''));

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setAt = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    const joined = next.map((d) => d || ' ').join('').replace(/\s+$/, '');
    onChange(joined);
    if (/^\d{6}$/.test(joined)) onComplete?.(joined);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) onComplete?.(pasted);
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-3" role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="sr-only">6-digit verification code</span>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={digit}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${index + 1}`}
          aria-invalid={hasError}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(-1);
            if (!d) return;
            setAt(index, d);
            if (index < 5) refs.current[index + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault();
              if (digits[index]) setAt(index, '');
              else if (index > 0) {
                setAt(index - 1, '');
                refs.current[index - 1]?.focus();
              }
            } else if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
            else if (e.key === 'ArrowRight' && index < 5) refs.current[index + 1]?.focus();
          }}
          className={`h-14 w-full min-w-0 rounded-xl border bg-white text-center font-eventra-display text-2xl tabular-nums text-[#141414] transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 sm:h-16 sm:text-3xl ${
            hasError
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
              : digit
                ? 'border-[#141414] focus:border-[#6f7f42] focus:ring-[#8a9a5b]/25'
                : 'border-[#dedad0] focus:border-[#6f7f42] focus:ring-[#8a9a5b]/25'
          }`}
        />
      ))}
    </div>
  );
};

/** Countdown for "resend code" buttons. */
export const useCountdown = (initial: number) => {
  const [seconds, setSeconds] = useState(initial);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);
  return [seconds, setSeconds] as const;
};

/* ------------------------------------------------------------------ */
/* Buttons & notices                                                   */
/* ------------------------------------------------------------------ */

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; busyLabel?: string }> = ({
  busy,
  busyLabel,
  children,
  className = '',
  disabled,
  ...props
}) => (
  <button
    {...props}
    disabled={disabled || busy}
    aria-busy={busy}
    className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#141414] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2c2c2c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7f42] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f4ee] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  >
    {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />}
    {busy ? busyLabel ?? children : children}
  </button>
);

export const Notice: React.FC<{ tone: 'error' | 'success' | 'info'; children: React.ReactNode }> = ({ tone, children }) => {
  const styles = {
    error: 'bg-rose-50 text-rose-800 ring-rose-600/15',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15',
    info: 'bg-[#8a9a5b]/12 text-[#3d4a22] ring-[#6f7f42]/20',
  };
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`mb-6 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${styles[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};

/** Shown only when the backend runs in DEBUG and echoes the code back. */
export const DevCodeHint: React.FC<{ code?: string }> = ({ code }) =>
  code ? (
    <p className="mt-6 rounded-xl border border-dashed border-[#dedad0] px-4 py-3 text-xs text-[#77756c]">
      Development mode: email goes to the server console, so your code is{' '}
      <span className="font-mono text-sm font-semibold tracking-widest text-[#141414]">{code}</span>. This hint never appears in production.
    </p>
  ) : null;
