import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound, RotateCw } from 'lucide-react';
import { authAPI, parseApiError } from '../../api/auth';
import { validateEmail } from '../../utils/validation';
import {
  AuthField,
  AuthHeading,
  AuthLayout,
  DevCodeHint,
  Notice,
  OtpInput,
  PasswordInput,
  PasswordStrength,
  PrimaryButton,
  inputClass,
  passwordChecks,
  useCountdown,
} from '../../components/auth/AuthKit';

type Step = 'email' | 'reset';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state as { email?: string } | null)?.email ?? '';

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [errors, setErrors] = useState<{ email?: string; code?: string; password?: string; confirm?: string; general?: string }>({});
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useCountdown(0);

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = email.trim();
    if (!validateEmail(value)) {
      setErrors({ email: value ? "That doesn't look like an email address." : 'Enter the email on your account.' });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const res = await authAPI.requestPasswordReset(value);
      setDevCode(res.dev_code);
      setResendIn(res.resend_in ?? 60);
      setStep('reset');
    } catch (err: any) {
      const wait = err?.response?.data?.resend_in;
      if (wait) {
        setResendIn(wait);
        setStep('reset');
      }
      setErrors({ general: parseApiError(err).message || 'Couldn’t send a code. Try again shortly.' });
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (code.replace(/\s/g, '').length !== 6) next.code = 'Enter the 6-digit code from your email.';
    const checks = passwordChecks(password, [email.split('@')[0]]);
    if (!password) next.password = 'Choose a new password.';
    else if (!checks[0].ok || !checks[1].ok) next.password = 'Use at least 8 characters with letters and numbers.';
    if (password && confirm !== password) next.confirm = "Passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await authAPI.confirmPasswordReset(email.trim(), code.replace(/\s/g, ''), password, confirm);
      navigate('/login', { replace: true, state: { email: email.trim(), notice: 'Password updated. Sign in with your new password.' } });
    } catch (err) {
      const { fields, message } = parseApiError(err);
      setErrors({
        code: fields.code,
        password: fields.new_password,
        confirm: fields.new_password_confirm,
        general: !fields.code && !fields.new_password && !fields.new_password_confirm ? message || 'Reset failed. Please try again.' : undefined,
      });
      if (fields.code) setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      aside={
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-[#141414] underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <span className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#56652f] ring-1 ring-[#e6e2d8]">
        <KeyRound className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
      </span>

      {step === 'email' ? (
        <>
          <AuthHeading title="Reset your password" subtitle="Enter the email on your account and we'll send you a 6-digit code to set a new password." />
          {errors.general && <Notice tone="error">{errors.general}</Notice>}
          <form noValidate onSubmit={requestCode} className="space-y-5">
            <AuthField label="Email" htmlFor="reset-email" error={errors.email}>
              <input
                id="reset-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({});
                }}
                aria-invalid={!!errors.email}
                className={inputClass(!!errors.email)}
              />
            </AuthField>
            <PrimaryButton type="submit" busy={busy} busyLabel="Sending…">
              Send reset code <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryButton>
          </form>
        </>
      ) : (
        <>
          <AuthHeading
            title="Choose a new password"
            subtitle={
              <>
                If <span className="font-semibold text-[#141414]">{email.trim()}</span> has an account, a code is on its way. It expires in 10 minutes.
              </>
            }
          />
          {errors.general && <Notice tone="error">{errors.general}</Notice>}
          <form noValidate onSubmit={resetPassword} className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-semibold">Code from your email</p>
              <OtpInput
                value={code}
                onChange={(v) => {
                  setCode(v);
                  if (errors.code) setErrors((p) => ({ ...p, code: undefined }));
                }}
                hasError={!!errors.code}
                disabled={busy}
              />
              {errors.code && <p role="alert" className="mt-2 text-[13px] text-rose-600">{errors.code}</p>}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void requestCode()}
                  disabled={resendIn > 0 || busy}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#141414] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-[#9c9a90] disabled:no-underline"
                >
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Send a new code'}
                </button>
              </div>
            </div>

            <AuthField label="New password" htmlFor="new-password" error={errors.password}>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                }}
                hasError={!!errors.password}
              />
              <PasswordStrength password={password} context={[email.split('@')[0]]} />
            </AuthField>

            <AuthField label="Confirm new password" htmlFor="confirm-password" error={errors.confirm}>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
                }}
                hasError={!!errors.confirm}
              />
            </AuthField>

            <PrimaryButton type="submit" busy={busy} busyLabel="Updating…">
              Update password <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryButton>
          </form>

          <DevCodeHint code={devCode} />

          <button
            type="button"
            onClick={() => {
              setStep('email');
              setCode('');
              setErrors({});
            }}
            className="mt-8 inline-flex items-center gap-1.5 text-sm text-[#6b6a63] hover:text-[#141414]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Use a different email
          </button>
        </>
      )}
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
