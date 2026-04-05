import { useMemo, useState, type FC } from 'react';
import { ThemeSwitchButton } from '../components/ThemeSwitchButton';
import {
  eventraContent,
  formatINR,
  type TicketTier,
} from '../data/unifiedContent';

type EventraExperienceProps = {
  onSwitchToZesty: () => void;
};

type TierCountState = Record<TicketTier['id'], number>;
type Stand = 'north' | 'east' | 'west' | 'south';

type PaymentMethod = 'card' | 'upi' | 'netbanking';

const standLabel: Record<Stand, string> = {
  north: 'North Stand',
  east: 'East Stand',
  west: 'West Stand',
  south: 'South Stand',
};

const standPriceHint: Record<Stand, string> = {
  north: 'Premium acoustic zone',
  east: 'Panoramic side view',
  west: 'Energetic fan section',
  south: 'Family friendly stands',
};

export const EventraExperience: FC<EventraExperienceProps> = ({
  onSwitchToZesty,
}) => {
  const [city, setCity] = useState(eventraContent.city);
  const [activeStand, setActiveStand] = useState<Stand>('north');
  const [ticketCounts, setTicketCounts] = useState<TierCountState>({
    north: 1,
    grand: 2,
    vip: 0,
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [promoCode, setPromoCode] = useState('EVENTRA10');
  const [promoApplied, setPromoApplied] = useState(true);

  const [customerInfo, setCustomerInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  const ticketRows = useMemo(
    () =>
      eventraContent.ticketTiers
        .map((tier) => ({
          tier,
          count: ticketCounts[tier.id],
          amount: ticketCounts[tier.id] * tier.price,
        }))
        .filter((row) => row.count > 0),
    [ticketCounts],
  );

  const totals = useMemo(() => {
    const subtotal = eventraContent.ticketTiers.reduce(
      (sum, tier) => sum + ticketCounts[tier.id] * tier.price,
      0,
    );
    const serviceFee = subtotal > 0 ? Math.round(subtotal * 0.04 + 99) : 0;
    const discount = promoApplied ? Math.min(500, Math.round(subtotal * 0.08)) : 0;
    const grandTotal = subtotal + serviceFee - discount;

    return {
      subtotal,
      serviceFee,
      discount,
      grandTotal,
      ticketCount: Object.values(ticketCounts).reduce(
        (sum, quantity) => sum + quantity,
        0,
      ),
    };
  }, [promoApplied, ticketCounts]);

  const bookingEnabled =
    totals.ticketCount > 0 &&
    customerInfo.fullName.trim().length > 2 &&
    customerInfo.email.trim().includes('@');

  const updateTierCount = (tierId: TicketTier['id'], delta: number): void => {
    setTicketCounts((previous) => ({
      ...previous,
      [tierId]: Math.max(0, previous[tierId] + delta),
    }));
  };

  const updateCustomerField = (
    field: keyof typeof customerInfo,
    value: string,
  ): void => {
    setCustomerInfo((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  return (
    <div className="theme-eventra min-h-screen overflow-x-hidden bg-[#fbf8fe] text-[#1b1b20]">
      <header className="sticky top-0 z-40 bg-[rgba(251,248,254,0.68)] backdrop-blur-xl shadow-[0_10px_30px_rgba(84,38,228,0.08)]">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-4 md:px-10">
          <div className="flex items-center gap-10">
            <h1 className="text-3xl font-black italic tracking-tight text-[#5426e4]">
              Eventra
            </h1>
            <nav className="hidden items-center gap-6 md:flex">
              {eventraContent.nav.map((item, index) => (
                <a
                  key={item}
                  href="#"
                  className={`rounded-full px-2 py-1 text-sm font-semibold transition-all ${
                    index === 0
                      ? 'text-[#5426e4]'
                      : 'text-[#484556] hover:bg-[#f5f3f9] hover:text-[#5426e4]'
                  }`}
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-[#efedf3] px-4 py-2 md:flex">
              <span className="material-symbols-outlined text-base text-[#5426e4]">
                location_on
              </span>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="w-28 bg-transparent text-xs font-semibold text-[#484556] outline-none"
              />
            </div>
            <ThemeSwitchButton
              label="Open Zesty"
              mode="zesty"
              onClick={onSwitchToZesty}
            />
          </div>
        </div>
      </header>

      <main className="space-y-20 pb-20">
        <section className="mx-auto w-full max-w-[1440px] px-6 pt-8 md:px-10">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="font-eventra-label text-xs font-bold uppercase tracking-[0.25em] text-[#5426e4]">
                Live Action
              </p>
              <h2 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
                TATA IPL 2026
              </h2>
            </div>
            <button
              type="button"
              className="hidden items-center gap-1 rounded-full bg-white px-5 py-2 text-sm font-bold text-[#5426e4] shadow-[0_12px_26px_rgba(84,38,228,0.12)] transition-transform hover:scale-[1.03] md:inline-flex"
            >
              View Schedule
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>

          <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-3 eventra-scrollbar">
            {eventraContent.featuredMatches.map((match) => (
              <article
                key={match.code}
                className="min-w-[320px] snap-start rounded-[1.7rem] bg-white p-6 shadow-[0_14px_32px_rgba(84,38,228,0.1)] md:min-w-[400px]"
              >
                <div className="mb-6 flex items-start justify-between">
                  <span className="rounded-full bg-[#e6deff] px-3 py-1 text-xs font-bold text-[#5426e4]">
                    {match.code}
                  </span>
                  <span className="font-eventra-label text-xs text-[#484556]">
                    {match.date}
                  </span>
                </div>
                <div className="mb-7 flex items-center justify-between">
                  <div className="text-center">
                    <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f3f9] text-sm font-black text-[#5426e4]">
                      {match.teams[0].slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-bold">{match.teams[0]}</p>
                  </div>
                  <p className="text-lg font-black italic text-[#797587]">VS</p>
                  <div className="text-center">
                    <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f3f9] text-sm font-black text-[#5426e4]">
                      {match.teams[1].slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-bold">{match.teams[1]}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-eventra-label text-sm font-bold text-[#484556]">
                    From {formatINR(match.price)}
                  </p>
                  <button
                    type="button"
                    className="rounded-xl bg-gradient-to-r from-[#5426e4] to-[#6d49fd] px-5 py-2 text-sm font-bold text-white shadow-[0_12px_22px_rgba(84,38,228,0.25)] transition-transform hover:scale-[1.03]"
                  >
                    {match.status}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1440px] px-6 md:px-10">
          <h3 className="mb-7 text-3xl font-black tracking-tight md:text-4xl">
            Top Hindi Movies
          </h3>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {eventraContent.movies.map((movie) => (
              <article key={movie.title} className="group cursor-pointer">
                <div className="mb-3 aspect-[2/3] overflow-hidden rounded-[1.5rem] bg-[#efedf3] shadow-[0_10px_22px_rgba(84,38,228,0.08)]">
                  <img
                    src={movie.image}
                    alt={movie.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h4 className="text-lg font-black leading-tight">{movie.title}</h4>
                <p className="mt-1 font-eventra-label text-xs text-[#484556]">
                  {movie.meta}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-[#f5f3f9] py-16">
          <div className="mx-auto w-full max-w-[1440px] px-6 md:px-10">
            <h3 className="mb-8 text-3xl font-black tracking-tight md:text-4xl">
              Crowd Favourite Activities
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {eventraContent.experiences.map((experience) => (
                <article
                  key={experience.title}
                  className="group relative h-[340px] overflow-hidden rounded-[1.75rem]"
                >
                  <img
                    src={experience.image}
                    alt={experience.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-6 text-white">
                    <h4 className="text-2xl font-black tracking-tight">{experience.title}</h4>
                    <p className="font-eventra-label text-sm text-white/85">
                      Starting at {formatINR(experience.price)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-8 px-6 md:px-10 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div className="space-y-8">
            <div className="rounded-[1.75rem] bg-white p-6 shadow-[0_18px_40px_rgba(84,38,228,0.1)] md:p-8">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="font-eventra-label text-xs font-bold uppercase tracking-[0.2em] text-[#5426e4]">
                    Championship Final
                  </p>
                  <h3 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">
                    Choose Your Seat
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#484556]">
                    Active section
                  </p>
                  <p className="text-lg font-black text-[#5426e4]">
                    {standLabel[activeStand]}
                  </p>
                </div>
              </div>
              <p className="mb-6 font-eventra-label text-sm text-[#484556]">
                {standPriceHint[activeStand]}
              </p>

              <div className="rounded-[1.5rem] bg-[#f5f3f9] p-6 md:p-9">
                <svg className="w-full" viewBox="0 0 620 480" role="img" aria-label="Stadium Map">
                  <rect x="230" y="190" width="160" height="110" rx="24" fill="#2d5a27" />
                  <rect x="286" y="216" width="48" height="58" rx="8" fill="#d9c6a5" />

                  <path
                    d="M140,90 Q310,20 480,90 L520,132 Q310,64 100,132 Z"
                    onClick={() => setActiveStand('north')}
                    className="cursor-pointer transition-all"
                    fill={activeStand === 'north' ? '#5426e4' : '#8269df'}
                  />
                  <text x="310" y="76" textAnchor="middle" fill="white" className="text-[13px] font-bold">
                    NORTH STAND
                  </text>

                  <path
                    d="M520,165 Q580,245 520,325 L484,302 Q530,245 484,188 Z"
                    onClick={() => setActiveStand('east')}
                    className="cursor-pointer transition-all"
                    fill={activeStand === 'east' ? '#5426e4' : '#9b87e8'}
                  />
                  <text
                    x="546"
                    y="248"
                    textAnchor="middle"
                    fill="white"
                    transform="rotate(90,546,248)"
                    className="text-[12px] font-bold"
                  >
                    EAST
                  </text>

                  <path
                    d="M100,165 Q40,245 100,325 L136,302 Q90,245 136,188 Z"
                    onClick={() => setActiveStand('west')}
                    className="cursor-pointer transition-all"
                    fill={activeStand === 'west' ? '#5426e4' : '#9b87e8'}
                  />
                  <text
                    x="74"
                    y="248"
                    textAnchor="middle"
                    fill="white"
                    transform="rotate(-90,74,248)"
                    className="text-[12px] font-bold"
                  >
                    WEST
                  </text>

                  <path
                    d="M140,392 Q310,458 480,392 L520,350 Q310,418 100,350 Z"
                    onClick={() => setActiveStand('south')}
                    className="cursor-pointer transition-all"
                    fill={activeStand === 'south' ? '#5426e4' : '#8269df'}
                  />
                  <text x="310" y="428" textAnchor="middle" fill="white" className="text-[13px] font-bold">
                    SOUTH STAND
                  </text>
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {eventraContent.ticketTiers.map((tier) => (
                <article
                  key={tier.id}
                  className={`rounded-[1.5rem] p-6 shadow-[0_12px_28px_rgba(84,38,228,0.09)] ${
                    tier.id === 'grand' ? 'bg-[#f3ecff]' : 'bg-white'
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-black tracking-tight">{tier.name}</h4>
                      <p className="font-eventra-label text-xs text-[#484556]">
                        {tier.subtitle}
                      </p>
                    </div>
                    {tier.tag ? (
                      <span className="rounded-full bg-[#5426e4] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                        {tier.tag}
                      </span>
                    ) : null}
                  </div>

                  <ul className="mb-5 space-y-1.5">
                    {tier.perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-center gap-2 font-eventra-label text-xs text-[#484556]"
                      >
                        <span className="material-symbols-outlined text-sm text-[#5426e4]">
                          check_circle
                        </span>
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <div className="mb-4 text-2xl font-black text-[#5426e4]">
                    {formatINR(tier.price)}
                  </div>

                  <div className="flex items-center justify-between rounded-full bg-[#efedf3] px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => updateTierCount(tier.id, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-[#5426e4]"
                    >
                      -
                    </button>
                    <span className="font-eventra-label text-sm font-bold text-[#1b1b20]">
                      {ticketCounts[tier.id]}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateTierCount(tier.id, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5426e4] text-lg font-bold text-white"
                    >
                      +
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28">
            <div className="overflow-hidden rounded-[1.85rem] bg-white shadow-[0_20px_44px_rgba(84,38,228,0.14)]">
              <div className="relative h-52">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuATwK9VQXoRtZ4XJBGP135K5Yds8ToKl9DyPjPL8Sg6fpD0dsUFAsbyxTY05A0f7EBwg-8yFY7TQDZuZUN2D3kpoWWIs0NhPnojHyqIDm0iT3Tyfu-RuB9TgJ2glnFXsSpN7bPNzl_cIyENVCN6wHAbOn5cMGz4g6zwv_pwBJZ99ZiUrASO-7f6iCAMGT1n-wE_yr66LvcjKYwtrtuFr9v1CAUErFZfVekp1RNpfE2zvdkLDAFY4EvoCbiifEgBDZXO0BesEirkvg"
                  alt="Stadium"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h4 className="text-2xl font-black leading-tight">
                    Titans vs Knights
                  </h4>
                  <p className="font-eventra-label text-xs text-white/90">
                    24 May 2026 • 07:30 PM IST
                  </p>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <p className="mb-3 font-eventra-label text-[11px] font-bold uppercase tracking-[0.2em] text-[#797587]">
                    Selected tickets
                  </p>
                  {ticketRows.length > 0 ? (
                    <div className="space-y-2.5">
                      {ticketRows.map((row) => (
                        <div
                          key={row.tier.id}
                          className="rounded-2xl bg-[#f5f3f9] p-3"
                        >
                          <div className="flex items-center justify-between text-sm font-bold">
                            <span>{row.tier.name}</span>
                            <span>x{row.count}</span>
                          </div>
                          <div className="mt-1 text-right text-sm font-black text-[#5426e4]">
                            {formatINR(row.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-2xl bg-[#f5f3f9] p-4 text-sm font-medium text-[#484556]">
                      No tickets selected yet.
                    </p>
                  )}
                </div>

                <div className="space-y-2 border-t border-[#e9e7ed] pt-4">
                  <div className="flex items-center justify-between text-sm text-[#484556]">
                    <span>Subtotal</span>
                    <span className="font-bold text-[#1b1b20]">
                      {formatINR(totals.subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-[#484556]">
                    <span>Internet Handling Fees</span>
                    <span className="font-bold text-[#1b1b20]">
                      {formatINR(totals.serviceFee)}
                    </span>
                  </div>
                  {promoApplied ? (
                    <div className="flex items-center justify-between text-sm text-[#2f8b57]">
                      <span>Promo Discount</span>
                      <span className="font-bold">-{formatINR(totals.discount)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between border-t border-[#e9e7ed] pt-3">
                    <span className="text-base font-bold">Total Amount</span>
                    <span className="text-2xl font-black text-[#5426e4]">
                      {formatINR(totals.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.8rem] bg-white p-6 shadow-[0_14px_30px_rgba(84,38,228,0.08)]">
              <h4 className="text-2xl font-black tracking-tight">Checkout</h4>
              <p className="mt-1 font-eventra-label text-xs text-[#484556]">
                Complete details and secure your seats.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={customerInfo.fullName}
                  onChange={(event) =>
                    updateCustomerField('fullName', event.target.value)
                  }
                  placeholder="Full Name"
                  className="rounded-xl bg-[#f5f3f9] px-4 py-3 text-sm font-medium outline-none ring-2 ring-transparent transition focus:ring-[#c9beff] sm:col-span-2"
                />
                <input
                  value={customerInfo.email}
                  onChange={(event) => updateCustomerField('email', event.target.value)}
                  placeholder="Email"
                  className="rounded-xl bg-[#f5f3f9] px-4 py-3 text-sm font-medium outline-none ring-2 ring-transparent transition focus:ring-[#c9beff] sm:col-span-2"
                />
                <input
                  value={customerInfo.phone}
                  onChange={(event) => updateCustomerField('phone', event.target.value)}
                  placeholder="Phone"
                  className="rounded-xl bg-[#f5f3f9] px-4 py-3 text-sm font-medium outline-none ring-2 ring-transparent transition focus:ring-[#c9beff] sm:col-span-2"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    { id: 'card', label: 'Card' },
                    { id: 'upi', label: 'UPI / Wallet' },
                    { id: 'netbanking', label: 'Net Banking' },
                  ] as const
                ).map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
                      paymentMethod === method.id
                        ? 'bg-[#5426e4] text-white'
                        : 'bg-[#efedf3] text-[#484556]'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              {paymentMethod === 'card' ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={customerInfo.cardNumber}
                    onChange={(event) =>
                      updateCustomerField('cardNumber', event.target.value)
                    }
                    placeholder="Card Number"
                    className="rounded-xl bg-[#f5f3f9] px-4 py-3 text-sm font-medium outline-none ring-2 ring-transparent transition focus:ring-[#c9beff] sm:col-span-2"
                  />
                  <input
                    value={customerInfo.expiry}
                    onChange={(event) => updateCustomerField('expiry', event.target.value)}
                    placeholder="MM / YY"
                    className="rounded-xl bg-[#f5f3f9] px-4 py-3 text-sm font-medium outline-none ring-2 ring-transparent transition focus:ring-[#c9beff]"
                  />
                  <input
                    value={customerInfo.cvv}
                    onChange={(event) => updateCustomerField('cvv', event.target.value)}
                    placeholder="CVV"
                    className="rounded-xl bg-[#f5f3f9] px-4 py-3 text-sm font-medium outline-none ring-2 ring-transparent transition focus:ring-[#c9beff]"
                  />
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-[#f5f3f9] px-4 py-3 text-sm font-medium text-[#484556]">
                  {paymentMethod === 'upi'
                    ? 'Use your favorite UPI app to complete payment securely.'
                    : 'Choose your bank in the next step for encrypted transfer.'}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <input
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value)}
                  placeholder="Promo Code"
                  className="w-full rounded-xl bg-[#f5f3f9] px-4 py-3 text-sm font-medium outline-none ring-2 ring-transparent transition focus:ring-[#c9beff]"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPromoApplied(promoCode.trim().toUpperCase() === 'EVENTRA10')
                  }
                  className="rounded-xl bg-[#1b1b20] px-4 py-3 text-xs font-bold text-white"
                >
                  Apply
                </button>
              </div>

              <button
                type="button"
                disabled={!bookingEnabled}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5426e4] to-[#6d49fd] px-4 py-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(84,38,228,0.32)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Proceed to Payment
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          </aside>
        </section>
      </main>

      <footer className="bg-[#f5f3f9]">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-8 px-6 py-12 text-sm text-[#484556] md:grid-cols-3 md:px-10">
          <div>
            <h4 className="text-2xl font-black text-[#5426e4]">Eventra</h4>
            <p className="mt-2 font-eventra-label">
              Curating premium moments across sports, cinema, and culture.
            </p>
          </div>
          <div>
            <h5 className="font-black text-[#1b1b20]">Support</h5>
            <p className="mt-2 font-eventra-label">help@eventra.app</p>
            <p className="font-eventra-label">+91 1800 212 8700</p>
          </div>
          <div>
            <h5 className="font-black text-[#1b1b20]">Legal</h5>
            <p className="mt-2 font-eventra-label">Terms and Conditions</p>
            <p className="font-eventra-label">Privacy Policy</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
