import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';

/** Shared chrome for Eventra seat selection → checkout → tickets. */

const STEPS = ['Seats', 'Payment', 'Tickets'] as const;

export const CATEGORY_IMAGES: Record<string, string> = {
  movie: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1800&q=80',
  concert: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1800&q=80',
  sports: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1800&q=80',
  theater: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1800&q=80',
  comedy: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=1800&q=80',
  expo: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1800&q=80',
  dining: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1800&q=80',
};

export const eventImage = (event?: { image?: string; banner?: string; category?: string } | null) =>
  event?.banner || event?.image || CATEGORY_IMAGES[event?.category ?? ''] || CATEGORY_IMAGES.concert;

export const inr = (value: unknown, exact = true) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: exact ? 2 : 0,
    maximumFractionDigits: exact ? 2 : 0,
  }).format(Number(value) || 0);

export const EventraFlowPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="min-h-screen bg-[#0a0a0a] font-eventra-body text-[#f5f0e8] selection:bg-[#c4621a]/40 [color-scheme:dark]">{children}</main>
);

export const EventraFlowHeader: React.FC<{
  step?: 0 | 1 | 2;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  image?: string;
  back?: { to: string; label: string };
  aside?: React.ReactNode;
}> = ({ step, title, subtitle, image, back, aside }) => (
  <header className="relative isolate overflow-hidden">
    {image && <img src={image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_35%]" />}
    <div
      className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(10,10,10,0.55)_0%,rgba(10,10,10,0.8)_60%,#0a0a0a_100%),linear-gradient(90deg,rgba(10,10,10,0.85)_0%,rgba(10,10,10,0)_75%)]"
      aria-hidden="true"
    />
    <div className="mx-auto max-w-6xl px-5 pb-10 pt-7 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {back ? (
          <Link to={back.to} className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {back.label}
          </Link>
        ) : (
          <span />
        )}
        {step !== undefined && (
          <ol className="flex items-center gap-2 text-xs font-semibold" aria-label="Booking progress">
            {STEPS.map((label, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li key={label} className="flex items-center gap-2" aria-current={current ? 'step' : undefined}>
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${
                      done ? 'bg-emerald-500/90 text-white' : current ? 'bg-[#c4621a] text-white' : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                  </span>
                  <span className={current ? 'text-white' : 'text-white/50'}>{label}</span>
                  {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-white/20" aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-eventra-display text-4xl font-medium leading-tight sm:text-5xl">{title}</h1>
          {subtitle && <div className="mt-2 text-[15px] text-white/70">{subtitle}</div>}
        </div>
        {aside}
      </div>
    </div>
  </header>
);

export const EventraCard: React.FC<{
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  flush?: boolean;
  children: React.ReactNode;
}> = ({ title, action, className = '', flush, children }) => (
  <section className={`min-w-0 rounded-2xl border border-white/[0.08] bg-[#141414] ${className}`}>
    {(title || action) && (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-6">
        <h2 className="font-eventra-display text-xl">{title}</h2>
        {action}
      </div>
    )}
    <div className={flush ? '' : 'p-5 sm:p-6'}>{children}</div>
  </section>
);

export const EventraBill: React.FC<{ subtotal: unknown; tax: unknown; total: unknown; taxLabel?: string }> = ({
  subtotal,
  tax,
  total,
  taxLabel = 'Taxes (GST 18%)',
}) => (
  <dl className="space-y-2.5 text-sm">
    <div className="flex justify-between text-[#c9c3ba]">
      <dt>Tickets</dt>
      <dd className="tabular-nums">{inr(subtotal)}</dd>
    </div>
    <div className="flex justify-between text-[#c9c3ba]">
      <dt>{taxLabel}</dt>
      <dd className="tabular-nums">{inr(tax)}</dd>
    </div>
    <div className="mt-3 flex items-baseline justify-between border-t border-dashed border-white/15 pt-3">
      <dt className="font-semibold">Total</dt>
      <dd className="font-eventra-display text-3xl tabular-nums text-[#f0a070]">{inr(total)}</dd>
    </div>
  </dl>
);

export const primaryButton =
  'inline-flex w-full items-center justify-between gap-2 rounded-full bg-[#c4621a] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#d8712a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8824a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-50';
