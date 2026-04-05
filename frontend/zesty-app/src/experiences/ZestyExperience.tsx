import { useMemo, useState, type FC } from 'react';
import { Hero } from '../components/Hero';
import { ThemeSwitchButton } from '../components/ThemeSwitchButton';
import { zestyContent } from '../data/unifiedContent';

type ZestyExperienceProps = {
  onSwitchToEventra: () => void;
};

const cityOptions = ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Pune', 'Hyderabad'];

export const ZestyExperience: FC<ZestyExperienceProps> = ({
  onSwitchToEventra,
}) => {
  const [city, setCity] = useState(cityOptions[0]);
  const [contactMode, setContactMode] = useState<'email' | 'phone'>('email');
  const [contactValue, setContactValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const contactPlaceholder =
    contactMode === 'email' ? 'name@email.com' : '+91 90000 00000';

  const submitDisabled = useMemo(
    () => contactValue.trim().length < 6,
    [contactValue],
  );

  return (
    <div className="theme-zesty min-h-screen overflow-x-hidden bg-[#fcf9f8] text-[#1b1b1b]">
      <header className="sticky top-0 z-50 border-b border-white/45 bg-[linear-gradient(125deg,rgba(252,249,248,0.68),rgba(255,255,255,0.44))] shadow-[0_14px_34px_rgba(27,27,27,0.08)] backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <div className="flex items-center gap-8">
            <h1 className="text-3xl font-black italic tracking-tight text-[#b7122a]">
              Zesty
            </h1>
            <nav className="hidden items-center gap-5 text-sm font-semibold text-[#5b403f] md:flex">
              {zestyContent.nav.map((item) => (
                <a
                  key={item}
                  href="#"
                  className="rounded-full px-3 py-1.5 transition-colors hover:bg-[#f0eded] hover:text-[#b7122a]"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#5b403f] shadow-[0_8px_20px_rgba(91,64,63,0.08)] md:flex">
              <span className="material-symbols-outlined text-base text-[#b7122a]">
                location_on
              </span>
              <select
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="bg-transparent outline-none"
              >
                {cityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <ThemeSwitchButton
              label="Open Eventra"
              mode="eventra"
              onClick={onSwitchToEventra}
            />
          </div>
        </div>
      </header>

      <main>
        <Hero />

        <section className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-4 px-6 pb-16 md:px-10 lg:grid-cols-4">
          {zestyContent.metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-3xl bg-white p-6 shadow-[0_18px_40px_rgba(27,27,27,0.08)]"
            >
              <p className="text-3xl font-black text-[#b7122a] md:text-4xl">
                {metric.value}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#5b403f]">
                {metric.label}
              </p>
            </article>
          ))}
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-10">
          <div className="mb-8 flex items-end justify-between gap-5">
            <div>
              <h3 className="text-3xl font-black tracking-tight md:text-4xl">
                Curated for your cravings
              </h3>
              <p className="mt-2 text-[#5b403f]">
                Every section is tuned for speed, quality, and flavor.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {zestyContent.categories.map((category) => (
              <article
                key={category.title}
                className="group overflow-hidden rounded-3xl bg-white shadow-[0_16px_34px_rgba(27,27,27,0.08)] transition-transform hover:-translate-y-1"
              >
                <div className="h-52 overflow-hidden">
                  <img
                    src={category.image}
                    alt={category.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <h4 className="text-2xl font-black tracking-tight text-[#1b1b1b]">
                    {category.title}
                  </h4>
                  <p className="mt-2 text-sm font-medium text-[#5b403f]">
                    {category.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-10">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h3 className="text-3xl font-black tracking-tight md:text-4xl">
              Collections
            </h3>
            <a
              href="#"
              className="inline-flex items-center gap-1 text-sm font-bold text-[#b7122a]"
            >
              Explore all
              <span className="material-symbols-outlined text-base">arrow_right_alt</span>
            </a>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {zestyContent.collections.map((item) => (
              <article
                key={item.title}
                className="group relative h-[340px] overflow-hidden rounded-3xl"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
                <div className="absolute bottom-5 left-5 text-white">
                  <h4 className="text-xl font-black tracking-tight">{item.title}</h4>
                  <p className="mt-1 text-sm font-semibold">{item.places} places</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-10">
          <div className="rounded-[2rem] bg-[#f0eded] p-7 md:p-10">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b7122a]">
                The Zesty experience
              </p>
              <h3 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
                Everything you need in one tap
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {zestyContent.features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-3xl bg-white p-6 shadow-[0_12px_28px_rgba(27,27,27,0.06)]"
                >
                  <span className="material-symbols-outlined rounded-2xl bg-[#ffdad8] p-3 text-[#b7122a]">
                    {feature.icon}
                  </span>
                  <h4 className="mt-4 text-xl font-black tracking-tight">
                    {feature.title}
                  </h4>
                  <p className="mt-2 text-sm font-medium text-[#5b403f]">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-20 md:px-10">
          <div className="grid grid-cols-1 gap-8 rounded-[2.2rem] bg-gradient-to-br from-[#b7122a] via-[#db313f] to-[#ef4444] p-8 text-white shadow-[0_20px_44px_rgba(183,18,42,0.3)] md:grid-cols-[1.3fr_0.7fr] md:p-10">
            <div>
              <h3 className="text-3xl font-black tracking-tight md:text-4xl">
                {zestyContent.appPromo.title}
              </h3>
              <p className="mt-2 max-w-xl text-sm font-medium text-white/90 md:text-base">
                {zestyContent.appPromo.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setContactMode('email')}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    contactMode === 'email'
                      ? 'bg-white text-[#b7122a]'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setContactMode('phone')}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    contactMode === 'phone'
                      ? 'bg-white text-[#b7122a]'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  Phone
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={contactValue}
                  onChange={(event) => {
                    setContactValue(event.target.value);
                    setSubmitted(false);
                  }}
                  placeholder={contactPlaceholder}
                  className="w-full rounded-2xl border-none px-4 py-3 text-sm font-semibold text-[#1b1b1b] outline-none ring-2 ring-transparent transition focus:ring-white/60"
                />
                <button
                  type="button"
                  disabled={submitDisabled}
                  onClick={() => setSubmitted(true)}
                  className="rounded-2xl bg-[#1b1b1b] px-6 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Share Link
                </button>
              </div>
              {submitted ? (
                <p className="mt-3 text-xs font-semibold text-white/90">
                  Perfect. Your Zesty app link has been sent.
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-center">
              <div className="rounded-3xl bg-white p-4 text-center text-[#1b1b1b]">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://zesty.app/download"
                  alt="Download Zesty app"
                  className="h-44 w-44 rounded-2xl"
                />
                <p className="mt-3 text-sm font-black">Scan to download</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e5e2e1] bg-white/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-7 text-sm text-[#5b403f] md:flex-row md:items-center md:justify-between md:px-10">
          <p className="font-bold text-[#1b1b1b]">Zesty</p>
          <p>Experience the art of food delivery, from prep to doorstep.</p>
          <p>© 2026 Zesty Labs</p>
        </div>
      </footer>
    </div>
  );
};
