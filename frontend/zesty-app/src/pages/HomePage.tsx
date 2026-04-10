import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts';

const navLinks = [
  {
    label: 'Zesty',
    to: '/zesty',
    className:
      'rounded-full border border-[#ffb3b1]/45 bg-[rgba(219,49,63,0.18)] px-3 py-1 text-sm font-semibold text-[#ffd7db] backdrop-blur-md shadow-[0_8px_20px_rgba(183,18,42,0.18)] transition-colors duration-200 hover:bg-[rgba(219,49,63,0.3)]',
  },
  {
    label: 'Eventra',
    to: '/eventra',
    className:
      'rounded-full border border-[#c9beff]/45 bg-[rgba(109,73,253,0.2)] px-3 py-1 text-sm font-semibold text-[#ece6ff] backdrop-blur-md shadow-[0_8px_22px_rgba(84,38,228,0.24)] transition-colors duration-200 hover:bg-[rgba(109,73,253,0.34)]',
  },
  {
    label: 'About',
    href: '#',
    className: 'text-sm font-medium text-white no-underline transition-colors duration-200 hover:text-white/80',
  },
  {
    label: 'Contact',
    href: '#',
    className: 'text-sm font-medium text-white no-underline transition-colors duration-200 hover:text-white/80',
  },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const authNavActionClass =
    'rounded px-1 py-2 text-sm font-medium text-white/90 transition-colors duration-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60';

  const handleAccountClick = () => {
    navigate('/profile');
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  const handleLogoutClick = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="bg-[#0d0d0d] text-white" style={{ fontFamily: '"DM Sans", sans-serif' }}>
      <style>{`
        button[aria-label='Open cart'],
        button[aria-label='Close cart'],
        aside[aria-label='Cart drawer'] {
          display: none !important;
        }
      `}</style>

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[rgba(45,45,45,0.62)] shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-md">
        <nav className="mx-auto flex w-full max-w-7xl flex-col items-start gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6 lg:px-8">
          <p
            className="text-base font-semibold uppercase tracking-[0.24em] text-white sm:text-lg md:text-xl"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            PLATFORMA
          </p>

          {isAuthenticated ? (
            <ul className="flex w-full flex-wrap items-center gap-x-5 gap-y-2 text-left sm:w-auto sm:justify-end sm:gap-7">
              <li>
                <button
                  type="button"
                  className={authNavActionClass}
                  onClick={() => navigate('/zesty')}
                >
                  Zesty
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={authNavActionClass}
                  onClick={() => navigate('/eventra')}
                >
                  Eventra
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={authNavActionClass}
                  onClick={handleDashboardClick}
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={authNavActionClass}
                  onClick={handleAccountClick}
                >
                  Hi, {user?.first_name || 'User'}
                </button>
              </li>
              <li>
                <a href="#" className={authNavActionClass}>
                  About
                </a>
              </li>
              <li>
                <a href="#" className={authNavActionClass}>
                  Contact
                </a>
              </li>
              <li>
                <button
                  type="button"
                  className={authNavActionClass}
                  onClick={() => {
                    void handleLogoutClick();
                  }}
                >
                  Logout
                </button>
              </li>
            </ul>
          ) : (
            <>
              <ul className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 text-left sm:w-auto sm:justify-center sm:gap-8">
                {navLinks.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <button
                        type="button"
                        className={link.className}
                        onClick={() => navigate(link.to)}
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a href={link.href} className={link.className}>
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="rounded-lg border border-white px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-white hover:text-[#111111]"
                onClick={() => navigate('/login')}
              >
                Sign In
              </button>
            </>
          )}
        </nav>
      </header>

      <section
        className="relative min-h-screen bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80')",
        }}
      >
        <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 pt-24 md:px-6 lg:px-8">
          <div className="w-full lg:w-3/5">
            <h1
              className="text-5xl font-bold leading-[0.95] text-white md:text-6xl lg:text-7xl"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              The Art of Hosting,
            </h1>
            <h2
              className="mt-2 text-5xl font-bold italic leading-[0.95] text-[#8a9a5b] md:text-6xl lg:text-7xl"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Delivered.
            </h2>

            <p className="mt-6 max-w-2xl text-base font-normal leading-relaxed text-white/70 md:text-lg">
              Exquisite culinary experiences and bespoke event coordination,
              seamlessly integrated for the modern host.
            </p>

            <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="w-full rounded-lg border border-white bg-transparent px-5 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-white hover:text-[#111111]"
                onClick={() => navigate('/zesty')}
              >
                Order Now
              </button>
              <button
                type="button"
                className="w-full rounded-lg border border-white bg-transparent px-5 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-white hover:text-[#111111]"
                onClick={() => navigate('/eventra')}
              >
                Plan Now
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fafaf7] px-4 py-16 text-[#111111] md:px-6 md:py-20 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="text-center">
            <h3
              className="text-3xl font-semibold leading-tight md:text-4xl"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Zesty &amp; Eventra: A Unified Experience
            </h3>
            <span className="mx-auto mt-4 block h-px w-10 bg-[#d4d4d1]" />
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <article
              className="relative h-[460px] overflow-hidden rounded-2xl shadow-[0_16px_34px_rgba(0,0,0,0.18)]"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.85)] to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
                  ZESTY DELIVERY
                </p>
                <h4 className="mt-2 text-3xl font-semibold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
                  Signature Culinary Delights
                </h4>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  Access our exclusive network of Michelin-star chefs and artisan kitchens.
                  We bring the restaurant table to your sanctuary.
                </p>
                <button
                  type="button"
                  className="mt-4 inline-block text-sm text-white underline underline-offset-4"
                  onClick={() => navigate('/zesty')}
                >
                  Browse Menus →
                </button>
              </div>
            </article>

            <article
              className="relative h-[460px] overflow-hidden rounded-2xl shadow-[0_16px_34px_rgba(0,0,0,0.18)]"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&q=80')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.85)] to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
                  EVENTRA PLANNING
                </p>
                <h4 className="mt-2 text-3xl font-semibold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
                  Curated Social Occasions
                </h4>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  From intimate soirees to grand galas. Our planners handle every detail,
                  so you can focus on the art of conversation.
                </p>
                <button
                  type="button"
                  className="mt-4 inline-block text-sm text-white underline underline-offset-4"
                  onClick={() => navigate('/eventra/events')}
                >
                  Start Planning
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#0f0f0f] px-4 py-16 md:px-6 md:py-20 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:auto-rows-[minmax(180px,auto)]">
            <article className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 md:col-span-6">
              <h5 className="text-2xl font-semibold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
                Chef&apos;s Selection
              </h5>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#9ca3af]">
                A weekly rotation of menus curated by the world&apos;s leading
                culinary artists.
              </p>

              <div className="my-8 flex items-center justify-center">
                <svg viewBox="0 0 96 96" className="h-16 w-16 text-[#6b7280]" fill="none" aria-hidden="true">
                  <path d="M24 20L72 76" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                  <path d="M72 20L24 76" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                  <path d="M18 24H32" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                  <path d="M64 72H78" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </div>

              <button type="button" className="text-sm text-[#9ca3af] underline underline-offset-4">
                View Weekly Special
              </button>
            </article>

            <article
              className="min-h-[360px] rounded-2xl border border-[#2a2a2a] bg-cover bg-center md:col-span-3 md:row-span-2"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80')",
              }}
            />

            <article className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 md:col-span-3">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#f3f4f6]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z" />
                <path d="M8.5 12l2.2 2.2L15.5 9.4" />
              </svg>
              <h5 className="mt-4 text-2xl font-semibold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
                Behind Every Plate
              </h5>
              <p className="mt-2 text-sm leading-relaxed text-[#9ca3af]">
                Our logistics chain is cold-pressed and climate-neutral.
                We prioritize sustainability as much as flavor.
              </p>
            </article>

            <article className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 md:col-span-3">
              <p className="text-sm font-semibold text-white">01. Discovery</p>
              <p className="mt-1 text-sm text-[#9ca3af]">We understand your vision.</p>

              <div className="mt-4" />

              <p className="text-sm font-semibold text-white">02. Curation</p>
              <p className="mt-1 text-sm text-[#9ca3af]">The finest details selected.</p>
            </article>

            <article
              className="relative min-h-[220px] overflow-hidden rounded-2xl border border-[#2a2a2a] md:col-span-3"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=600&q=80')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.86)] to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-center">
                <h5 className="text-2xl font-semibold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
                  Artisanal Mastery
                </h5>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
                  EXCLUSIVELY ON PLATFORMA
                </p>
              </div>
            </article>

            <article className="flex flex-col justify-center rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 md:col-span-3">
              <p className="text-sm text-white">Zero Waste Packaging</p>
              <p className="mt-3 text-sm text-white">Electric Fleet Delivery</p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#111111] px-4 py-16 md:px-6 md:py-20 lg:px-8">
        <div className="mx-auto w-full max-w-4xl text-center">
          <h3
            className="text-4xl font-semibold leading-tight text-white md:text-5xl"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            Ready to Elevate Your Next Evening?
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#9ca3af] md:text-base">
            Whether it&apos;s dinner for two or a gala for two hundred,
            Platforma makes hosting effortless.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              className="rounded-lg bg-[#8a9a5b] px-6 py-3 text-sm font-semibold text-[#0f172a]"
              onClick={() => navigate('/zesty')}
            >
              Get Started
            </button>
            <button
              type="button"
              className="rounded-lg border border-white bg-transparent px-6 py-3 text-sm font-semibold text-white"
              onClick={() => navigate('/eventra/events')}
            >
              Speak to an Expert
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-[#0d0d0d] px-4 pb-8 pt-14 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <p
                className="text-xs uppercase tracking-[0.32em] text-white"
                style={{ fontFamily: '"Playfair Display", serif' }}
              >
                Platforma
              </p>
              <p className="mt-4 text-sm leading-relaxed text-[#9ca3af]">
                Redefining hospitality through meticulous planning and exceptional
                culinary execution.
              </p>
            </div>

            <div>
              <h6 className="text-sm font-semibold text-white">Platform</h6>
              <ul className="mt-4 space-y-2 text-sm text-[#9ca3af]">
                <li>Zesty</li>
                <li>Eventra</li>
                <li>Chef Network</li>
              </ul>
            </div>

            <div>
              <h6 className="text-sm font-semibold text-white">Company</h6>
              <ul className="mt-4 space-y-2 text-sm text-[#9ca3af]">
                <li>About</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>

            <div>
              <h6 className="text-sm font-semibold text-white">Connect</h6>
              <ul className="mt-4 space-y-2 text-sm text-[#9ca3af]">
                <li>Instagram</li>
                <li>LinkedIn</li>
                <li>Newsletter Signup</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-[#1f2937] pt-5 text-center">
            <p className="text-xs text-[#6b7280]">© 2024 Platforma. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
