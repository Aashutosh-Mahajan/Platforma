import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, MailCheck, RotateCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI, parseApiError } from '../../api/auth';
import { validateEmail } from '../../utils/validation';
import { getPostAuthRedirectPath, resolvePostAuthPath } from '../../utils';
import {
  AuthField,
  AuthHeading,
  AuthLayout,
  DevCodeHint,
  Notice,
  OtpInput,
  PrimaryButton,
  inputClass,
  useCountdown,
  type AuthAudience,
} from '../../components/auth/AuthKit';

interface VerifyState {
  email?: string;
  resendIn?: number;
  devCode?: string;
  from?: string;
  reason?: 'signup' | 'login';
  freshCode?: boolean;
  role?: AuthAudience;
}

const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const visible = name.length <= 2 ? name[0] : `${name.slice(0, 2)}`;
  return `${visible}${'•'.repeat(Math.max(1, Math.min(name.length - visible.length, 6)))}@${domain}`;
};

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as VerifyState | null) ?? {};
  const { verifyEmailCode, isAuthenticated, user } = useAuth();

  const [email, setEmail] = useState(state.email ?? '');
  const [emailInput, setEmailInput] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState(state.devCode);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    state.reason === 'login'
      ? state.freshCode
        ? 'Your email isn’t confirmed yet. We just sent you a new code.'
        : 'Your email isn’t confirmed yet. Use the code we sent a moment ago, or ask for a new one when the timer runs out.'
      : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [resendIn, setResendIn] = useCountdown(state.resendIn ?? (state.email ? 60 : 0));
  const [verified, setVerified] = useState(false);
  const submittedFor = useRef<string | null>(null);
  // Set while a code is being checked, so the "already signed in" redirect
  // below doesn't skip the success screen.
  const verifying = useRef(false);

  // Signed in already (e.g. back button after verifying): go where they belong.
  useEffect(() => {
    if (isAuthenticated && !verified && !verifying.current) navigate(getPostAuthRedirectPath(user?.role), { replace: true });
  }, [isAuthenticated, verified, user?.role, navigate]);

  useEffect(() => {
    if (!verified || !user) return;
    const timer = window.setTimeout(() => navigate(resolvePostAuthPath(user.role, state.from), { replace: true }), 1400);
    return () => window.clearTimeout(timer);
  }, [verified, user, navigate, state.from]);

  const submit = async (value: string) => {
    const clean = value.replace(/\s/g, '');
    if (clean.length !== 6 || submitting || submittedFor.current === clean) return;
    submittedFor.current = clean;
    setSubmitting(true);
    setError(null);
    verifying.current = true;
    try {
      await verifyEmailCode(email, clean);
      setVerified(true);
    } catch (err) {
      verifying.current = false;
      const { fields, message } = parseApiError(err);
      if (fields.reason === 'already_verified') {
        navigate('/login', { replace: true, state: { email, notice: 'Your email is already confirmed. Sign in to continue.' } });
        return;
      }
      setError(fields.code || message || 'That code didn’t work. Try again.');
      setCode('');
      submittedFor.current = null;
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async (target = email) => {
    setSending(true);
    setError(null);
    try {
      const res = await authAPI.resendCode(target);
      setNotice(`We sent a new code to ${maskEmail(target)}.`);
      setDevCode(res.dev_code);
      setResendIn(res.resend_in ?? 60);
      setCode('');
      submittedFor.current = null;
    } catch (err: any) {
      const wait = err?.response?.data?.resend_in;
      if (wait) setResendIn(wait);
      setError(parseApiError(err).message || 'Couldn’t send a new code. Try again shortly.');
    } finally {
      setSending(false);
    }
  };

  // Arrived without an email (direct link or refresh): ask for it first.
  if (!email) {
    return (
      <AuthLayout audience={state.role ?? 'customer'}>
        <AuthHeading title="Verify your email" subtitle="Enter the email you signed up with and we'll send you a 6-digit code." />
        {error && <Notice tone="error">{error}</Notice>}
        <form
          noValidate
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const value = emailInput.trim();
            if (!validateEmail(value)) {
              setError("That doesn't look like an email address.");
              return;
            }
            setEmail(value);
            void resend(value);
          }}
        >
          <AuthField label="Email" htmlFor="verify-email">
            <input id="verify-email" type="email" autoComplete="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className={inputClass(!!error)} />
          </AuthField>
          <PrimaryButton type="submit" busy={sending} busyLabel="Sending…">
            Send code <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </PrimaryButton>
        </form>
      </AuthLayout>
    );
  }

  if (verified) {
    return (
      <AuthLayout audience={state.role ?? 'customer'}>
        <div className="text-center" role="status">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <MailCheck className="h-8 w-8" strokeWidth={1.6} aria-hidden="true" />
          </span>
          <h1 className="mt-6 font-eventra-display text-4xl font-medium">You're verified</h1>
          <p className="mt-3 text-[15px] text-[#6b6a63]">Welcome to Platforma{user?.first_name ? `, ${user.first_name}` : ''}. Taking you in now…</p>
          <div className="mx-auto mt-6 h-1 w-40 overflow-hidden rounded-full bg-[#e6e2d8]">
            <div className="h-full w-full origin-left animate-[grow_1.4s_linear] rounded-full bg-[#6f7f42]" />
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout audience={state.role ?? 'customer'}>
      {state.reason === 'signup' && (
        <ol className="mb-8 flex flex-wrap items-center gap-2 text-xs font-semibold" aria-label="Sign-up steps">
          {['Account type', 'Your details', 'Verify email'].map((label, i) => (
            <li key={label} className="flex items-center gap-2" aria-current={i === 2 ? 'step' : undefined}>
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${i < 2 ? 'bg-[#6f7f42] text-white' : 'bg-[#141414] text-white'}`}>
                {i < 2 ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : 3}
              </span>
              <span className={i === 2 ? 'text-[#141414]' : 'text-[#9c9a90]'}>{label}</span>
              {i < 2 && <span className="mx-1 h-px w-5 bg-[#dedad0]" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      )}

      <span className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#56652f] ring-1 ring-[#e6e2d8]">
        <MailCheck className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
      </span>
      <AuthHeading
        title="Check your inbox"
        subtitle={
          <>
            Enter the 6-digit code we sent to <span className="font-semibold text-[#141414]">{email}</span>. It expires in 10 minutes.
          </>
        }
      />

      {notice && !error && <Notice tone="info">{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
      >
        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (error) setError(null);
          }}
          onComplete={(v) => void submit(v)}
          hasError={!!error}
          disabled={submitting}
        />
        <PrimaryButton type="submit" className="mt-6" busy={submitting} busyLabel="Checking…" disabled={code.replace(/\s/g, '').length !== 6}>
          Verify email <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </PrimaryButton>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-[#6b6a63]">Didn’t get it? Check spam, or</span>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={resendIn > 0 || sending}
          className="inline-flex items-center gap-1.5 font-semibold text-[#141414] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-[#9c9a90] disabled:no-underline"
        >
          <RotateCw className={`h-4 w-4 ${sending ? 'animate-spin' : ''}`} aria-hidden="true" />
          {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Send a new code'}
        </button>
      </div>

      <DevCodeHint code={devCode} />

      <p className="mt-10 border-t border-[#e6e2d8] pt-6 text-sm text-[#6b6a63]">
        Wrong email?{' '}
        {state.reason === 'signup' ? (
          <Link to="/register" className="font-semibold text-[#141414] underline-offset-4 hover:underline">Start again with a different one</Link>
        ) : (
          <Link to="/login" className="font-semibold text-[#141414] underline-offset-4 hover:underline">Sign in with another account</Link>
        )}
      </p>
    </AuthLayout>
  );
};

export default VerifyEmailPage;
