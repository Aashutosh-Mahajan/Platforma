import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Store } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { EmailNotVerifiedError, parseApiError } from '../../api/auth';
import { validateEmail } from '../../utils/validation';
import { resolvePostAuthPath } from '../../utils';
import { AuthField, AuthHeading, AuthLayout, Notice, PasswordInput, PrimaryButton, inputClass } from '../../components/auth/AuthKit';

interface LoginState {
  from?: string;
  notice?: string;
  email?: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user, clearError } = useAuth();
  const state = (location.state as LoginState | null) ?? {};
  // Set by ProtectedRoute when it bounced someone here, so we can send them
  // back to what they were trying to open after they sign in.
  const from = state.from;

  const [email, setEmail] = useState(state.email ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(resolvePostAuthPath(user?.role, from), { replace: true });
  }, [isAuthenticated, user?.role, navigate, from]);

  useEffect(() => () => clearError(), [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Enter your email address.';
    else if (!validateEmail(email.trim())) next.email = "That doesn't look like an email address.";
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err: any) {
      if (err instanceof EmailNotVerifiedError) {
        navigate('/verify-email', {
          state: {
            email: err.info.email ?? email.trim(),
            resendIn: err.info.resend_in,
            devCode: err.info.dev_code,
            // expires_in is only present when a fresh code was just issued.
            freshCode: err.info.expires_in !== undefined,
            from,
            reason: 'login',
          },
        });
        return;
      }
      const { message, fields } = parseApiError(err);
      setErrors({
        general:
          message === 'Invalid email or password.' || fields.non_field_errors === 'Invalid email or password.'
            ? "That email and password don't match. Check for typos or reset your password."
            : message || fields.non_field_errors || 'Sign-in failed. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      aside={
        <>
          New to Platforma?{' '}
          <Link to="/register" className="font-semibold text-[#141414] underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <AuthHeading title="Welcome back" subtitle="Sign in to order food, book tickets or run your business on Platforma." />

      {state.notice && !errors.general && <Notice tone="success">{state.notice}</Notice>}
      {errors.general && (
        <Notice tone="error">
          {errors.general}{' '}
          <Link to="/forgot-password" state={{ email }} className="font-semibold underline underline-offset-2">
            Reset password
          </Link>
        </Notice>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <AuthField label="Email" htmlFor="email" error={errors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email || errors.general) setErrors({});
            }}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            placeholder="you@example.com"
            className={inputClass(!!errors.email)}
          />
        </AuthField>

        <AuthField
          label="Password"
          htmlFor="password"
          error={errors.password}
          action={
            <Link to="/forgot-password" state={{ email }} className="text-sm font-medium text-[#56652f] hover:text-[#141414]">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password || errors.general) setErrors({});
            }}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            hasError={!!errors.password}
          />
        </AuthField>

        <PrimaryButton type="submit" busy={submitting} busyLabel="Signing in…">
          Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </PrimaryButton>
      </form>

      <div className="mt-10 border-t border-[#e6e2d8] pt-8">
        <p className="text-sm font-semibold">Run a business?</p>
        <p className="mt-1 text-sm text-[#6b6a63]">Partner accounts sign in here too. New partners can apply in a couple of minutes.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            to="/register?role=restaurant_owner"
            className="group flex items-center gap-3 rounded-xl border border-[#e6e2d8] bg-white px-4 py-3 text-sm transition-colors hover:border-[#141414]"
          >
            <Store className="h-5 w-5 text-[#b7122a]" strokeWidth={1.7} aria-hidden="true" />
            <span className="font-medium">List a restaurant</span>
          </Link>
          <Link
            to="/register?role=event_organizer"
            className="group flex items-center gap-3 rounded-xl border border-[#e6e2d8] bg-white px-4 py-3 text-sm transition-colors hover:border-[#141414]"
          >
            <CalendarDays className="h-5 w-5 text-[#c4621a]" strokeWidth={1.7} aria-hidden="true" />
            <span className="font-medium">Host events</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
