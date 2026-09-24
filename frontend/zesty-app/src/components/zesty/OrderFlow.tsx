import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { ZESTY_HERO_IMAGES } from '../../utils/foodImagery';

/** Shared chrome for cart → checkout → order tracking so the flow feels like one journey. */

const STEPS = ['Cart', 'Checkout', 'Track'] as const;

export const inr = (value: unknown, exact = true) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: exact ? 2 : 0,
    maximumFractionDigits: exact ? 2 : 0,
  }).format(Number(value) || 0);

export const FlowHeader: React.FC<{
  step?: 0 | 1 | 2;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  image?: string | null;
  back?: { to: string; label: string };
  aside?: React.ReactNode;
}> = ({ step, title, subtitle, image, back, aside }) => (
  <header className="relative isolate overflow-hidden bg-[#17110f] text-white">
    <img
      src={image || ZESTY_HERO_IMAGES[0]}
      alt=""
      className="absolute inset-0 -z-20 h-full w-full object-cover opacity-60"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }}
    />
    <div
      className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(23,17,15,0.95)_0%,rgba(23,17,15,0.78)_50%,rgba(23,17,15,0.45)_100%)]"
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
          <ol className="flex items-center gap-2 text-xs font-semibold" aria-label="Order progress">
            {STEPS.map((label, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li key={label} className="flex items-center gap-2" aria-current={current ? 'step' : undefined}>
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${
                      done ? 'bg-[#1fa463] text-white' : current ? 'bg-zesty-red text-white' : 'bg-white/15 text-white/60'
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                  </span>
                  <span className={current ? 'text-white' : 'text-white/55'}>{label}</span>
                  {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-white/25" aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-zesty-display text-[34px] font-bold leading-tight tracking-tight sm:text-[42px]">{title}</h1>
          {subtitle && <div className="mt-2 text-[15px] text-white/75">{subtitle}</div>}
        </div>
        {aside}
      </div>
    </div>
  </header>
);

export const FlowPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="min-h-screen bg-[#fbf5ee] font-zesty-body text-[#1c1c1c] selection:bg-zesty-red/20">{children}</main>
);

export const FlowCard: React.FC<{
  title?: React.ReactNode;
  number?: number;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, number, action, className = '', children }) => (
  <section className={`rounded-2xl border border-[#efe2d4] bg-white ${className}`}>
    {(title || action) && (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#efe2d4] px-5 py-4 sm:px-6">
        <h2 className="flex items-center gap-3 font-zesty-display text-lg font-bold">
          {number !== undefined && (
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#17110f] text-xs font-bold text-white">{number}</span>
          )}
          {title}
        </h2>
        {action}
      </div>
    )}
    <div className="p-5 sm:p-6">{children}</div>
  </section>
);

export const BillRows: React.FC<{
  subtotal: unknown;
  discount?: unknown;
  deliveryFee: unknown;
  tax: unknown;
  total: unknown;
  promoCode?: string | null;
}> = ({ subtotal, discount, deliveryFee, tax, total, promoCode }) => {
  const saved = Number(discount) || 0;
  return (
    <>
    <dl className="space-y-2.5 text-sm">
      <div className="flex justify-between text-[#5c5048]">
        <dt>Item total</dt>
        <dd className="tabular-nums">{inr(subtotal)}</dd>
      </div>
      {saved > 0 && (
        <div className="flex justify-between text-[#15784a]">
          <dt>Discount{promoCode ? ` (${promoCode})` : ''}</dt>
          <dd className="tabular-nums">−{inr(saved)}</dd>
        </div>
      )}
      <div className="flex justify-between text-[#5c5048]">
        <dt>Delivery fee</dt>
        <dd className="tabular-nums">{Number(deliveryFee) ? inr(deliveryFee) : 'Free'}</dd>
      </div>
      <div className="flex justify-between text-[#5c5048]">
        <dt>Taxes (GST 5%)</dt>
        <dd className="tabular-nums">{inr(tax)}</dd>
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-dashed border-[#e0c9b8] pt-3">
        <dt className="font-semibold">To pay</dt>
        <dd className="font-zesty-display text-2xl font-bold tabular-nums">{inr(total)}</dd>
      </div>
    </dl>
    {saved > 0 && (
      <p className="mt-3 rounded-lg bg-[#1fa463]/10 px-3 py-2 text-center text-xs font-semibold text-[#15784a]">You save {inr(saved)} on this order</p>
    )}
    </>
  );
};

export const VegMark: React.FC<{ veg: boolean }> = ({ veg }) => (
  <span
    title={veg ? 'Vegetarian' : 'Non-vegetarian'}
    className={`inline-grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border-[1.5px] ${veg ? 'border-[#1fa463]' : 'border-[#b7122a]'}`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${veg ? 'bg-[#1fa463]' : 'bg-[#b7122a]'}`} />
    <span className="sr-only">{veg ? 'Vegetarian' : 'Non-vegetarian'}</span>
  </span>
);
