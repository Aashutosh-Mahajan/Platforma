import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Apple,
  Bolt,
  CalendarCheck2,
  ChevronDown,
  Globe2,
  Heart,
  Lightbulb,
  MapPin,
  Search,
  Smartphone,
  Star,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type SocialLink = {
  label: string;
  viewBox: string;
  path: string;
};

type LandingFeature = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type ExpansionStat = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type Testimonial = {
  quote: string;
  author: string;
  role: string;
  avatarSrc: string;
  avatarAlt: string;
};

const FEATURE_ITEMS: LandingFeature[] = [
  {
    title: 'Smart Discovery',
    description:
      'Explore the best spots for dining or entertainment without even looking yourself. Our AI suggests the highlights of your taste.',
    icon: Lightbulb,
  },
  {
    title: 'Easy Booking',
    description:
      'Seamless and straightforward reservations. Skip the line and secure your spot at the most sought-after venues instantly.',
    icon: CalendarCheck2,
  },
  {
    title: 'Personalized Feed',
    description:
      'Recommendations tailored to your taste. Discover hidden gems and trending hotspots curated just for you.',
    icon: Heart,
  },
];

const EXPANSION_STATS: ExpansionStat[] = [
  {
    title: 'Global Scale',
    description: 'Available in 185+ countries with seamless support',
    icon: Globe2,
  },
  {
    title: 'Real-time Data',
    description: 'Live availability for over 10k venues daily',
    icon: Bolt,
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "The personalized feed is scary accurate. It suggested a speakeasy I'd have never found on my own and it ended up being the highlight of my year.",
    author: 'Sarah Jenkins',
    role: 'Adventure Blogger',
    avatarSrc: '/platforma/sarah-jenkins.svg',
    avatarAlt: 'Portrait of Sarah Jenkins',
  },
  {
    quote:
      'Booking VIP festival tickets was usually a nightmare. Platforma made it a 30-second process. Literally a game changer.',
    author: 'Marcus Therro',
    role: 'Tech Journalist',
    avatarSrc: '/platforma/marcus-therro.svg',
    avatarAlt: 'Portrait of Marcus Therro',
  },
];

const FOOTER_GROUPS: Array<{ title: string; links: string[] }> = [
  {
    title: 'PLATFORMS',
    links: ['Platforma Web', 'iOS App', 'Android App', 'Pricing'],
  },
  {
    title: 'LEGAL',
    links: ['Privacy Policy', 'Terms of Service', 'Cookies', 'Compliance'],
  },
];

const CATEGORIES = ['Category', 'Fine Dining', 'Casual Dining', 'Concerts', 'Nightlife', 'Sports'];

const SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'Twitter',
    viewBox: '0 0 24 24',
    path: 'M22 5.8a7.9 7.9 0 0 1-2.3.7A3.9 3.9 0 0 0 21.4 4a7.8 7.8 0 0 1-2.5 1A3.9 3.9 0 0 0 12 7.6a11.1 11.1 0 0 1-8-4A3.9 3.9 0 0 0 5.1 9a3.8 3.8 0 0 1-1.8-.5v.1a3.9 3.9 0 0 0 3.1 3.8 4 4 0 0 1-1.8.1 3.9 3.9 0 0 0 3.6 2.7A7.9 7.9 0 0 1 3 17a11.1 11.1 0 0 0 6 1.8c7.2 0 11.2-6 11.2-11.2v-.5A8 8 0 0 0 22 5.8Z',
  },
  {
    label: 'Instagram',
    viewBox: '0 0 24 24',
    path: 'M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm8.2 2H8a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V8a4 4 0 0 0-4-4Zm-4 3.4A4.6 4.6 0 1 1 7.4 12 4.6 4.6 0 0 1 12 7.4Zm0 2A2.6 2.6 0 1 0 14.6 12 2.6 2.6 0 0 0 12 9.4Zm5.2-3a1.2 1.2 0 1 1-1.2 1.2 1.2 1.2 0 0 1 1.2-1.2Z',
  },
  {
    label: 'LinkedIn',
    viewBox: '0 0 24 24',
    path: 'M4.8 3A1.8 1.8 0 1 1 3 4.8 1.8 1.8 0 0 1 4.8 3ZM3.3 8h3V21h-3Zm5.5 0h2.8v1.8h.1a3 3 0 0 1 2.7-1.5c2.9 0 3.4 1.9 3.4 4.4V21h-3v-6.6c0-1.6 0-3.5-2.1-3.5s-2.5 1.7-2.5 3.4V21h-3Z',
  },
  {
    label: 'Facebook',
    viewBox: '0 0 24 24',
    path: 'M13.3 21v-7h2.4l.4-2.8h-2.8V9.4c0-.8.2-1.4 1.3-1.4h1.6V5.5A20.4 20.4 0 0 0 14 5c-2.3 0-3.8 1.4-3.8 4v2.2H8v2.8h2.2v7Z',
  },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [headerElevated, setHeaderElevated] = useState(false);
  const [heroParallax, setHeroParallax] = useState(0);
  const [activeNav, setActiveNav] = useState<'platforma' | 'explore'>('platforma');
  const [activeTab, setActiveTab] = useState<'Dining' | 'Events'>('Dining');
  const [category, setCategory] = useState('Category');
  const [locationInput, setLocationInput] = useState('');

  useEffect(() => {
    document.title = 'Explore The Best Food & Events | Platforma';

    const ensureMetaTag = (
      selector: string,
      attributeName: 'name' | 'property',
      attributeValue: string,
      content: string,
    ) => {
      let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attributeName, attributeValue);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    ensureMetaTag('meta[name="description"]', 'name', 'description', 'Discover premium dining and event experiences with Platforma. Book top venues, explore curated recommendations, and plan unforgettable outings.');
    ensureMetaTag('meta[property="og:title"]', 'property', 'og:title', 'Explore The Best Food & Events | Platforma');
    ensureMetaTag('meta[property="og:description"]', 'property', 'og:description', 'Discover premium dining and event experiences with Platforma.');
    ensureMetaTag('meta[property="og:image"]', 'property', 'og:image', 'http://localhost:3000/platforma/hero-bg.svg');
    ensureMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    ensureMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', 'Explore The Best Food & Events | Platforma');
    ensureMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', 'Discover premium dining and event experiences with Platforma.');

    let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = 'http://localhost:3000/';
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const currentScroll = window.scrollY;
      setHeaderElevated(currentScroll > 50);
      setHeroParallax(Math.min(currentScroll * 0.05, 80));

      const exploreSection = document.getElementById('explore');
      if (exploreSection && currentScroll + 120 >= exploreSection.offsetTop) {
        setActiveNav('explore');
      } else {
        setActiveNav('platforma');
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    window.scrollTo({
      top: section.offsetTop - 80,
      behavior: 'smooth',
    });
  };

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (locationInput.trim()) {
      params.set('search', locationInput.trim());
    }

    if (category !== 'Category') {
      if (activeTab === 'Dining') {
        params.set('cuisine_tag', category.toLowerCase());
      } else {
        params.set('category', category.toLowerCase());
      }
    }

    const query = params.toString();
    if (activeTab === 'Dining') {
      navigate(query ? `/zesty/restaurants?${query}` : '/zesty/restaurants');
      return;
    }

    navigate(query ? `/eventra/events?${query}` : '/eventra/events');
  };

  return (
    <div className="theme-platforma min-h-screen bg-white text-[#1A202C]">
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      <header
        className={`fixed inset-x-0 top-0 z-[100] h-16 border-b border-[#E5E7EB] bg-white transition-shadow duration-300 ${
          headerElevated ? 'shadow-[0_4px_6px_rgba(0,0,0,0.07)]' : 'shadow-none'
        }`}
      >
        <nav
          className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-12"
          aria-label="Primary"
        >
          <button
            type="button"
            aria-label="Platforma home"
            onClick={() => {
              scrollToSection('hero');
              setActiveNav('platforma');
            }}
            className="mr-10 inline-flex items-center gap-3 transition-opacity duration-150 hover:opacity-80"
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="10" fill="url(#platformaLogoGradient)" />
              <path d="M9 21.5L16 8L23 21.5H19.7L16 14.2L12.3 21.5H9Z" fill="white" />
              <defs>
                <linearGradient id="platformaLogoGradient" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0066FF" />
                  <stop offset="1" stopColor="#0052CC" />
                </linearGradient>
              </defs>
            </svg>
            <span className="font-platforma-display text-[22px] font-bold tracking-tight text-[#1A202C]">Platforma</span>
          </button>

          <div className="flex items-center gap-10">
            <button
              type="button"
              onClick={() => {
                scrollToSection('hero');
                setActiveNav('platforma');
              }}
              className={`platforma-nav-link text-base font-medium ${activeNav === 'platforma' ? 'platforma-nav-link-active' : ''}`}
            >
              Platforma
            </button>
            <button
              type="button"
              onClick={() => {
                scrollToSection('explore');
                setActiveNav('explore');
              }}
              className={`platforma-nav-link text-base font-medium ${activeNav === 'explore' ? 'platforma-nav-link-active' : ''}`}
            >
              Explore
            </button>
            <button
              type="button"
              onClick={() => navigate('/eventra/events')}
              className="platforma-nav-link text-base font-medium"
            >
              Events
            </button>
          </div>

          <div className="flex items-center gap-4" aria-label="Utility actions">
            <button
              type="button"
              aria-label="Search"
              onClick={() => scrollToSection('hero')}
              className="rounded-full p-2 text-[#1A202C] transition duration-150 hover:scale-105 hover:opacity-70"
            >
              <Search className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Open user menu"
              onClick={() => navigate('/profile')}
              className="rounded-full p-2 text-[#1A202C] transition duration-150 hover:scale-105 hover:opacity-70"
            >
              <User className="h-6 w-6" />
            </button>
          </div>
        </nav>
      </header>

      <main id="main-content" className="pt-16">
        <div className="xl:hidden flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#F7F8FC] px-6 text-center">
          <div className="max-w-xl rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-[0_10px_15px_rgba(0,0,0,0.1)]">
            <h1 className="font-platforma-display text-3xl font-bold text-[#1A202C]">Desktop Experience</h1>
            <p className="mt-4 text-base leading-7 text-[#667084]">
              This landing page is optimized for desktop displays from 1200px and above, as requested.
            </p>
          </div>
        </div>

        <div className="hidden xl:block">
          <section id="hero" className="relative isolate min-h-screen overflow-hidden px-12 py-20" aria-labelledby="platforma-hero-heading">
            <div
              className="absolute inset-0 z-[-2] bg-cover bg-center"
              style={{
                backgroundImage: "url('/platforma/hero-bg.svg')",
                transform: `translateY(-${heroParallax}px) scale(1.06)`,
              }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 z-[-1] bg-[linear-gradient(to_right,rgba(255,255,255,0.88),rgba(255,255,255,0.72))]"
              aria-hidden="true"
            />

            <div className="mx-auto grid max-w-[1400px] grid-cols-[55%_45%] items-center gap-10">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="mb-6 inline-flex rounded-full bg-[rgba(0,102,255,0.1)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#0066FF]"
                >
                  Discover world&apos;s best food
                </motion.div>

                <motion.h1
                  id="platforma-hero-heading"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
                  className="font-platforma-display text-[48px] font-bold leading-[1.2] text-[#1A202C]"
                >
                  Explore The Best
                </motion.h1>

                <motion.h2
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
                  className="font-platforma-display mb-6 bg-[linear-gradient(135deg,#0066FF_0%,#00D4FF_100%)] bg-clip-text text-[48px] font-bold italic leading-[1.2] text-transparent"
                >
                  Food &amp; Events
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
                  className="max-w-[480px] text-base leading-[1.6] text-[#667084]"
                >
                  Discover the most exclusive live performances from underground jazz clubs to stadium anthems. Curated for the modern connoisseur.
                </motion.p>

                <motion.form
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
                  className="mt-8 flex h-14 items-center rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-[0_4px_6px_rgba(0,0,0,0.07)] transition-shadow duration-300 hover:shadow-[0_10px_15px_rgba(0,0,0,0.1)]"
                  role="search"
                  aria-label="Find dining and events"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSearch();
                  }}
                >
                  <div className="flex items-center rounded-lg bg-[#F7F8FC] p-1">
                    {(['Dining', 'Events'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                          activeTab === tab
                            ? 'text-[#0066FF] underline decoration-2 underline-offset-8'
                            : 'text-[#667084] hover:bg-[#EBEEF5]'
                        }`}
                        aria-pressed={activeTab === tab}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="mx-4 h-10 w-px bg-[#E5E7EB]" aria-hidden="true" />

                  <label htmlFor="platforma-category" className="flex items-center gap-1 pr-4 text-sm text-[#667084]">
                    <span className="sr-only">Category</span>
                    <select
                      id="platforma-category"
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="cursor-pointer appearance-none border-none bg-transparent pl-1 pr-6 text-sm text-[#667084] focus:outline-none"
                      aria-label="Category"
                    >
                      {CATEGORIES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none -ml-5 h-4 w-4 text-[#667084]" aria-hidden="true" />
                  </label>

                  <div className="mx-2 h-10 w-px bg-[#E5E7EB]" aria-hidden="true" />

                  <label htmlFor="platforma-location" className="flex flex-1 items-center gap-2 rounded-md px-3 py-2 focus-within:bg-[#F7F8FC]">
                    <MapPin className="h-4 w-4 text-[#667084]" aria-hidden="true" />
                    <span className="sr-only">Location</span>
                    <input
                      id="platforma-location"
                      type="text"
                      value={locationInput}
                      onChange={(event) => setLocationInput(event.target.value)}
                      placeholder="Add location"
                      className="w-full border-none bg-transparent text-sm text-[#1A202C] placeholder:text-[#667084] focus:outline-none"
                    />
                  </label>

                  <button
                    type="submit"
                    className="ml-2 rounded-lg bg-[linear-gradient(135deg,#0066FF_0%,#0052CC_100%)] px-6 py-3 text-sm font-semibold tracking-wide text-white transition duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
                  >
                    SEARCH
                  </button>
                </motion.form>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                className="flex items-center justify-center"
              >
                <div className="relative h-[520px] w-full">
                  <div className="absolute right-4 top-6 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(0,102,255,0.35),rgba(15,163,177,0.22),rgba(255,255,255,0.06))] blur-[1px]" />
                  <div className="absolute bottom-10 left-12 h-[260px] w-[260px] rounded-[36px] border border-white/40 bg-white/40 backdrop-blur-md" />
                  <div className="absolute bottom-24 left-24 h-[260px] w-[260px] rounded-[36px] border border-[#0066FF]/20 bg-[linear-gradient(135deg,rgba(0,102,255,0.18),rgba(15,163,177,0.28))] shadow-[0_20px_25px_rgba(0,0,0,0.1)]" />
                </div>
              </motion.div>
            </div>
          </section>

          <section id="explore" className="bg-[#F7F8FC] px-12 py-20" aria-labelledby="feature-section-heading">
            <div className="mx-auto max-w-[1400px]">
              <h2 id="feature-section-heading" className="sr-only">
                Platforma feature highlights
              </h2>
              <div className="grid grid-cols-3 gap-6">
                {FEATURE_ITEMS.map((feature, index) => {
                  const Icon = feature.icon;

                  return (
                    <motion.article
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.8 }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.15 }}
                      className="group flex min-h-[320px] cursor-pointer flex-col rounded-xl border border-white/10 bg-[#1A202C] px-6 py-8 transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:scale-[1.04] hover:shadow-[0_20px_25px_rgba(0,102,255,0.15)]"
                    >
                      <Icon className="mb-6 h-12 w-12 text-[#0066FF]" aria-hidden="true" />
                      <h3 className="font-platforma-display mb-3 text-2xl font-bold leading-[1.2] text-white">{feature.title}</h3>
                      <p className="flex-1 text-sm leading-[1.6] text-[#D0D5DD]">{feature.description}</p>
                    </motion.article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="bg-white px-12 py-20" aria-labelledby="global-expansion-heading">
            <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-16">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.65 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative h-[400px] overflow-hidden rounded-2xl shadow-[0_20px_25px_rgba(0,0,0,0.1)]"
              >
                <img
                  src="/platforma/world-map.svg"
                  alt="Global world map with connected destination points"
                  className="h-full w-full object-cover"
                />

                <div className="platforma-float absolute left-10 top-10 rounded-xl bg-white/95 px-5 py-4 shadow-[0_10px_15px_rgba(0,0,0,0.1)] backdrop-blur-md">
                  <div className="font-platforma-display text-[28px] font-bold leading-none text-[#1A202C]">185+</div>
                  <div className="mt-1 text-xs tracking-[0.1em] text-[#667084]">DESTINATIONS</div>
                </div>

                <div className="platforma-float-reverse absolute bottom-10 left-10 rounded-xl bg-white/95 px-5 py-4 shadow-[0_10px_15px_rgba(0,0,0,0.1)] backdrop-blur-md">
                  <div className="font-platforma-display text-[28px] font-bold leading-none text-[#1A202C]">4.9/5</div>
                  <div className="mt-1 text-xs tracking-[0.1em] text-[#667084]">RATING</div>
                </div>
              </motion.div>

              <div>
                <motion.h2
                  id="global-expansion-heading"
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="font-platforma-display mb-4 text-[36px] font-bold leading-[1.2] text-[#1A202C]"
                >
                  Expanding the Social Horizon Globally.
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                  className="max-w-[420px] text-base leading-[1.6] text-[#667084]"
                >
                  From the bustling streets of Tokyo to the jazz clubs of New Orleans, Platforma connects millions of explorers to their next unforgettable experience.
                </motion.p>

                <div className="mt-10 grid grid-cols-2 gap-6">
                  {EXPANSION_STATS.map((stat, index) => {
                    const Icon = stat.icon;

                    return (
                      <motion.article
                        key={stat.title}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.65 }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.12 + index * 0.1 }}
                        className="rounded-xl border border-[#E5E7EB] bg-[#F7F8FC] p-6"
                      >
                        <Icon className="mb-3 h-8 w-8 text-[#0066FF]" aria-hidden="true" />
                        <h3 className="mb-2 text-sm font-semibold text-[#1A202C]">{stat.title}</h3>
                        <p className="text-[13px] leading-[1.5] text-[#667084]">{stat.description}</p>
                      </motion.article>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white px-12 py-20" aria-labelledby="testimonial-heading">
            <div className="mx-auto max-w-[1200px] text-center">
              <h2 id="testimonial-heading" className="font-platforma-display mb-3 text-[36px] font-bold leading-[1.2] text-[#1A202C]">
                Trusted by Explorers
              </h2>
              <p className="mx-auto mb-14 max-w-[600px] text-base leading-[1.6] text-[#667084]">
                See why thousands of travelers and event-goers choose Platforma for their next adventure.
              </p>

              <div className="grid grid-cols-2 gap-8 text-left">
                {TESTIMONIALS.map((testimonial, index) => (
                  <motion.article
                    key={testimonial.author}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.15 }}
                    className="flex min-h-[280px] flex-col rounded-xl border border-[#E5E7EB] bg-white p-8 transition-shadow duration-300 hover:shadow-[0_10px_15px_rgba(0,0,0,0.1)]"
                  >
                    <div className="mb-4 flex items-center gap-1" aria-label="5 star rating">
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Star key={`${testimonial.author}-star-${starIndex}`} className="h-4 w-4 fill-[#FDB022] text-[#FDB022]" />
                      ))}
                    </div>

                    <blockquote className="flex-1 text-base italic leading-[1.6] text-[#1A202C]">
                      &ldquo;{testimonial.quote}&rdquo;
                    </blockquote>

                    <div className="mt-6 flex items-center gap-3 border-t border-[#E5E7EB] pt-6">
                      <img
                        src={testimonial.avatarSrc}
                        alt={testimonial.avatarAlt}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#1A202C]">{testimonial.author}</p>
                        <p className="text-xs text-[#667084]">{testimonial.role}</p>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mx-auto my-20 max-w-[900px] rounded-[20px] bg-[linear-gradient(135deg,#0066FF_0%,#004FB3_100%)] bg-fixed px-12 py-16 text-center shadow-[0_20px_25px_rgba(0,102,255,0.2)]"
            aria-labelledby="cta-heading"
          >
            <h2 id="cta-heading" className="font-platforma-display mb-4 text-[36px] font-bold leading-[1.2] text-white">
              Ready to Start Your Journey?
            </h2>
            <p className="mx-auto mb-10 max-w-[600px] text-base leading-[1.6] text-white/90">
              Join 2M+ users and discover the world&apos;s most exclusive dining and event experiences in your fingertips.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-white px-7 py-3.5 text-sm font-semibold text-[#0066FF] shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-[0_10px_15px_rgba(0,0,0,0.2)] active:scale-[0.98]"
              >
                <Apple className="h-4 w-4" />
                Download for iOS
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-white bg-transparent px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-[0_10px_15px_rgba(0,0,0,0.2)] active:scale-[0.98]"
              >
                <Smartphone className="h-4 w-4" />
                PLAY_INSTALLED Android App
              </button>
            </div>
          </motion.section>

          <footer className="border-t border-white/10 bg-[#1A202C] px-12 pb-8 pt-16 text-[#D0D5DD]">
            <div className="mx-auto max-w-[1400px]">
              <div className="mb-12 grid grid-cols-4 gap-12">
                <div>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                    <rect width="32" height="32" rx="10" fill="url(#platformaFooterLogoGradient)" />
                    <path d="M9 21.5L16 8L23 21.5H19.7L16 14.2L12.3 21.5H9Z" fill="white" />
                    <defs>
                      <linearGradient id="platformaFooterLogoGradient" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#0066FF" />
                        <stop offset="1" stopColor="#00D4FF" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <p className="mt-3 max-w-[280px] text-sm leading-[1.6] text-[#9CA3AF]">
                    Redefining how you discover travel, entertainment, and culinary experiences around the globe.
                  </p>
                </div>

                {FOOTER_GROUPS.map((group) => (
                  <div key={group.title}>
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white">{group.title}</h3>
                    <ul className="space-y-2.5 text-sm">
                      {group.links.map((linkText) => (
                        <li key={linkText}>
                          <a href="#" className="transition-colors duration-200 hover:text-[#0066FF] hover:underline">
                            {linkText}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                <div>
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white">CONNECT</h3>
                  <div className="flex items-center gap-4">
                    {SOCIAL_LINKS.map(({ label, path, viewBox }) => (
                      <a
                        key={label}
                        href="#"
                        aria-label={label}
                        className="text-[#9CA3AF] transition-all duration-200 hover:scale-110 hover:text-[#0066FF]"
                      >
                        <svg viewBox={viewBox} className="h-5 w-5 fill-current" aria-hidden="true">
                          <path d={path} />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-8 text-[13px] text-[#6B7280]">
                <p>© 2024 Platforma. All rights reserved.</p>
                <div className="flex items-center gap-8">
                  {['Sitemap', 'RSS Feed', 'Accessibility'].map((linkText) => (
                    <a key={linkText} href="#" className="transition-colors duration-200 hover:text-[#0066FF]">
                      {linkText}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
