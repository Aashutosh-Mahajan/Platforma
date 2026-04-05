'use client';

import React, { useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* ─── MOCK DATA (from UI design) ─── */
const APP_CONTENT = {
  header: {
    title: 'Zesty',
    navLinks: ['Add restaurant', 'Log in', 'Sign up'],
  },
  hero: {
    title: 'Zesty',
    subtitle: "India's #1 food delivery app",
  },
  stats: {
    title: 'Better food for\nmore people',
    description:
      "For over a decade, we've enabled our customers to discover new tastes, delivered right to their doorstep",
    images: {
      burger:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA6QtA4EE05XvCQSJo3vUy3JmlextZMRID77kFFM67y_dZvi3tljFU1uiv36NMOohVswrm1Hfsk6cT7ZRq7tlBOZqnTh96V4Okj0URNu-LPknIT04qC3E_Rru5Fu0c7Z-AGSJLyuIBjOgq3MOoPGImBU5zJW3SHIkUSMq5omJq34laTQCPuNQiYCaHfUp3MaJ7P6qSQiSsGjQwWBP2TomshpjJJaYYImDdIRPCt0F7_GlndQRRjugVoyNu81I0SLTnlHXphnHOfHA',
      sushi:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAOzmnpeUgKXh1rHSiAoc1lGmIANdTAGuuUvm4DvpoA9i_9jwuFalX2FwLFNc2561SXB3XIPVAqvbYQQGsosBWdxDOTs0juvSAsxV7Rxtd3OD-_Te1-vmYGU5uzx7HH0bnjGS3TAL7uaXyiiJKaVK9MhuAxsa47eSCK86B00PjdqfNVRU_1EVp0NmR049KHK7Q6k6PM2kIT19T-J-Lxa7s1G1IUJyWCG3HCq7XR_dfSBCxl6N4A60wI_ROzdK4NsL23VlIsq97Bjg',
    },
    metrics: [
      { value: '3,00,000+', label: 'restaurants' },
      { value: '800+', label: 'cities' },
      { value: '3 billion+', label: 'orders delivered' },
    ],
  },
  categories: [
    {
      title: 'Order Online',
      description: 'Stay home and order to your doorstep',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA6QtA4EE05XvCQSJo3vUy3JmlextZMRID77kFFM67y_dZvi3tljFU1uiv36NMOohVswrm1Hfsk6cT7ZRq7tlBOZqnTh96V4Okj0URNu-LPknIT04qC3E_Rru5Fu0c7Z-AGSJLyuIBjOgq3MOoPGImBU5zJW3SHIkUSMq5omJq34laTQCPuNQiYCaHfUp3MaJ7P6qSQiSsGjQwWBP2TomshpjJJaYYImDdIRPCt0F7_GlndQRRjugVoyNu81I0SLTnlHXphnHOfHA',
    },
    {
      title: 'Dining',
      description: "View the city's favourite dining venues",
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDHqrFRhipIgypWnjmP-ZGj6DWJ1lQqc6XupdJ2XXYj67SzbApqvcmY_8uWdfES2AZJzToVBVKQTRmd1FVOiEgZzQRPT080zVCHZ-hjBddLvfdDQtoOkEmlfjmLeVM5Og1c4aMazT1mbrxFeXjobJlUeiAtF_ZCUi5VJWJFJmg8UkbtHa1l-Xih4ECwtT9X5tZECORdD83PvK0BUX11MXvJvS0FY56ejx2XlFCWDN6kBBoGPcHgB_9hcA3Xb8uBZT7vU_jrSsRimg',
    },
    {
      title: 'Nightlife',
      description: "Explore the city's top nightlife spots",
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCA4qJ9U5ojPE1ytAauzTDmsgWLTscvyabqEpOYEmTD_B88ZUwQ3WbwW5k-I72-8AwV1EOhODT60Iekcuq5UnbDdyVY121-KrBaUR8FxUX-ZKeBqNnnKTGVH0fyxE-x-03f8C4pv1fZfnwVozH50UOLiKzXGJQXLltcDmzZSgXUzWvsYF2M1sgZuZVHIZTENl07yT7jF8UioSQhc7zFUjIhph1QBC59i2sZvHC__WlQb5_CqmuqYqgywpOA3NrxO3I-ZhCcxPBuYQ',
    },
  ],
  collections: {
    title: 'Collections',
    description:
      'Explore curated lists of top restaurants, cafes, pubs, and bars in Mumbai, based on trends',
    items: [
      {
        title: 'Newly Opened',
        places: '18 Places',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAOzmnpeUgKXh1rHSiAoc1lGmIANdTAGuuUvm4DvpoA9i_9jwuFalX2FwLFNc2561SXB3XIPVAqvbYQQGsosBWdxDOTs0juvSAsxV7Rxtd3OD-_Te1-vmYGU5uzx7HH0bnjGS3TAL7uaXyiiJKaVK9MhuAxsa47eSCK86B00PjdqfNVRU_1EVp0NmR049KHK7Q6k6PM2kIT19T-J-Lxa7s1G1IUJyWCG3HCq7XR_dfSBCxl6N4A60wI_ROzdK4NsL23VlIsq97Bjg',
      },
      {
        title: 'Trending this week',
        places: '30 Places',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAQVPgiJWYOD1aEBZlCclBtwiXVLECDppuWKTjXPTftaVGMzPR7-HuHia3aY3C5pjgXrgza0lzqsVKduC6b2VuGdzHgQNirB4vLwOLWoc-IwBoEgEyfIJstLj3Csuu6zn4uxTH6oLuGrztaio0JPyotwqza9s5xi1a7FhqgF8z01gTPqpg--nyw5CZUE3uPVhqSxXsfCu06Ln10Kh7OH5ZcQWej3CsSwCkYgkjs4sJqhf43yzCkS2TZHNritQbtAlTCmPw0Tt0b_A',
      },
      {
        title: 'Best of Mumbai',
        places: '25 Places',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBXcCXKS7Wdupu4oLbZpby5ltmtHN5R1ikv7h-9_9L7-LfGGUAaydhqOLIvaHPStUL-06yp6XfhSSCTd2TktfihgJp6HrBR92NDK_xuyVc9HuL5FaFCyRR-u1wm_jgVUAq9tB3OEUR14FvUoqLljGNlSNlySziI_gUv6ZDos4L0DLtmgTRqL7Q1AjL8xeBqqVC-h42H6GLu_csKXWopEAunHN4CQPV9oARDP2cnn0Ve5KRU1hjyddqgrkdL6QlqDtN6FWgqXTsa7g',
      },
      {
        title: 'Rooftop Views',
        places: '12 Places',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBHlzdFh0RILGAgH_gOIwmIF5Vz4gbbRCR3skrZldXsDOGpUoHd9XfJWG7HMyH9_kbHRK8I2bzWf5BcRYFbsOIzWG-bR3a2IaJqp3q-6QFtfgyh3AaEHs8wEimeQW0gmAsNln0Yj6YkGRsPO9CHIXdd2Xoz5E-Drkf-9dvCT4RbuH8b6HsyGPXezDEJ-ig7sI4f58m9xfWkWtQlSWkmGVULLqR2azzcNILs5Z_TjxfsLtMS0f9tnKFuY-YMbmbghK2_3jStIlkxbg',
      },
    ],
  },
  experience: {
    eyebrow: 'The Zesty Experience',
    title: "What's waiting for you on the app?",
    description:
      'Discover personalized recommendations, live order tracking, and exclusive discounts from over 50,000 restaurants across India.',
    features: [
      {
        title: 'Lightning Fast Delivery',
        description: 'Get your food delivered in under 30 minutes, every single time.',
        icon: 'speed',
      },
      {
        title: 'Exclusive Zesty Pro Deals',
        description: 'Save up to 40% on every order with our premium membership.',
        icon: 'loyalty',
      },
    ],
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCcwUWT5s-Eg59xM8lRUKXzZKEJ_XDFP1mj-NlbHvU2OeNv8xxzV_G9U8yeU5QDuRYHpl9dlHv9zj-WS45pmm8Sd_VGgwtJfR7YQOwg4_UX_0HhQUSScfsg8NejwFl8JU086o1yJ2iSML6D5NlfGvSuqRbP5w7kJTFECZqy7jlWNtV5JWU6KdXvPWHskLD7XN3EssGALkEVz67X6CzF6z8yy-dy3bVb9v2eOBUuEKF8ddaxSd5RDtv_HiiA7Ep11nY4EEgWEQnt4w',
  },
  download: {
    title: 'Get the Zesty app',
    description: 'We will send you a link, open it on your phone to download the app',
    appStoreImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAHfxAmLNX8Yjln6BdyEAPfLIkOpU9nQwNqoT1WvxSteW_6vRCMEKTEIr6NE09ePm7A8EImAOD2t5OYJTm9VWdb_QZGRvsLvJviSWkZN5MIY1e5gRvKcNXHgGu-ioeHpS2TqgHnwSzquISSXZTb4gsAydC53IfwNLl3NU_r_PPAZ8JRTfHStGH9TzkClUwGJmNj5s9eFX3tfAyeD1-tAYAn0o0_X1oOCZ-eNL6ppXJNRy46_QEuSOLowOxrj2dLF-GzVK5GWXaxAg',
    playStoreImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBTdQx1rVnpUoSovCp3oHbXl2RuNA0KBAQl7Xg_h32baQK2GQ-H-GWlIZsVaYF9jMPpm7K5Ev9tK53s8v1BYBG2uJRE6TOUO4e4e73atq_zcO87WiW3ApS6CG3UE-A9hBYRCDienVXwLAW4DWh3vM3zIENL4co2FoqpwpkClRpNfQY9lDhWyKJz7kWRUdLenO2erfoSO3gm3YFgCrin2i9_Z68sZGtfHNNpO8a8s5XolmBKU3BX1lteoDp9hM0JmMRnhc6DnmF5jQ',
  },
  footer: {
    title: 'Zesty',
    tagline: 'Experience the art of food delivery.',
    copyright: '© 2024 Zesty Technologies Ltd. All rights reserved.',
    links: {
      Company: ['About Zesty', 'Partner With Us', 'Apps For You'],
      Legal: ['Privacy Policy', 'Terms of Service'],
      Contact: ['support@zesty.com', '1800-ZESTY-APP'],
    } as Record<string, string[]>,
  },
};

/* ─── Design Tokens ─── */
const Z = {
  primary: '#b7122a',
  primaryContainer: '#db313f',
  onPrimary: '#ffffff',
  surface: '#fcf9f8',
  surfaceContainer: '#f0eded',
  surfaceContainerLow: '#f6f3f2',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHighest: '#e5e2e1',
  onSurface: '#1b1b1b',
  onSurfaceVariant: '#5b403f',
  surfaceTint: '#bb162c',
  font: "'Lexend', sans-serif",
};

/* ═══════════════════════════════════════════════════════════════
   ZESTY LANDING PAGE — Full redesign matching UI Design folder
   ═══════════════════════════════════════════════════════════════ */

function ZestyPageContent() {
  const { setTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  useEffect(() => { setTheme('zesty'); }, [setTheme]);

  const handleSwitchToEventra = () => {
    setTheme('eventra');
    router.push('/eventra');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div style={{ fontFamily: Z.font, background: Z.surface, color: Z.onSurface, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── HERO SECTION ── */}
      <section
        id="zesty-hero"
        style={{
          position: 'relative',
          height: '665px',
          minHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 24px',
          background:
            'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuA6QtA4EE05XvCQSJo3vUy3JmlextZMRID77kFFM67y_dZvi3tljFU1uiv36NMOohVswrm1Hfsk6cT7ZRq7tlBOZqnTh96V4Okj0URNu-LPknIT04qC3E_Rru5Fu0c7Z-AGSJLyuIBjOgq3MOoPGImBU5zJW3SHIkUSMq5omJq34laTQCPuNQiYCaHfUp3MaJ7P6qSQiSsGjQwWBP2TomshpjJJaYYImDdIRPCt0F7_GlndQRRjugVoyNu81I0SLTnlHXphnHOfHA")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Top Nav */}
        <header
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            zIndex: 50,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 32px',
            maxWidth: '1280px',
            margin: '0 auto',
            right: 0,
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: '30px', fontWeight: 900, color: 'white', fontStyle: 'italic', letterSpacing: '-0.5px', cursor: 'pointer' }}>
              {APP_CONTENT.header.title}
            </div>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Zesty / Eventra Switcher Pill */}
            <button
              onClick={handleSwitchToEventra}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '4px',
                borderRadius: '50px',
                cursor: 'pointer',
                backdropFilter: 'blur(16px)',
                width: '170px',
                height: '40px',
                justifyContent: 'space-between',
                outline: 'none',
              }}
            >
              <div style={{
                position: 'absolute', top: '4px', left: '4px', bottom: '4px',
                width: '78px', borderRadius: '40px',
                background: 'linear-gradient(135deg, #b7122a, #db313f)',
                boxShadow: '0 0 12px rgba(183, 18, 42, 0.5)',
                zIndex: 0,
              }} />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '50%', color: '#fff' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '4px' }}>🍕 ZESTY</span>
              </div>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '50%', color: 'rgba(255,255,255,0.6)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '4px' }}>🎭 EVENTRA</span>
              </div>
            </button>

            <a
              href="#"
              style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s', fontSize: '15px' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fecaca')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
            >
              Add restaurant
            </a>

            {isAuthenticated ? (
              <>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: '15px' }}>
                  Hi, {user?.first_name || 'User'}
                </span>
                <button
                  onClick={() => void handleLogout()}
                  style={{
                    color: 'white', fontWeight: 600, fontSize: '14px',
                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '24px', padding: '8px 20px', cursor: 'pointer',
                    backdropFilter: 'blur(10px)', transition: 'background 0.2s',
                    fontFamily: Z.font,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s', fontSize: '15px' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fecaca')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  style={{
                    color: 'white', fontWeight: 600, fontSize: '14px',
                    background: Z.primary, border: 'none',
                    borderRadius: '24px', padding: '8px 20px', textDecoration: 'none',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = Z.surfaceTint)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = Z.primary)}
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </header>

        {/* Hero Content */}
        <div style={{ maxWidth: '896px', width: '100%' }}>
          <h1
            style={{
              color: 'white',
              fontSize: 'clamp(48px, 7vw, 72px)',
              fontWeight: 900,
              fontStyle: 'italic',
              marginBottom: '16px',
              letterSpacing: '-2px',
            }}
          >
            {APP_CONTENT.hero.title}
          </h1>
          <p
            style={{
              color: 'white',
              fontSize: 'clamp(20px, 3vw, 30px)',
              fontWeight: 500,
              marginBottom: '48px',
              opacity: 0.95,
            }}
          >
            {APP_CONTENT.hero.subtitle}
          </p>

          {/* Glassmorphism Search Bar */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              padding: '8px',
              borderRadius: '16px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px',
              maxWidth: '768px',
              margin: '0 auto',
              boxShadow: '0px 20px 40px rgba(27, 27, 27, 0.06)',
            }}
          >
            {/* Location Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'white',
                borderRadius: '12px',
                flex: 1,
                padding: '12px 16px',
                minWidth: '180px',
              }}
            >
              <span className="material-symbols-outlined" style={{ color: Z.primary, marginRight: '8px', fontSize: '20px' }}>
                location_on
              </span>
              <input
                type="text"
                placeholder="Mumbai, Maharashtra"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: Z.onSurface,
                  width: '100%',
                  fontWeight: 500,
                  outline: 'none',
                  fontFamily: Z.font,
                  fontSize: '14px',
                }}
              />
              <span className="material-symbols-outlined" style={{ color: '#5f5e5e', marginLeft: '8px', fontSize: '20px' }}>
                arrow_drop_down
              </span>
            </div>

            <div style={{ height: '32px', width: '1px', background: 'rgba(255,255,255,0.2)' }} />

            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'white',
                borderRadius: '12px',
                flex: 2,
                padding: '12px 16px',
                minWidth: '250px',
              }}
            >
              <span className="material-symbols-outlined" style={{ color: '#5f5e5e', marginRight: '8px', fontSize: '20px' }}>
                search
              </span>
              <input
                type="text"
                placeholder="Search for restaurant, cuisine or a dish"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: Z.onSurface,
                  width: '100%',
                  fontWeight: 500,
                  outline: 'none',
                  fontFamily: Z.font,
                  fontSize: '14px',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS SECTION (Better food for more people) ── */}
      <section
        style={{
          position: 'relative',
          background: 'white',
          padding: '80px 32px',
          overflow: 'hidden',
          minHeight: '500px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Decorative SVG lines */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.6 }}
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M-100,250 C150,100 300,600 500,400 C700,200 850,550 1100,350" fill="none" stroke="#fca5a5" strokeWidth="1" />
          <path d="M-50,450 C200,650 400,-100 600,100 C800,300 950,-50 1200,150" fill="none" stroke="#fca5a5" strokeWidth="1" />
          <circle cx="80" cy="150" r="3" fill="#ef4444" opacity="0.3" />
          <circle cx="900" cy="450" r="4" fill="#ef4444" opacity="0.4" />
        </svg>

        {/* Floating food images */}
        <div style={{ position: 'absolute', top: '35%', left: '10%', transform: 'translateY(-50%)' }}>
          <img
            alt="Burger"
            style={{ width: '180px', height: '180px', objectFit: 'contain', filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.15))' }}
            src={APP_CONTENT.stats.images.burger}
          />
        </div>
        <div style={{ position: 'absolute', top: '25%', right: '10%', transform: 'translateY(-50%)' }}>
          <img
            alt="Sushi"
            style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '50%', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
            src={APP_CONTENT.stats.images.sushi}
          />
        </div>

        {/* Decorative food particles */}
        <div style={{ position: 'absolute', top: '10%', right: '30%', width: '32px', height: '32px', borderRadius: '50%', border: '4px solid #ef4444', background: '#f87171', opacity: 0.9, filter: 'blur(0.5px)' }} />
        <div style={{ position: 'absolute', bottom: '35%', left: '25%', width: '24px', height: '24px', borderRadius: '50%', border: '3px solid #ef4444', background: '#f87171', opacity: 0.9, transform: 'scaleX(0.9) rotate(45deg)' }} />
        <div style={{ position: 'absolute', top: '10%', left: '30%', width: '24px', height: '24px', borderTopLeftRadius: '100%', borderBottomRightRadius: '100%', background: '#22c55e', opacity: 0.8, transform: 'rotate(12deg)' }} />

        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '640px', margin: '0 auto 80px' }}>
          <h2
            style={{
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 900,
              color: '#f0515f',
              marginBottom: '24px',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              whiteSpace: 'pre-line',
            }}
          >
            {APP_CONTENT.stats.title}
          </h2>
          <p style={{ color: '#6b7280', fontSize: '18px', fontWeight: 500, lineHeight: 1.7, maxWidth: '400px', margin: '0 auto' }}>
            {APP_CONTENT.stats.description}
          </p>
        </div>

        {/* Stats Card */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            background: 'white',
            borderRadius: '24px',
            padding: '32px 48px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
            maxWidth: '1024px',
            width: '100%',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-around',
            alignItems: 'center',
            gap: '48px',
            border: '1px solid #f3f4f6',
          }}
        >
          {APP_CONTENT.stats.metrics.map((metric, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#374151' }}>{metric.value}</div>
                  <div style={{ color: '#9ca3af', fontWeight: 500, fontSize: '14px' }}>{metric.label}</div>
                </div>
                <div style={{ padding: '8px' }}>
                  {i === 0 && (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 12L12 6H36L40 12V18H8V12Z" fill="#ff4d4f" stroke="#333" strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M16 12V18M24 12V18M32 12V18" stroke="#333" strokeWidth="2"/>
                      <path d="M12 18V36H36V18" fill="white" stroke="#333" strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M20 26H28V36H20V26Z" stroke="#333" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {i === 1 && (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 44C24 44 38 32 38 20C38 12.268 31.732 6 24 6C16.268 6 10 12.268 10 20C10 32 24 44 24 44Z" fill="#ff4d4f" stroke="#333" strokeWidth="2" strokeLinejoin="round"/>
                      <circle cx="24" cy="20" r="6" fill="white" stroke="#333" strokeWidth="2"/>
                    </svg>
                  )}
                  {i === 2 && (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 16L16 40H32L36 16H12Z" fill="white" stroke="#333" strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M20 16V10C20 7 28 7 28 10V16" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 16H26V24H22V16Z" fill="#ff4d4f" stroke="#ff4d4f" strokeWidth="1"/>
                    </svg>
                  )}
                </div>
              </div>
              {i < 2 && <div style={{ width: '1px', height: '64px', background: '#e5e7eb' }} />}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ── MAIN CONTENT AREA ── */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 32px' }}>

        {/* Feature Cards (Order Online / Dining / Nightlife) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', marginBottom: '96px' }}>
          {APP_CONTENT.categories.map((cat, idx) => (
            <div
              key={idx}
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                background: 'white',
                boxShadow: '0px 20px 40px rgba(27, 27, 27, 0.06)',
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-8px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ height: '192px', overflow: 'hidden' }}>
                <img
                  src={cat.image}
                  alt={cat.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
              </div>
              <div style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{cat.title}</h3>
                <p style={{ color: Z.onSurfaceVariant, fontSize: '14px' }}>{cat.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── COLLECTIONS SECTION ── */}
        <section style={{ marginBottom: '96px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '8px' }}>
                {APP_CONTENT.collections.title}
              </h2>
              <p style={{ color: Z.onSurfaceVariant, fontSize: '18px' }}>{APP_CONTENT.collections.description}</p>
            </div>
            <a
              href="#"
              style={{ color: Z.primary, fontWeight: 700, display: 'flex', alignItems: 'center', textDecoration: 'none', gap: '4px' }}
            >
              All collections
              <span className="material-symbols-outlined" style={{ fontSize: '20px', transition: 'transform 0.2s' }}>
                arrow_right
              </span>
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
            {APP_CONTENT.collections.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  height: '320px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.7s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent, transparent)',
                  }}
                />
                <div style={{ position: 'absolute', bottom: '16px', left: '16px', color: 'white' }}>
                  <p style={{ fontWeight: 700, fontSize: '18px' }}>{item.title}</p>
                  <p style={{ fontSize: '14px', opacity: 0.9, display: 'flex', alignItems: 'center' }}>
                    {item.places}
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', marginLeft: '4px' }}>
                      arrow_right
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── EXPERIENCE SECTION ── */}
        <section
          style={{
            background: Z.surfaceContainerLow,
            borderRadius: '16px',
            padding: '48px',
            marginBottom: '96px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '64px',
              alignItems: 'center',
            }}
          >
            <div>
              <span
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: '3px',
                  color: Z.primary,
                  fontWeight: 700,
                  marginBottom: '16px',
                  display: 'block',
                  fontSize: '12px',
                }}
              >
                {APP_CONTENT.experience.eyebrow}
              </span>
              <h2 style={{ fontSize: '44px', fontWeight: 900, lineHeight: 1.15, marginBottom: '24px', letterSpacing: '-0.5px' }}>
                {APP_CONTENT.experience.title}
              </h2>
              <p style={{ fontSize: '18px', color: Z.onSurfaceVariant, marginBottom: '32px', lineHeight: 1.7 }}>
                {APP_CONTENT.experience.description}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {APP_CONTENT.experience.features.map((feature, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div
                      style={{
                        background: Z.primaryContainer,
                        padding: '12px',
                        borderRadius: '50%',
                        color: Z.onPrimary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span className="material-symbols-outlined">{feature.icon}</span>
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '4px' }}>{feature.title}</h4>
                      <p style={{ color: Z.onSurfaceVariant }}>{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  width: '256px',
                  height: '256px',
                  background: 'rgba(183, 18, 42, 0.1)',
                  borderRadius: '50%',
                  filter: 'blur(48px)',
                }}
              />
              <img
                src={APP_CONTENT.experience.image}
                alt="UI Mockup"
                style={{
                  borderRadius: '16px',
                  boxShadow: '0px 20px 40px rgba(27, 27, 27, 0.06)',
                  width: '100%',
                  maxWidth: '448px',
                  margin: '0 auto',
                  display: 'block',
                  transform: 'rotate(2deg)',
                  transition: 'transform 0.5s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotate(0deg)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'rotate(2deg)')}
              />
            </div>
          </div>
        </section>

        {/* ── DOWNLOAD APP SECTION ── */}
        <section
          style={{
            background: Z.primaryContainer,
            borderRadius: '16px',
            padding: '48px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '48px',
            color: Z.onPrimary,
          }}
        >
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 900, marginBottom: '16px' }}>{APP_CONTENT.download.title}</h2>
            <p style={{ fontSize: '20px', marginBottom: '32px', opacity: 0.9 }}>{APP_CONTENT.download.description}</p>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="contact" defaultChecked style={{ accentColor: 'white' }} />
                <span>Email</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="contact" style={{ accentColor: 'white' }} />
                <span>Phone</span>
              </label>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '48px' }}>
              <input
                type="text"
                placeholder="Email"
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: Z.onSurface,
                  border: 'none',
                  flex: 1,
                  fontWeight: 500,
                  fontFamily: Z.font,
                  minWidth: '200px',
                  outline: 'none',
                }}
              />
              <button
                style={{
                  background: Z.primary,
                  color: 'white',
                  padding: '12px 32px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: Z.font,
                  fontSize: '15px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = Z.surfaceTint)}
                onMouseLeave={(e) => (e.currentTarget.style.background = Z.primary)}
              >
                Share App Link
              </button>
            </div>

            <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '16px' }}>Download app from</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <img src={APP_CONTENT.download.appStoreImage} alt="App Store" style={{ height: '40px', cursor: 'pointer' }} />
              <img src={APP_CONTENT.download.playStoreImage} alt="Google Play" style={{ height: '40px', cursor: 'pointer' }} />
            </div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0px 20px 40px rgba(27, 27, 27, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                background: 'white',
                width: '192px',
                height: '192px',
                borderRadius: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '4px solid white',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://zesty.com/download"
                alt="Scan to Download"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <p style={{ color: Z.onSurface, textAlign: 'center', fontWeight: 700, fontSize: '14px' }}>Scan to Download</p>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer
        style={{
          width: '100%',
          borderTop: '1px solid #e5e7eb',
          padding: '48px 32px',
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '32px',
        }}
      >
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '24px', fontWeight: 900, fontStyle: 'italic', marginBottom: '16px', color: Z.onSurface }}>
            {APP_CONTENT.footer.title}
          </div>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>{APP_CONTENT.footer.tagline}</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span className="material-symbols-outlined" style={{ color: '#6b7280', cursor: 'pointer', fontSize: '24px' }}>
              public
            </span>
            <span className="material-symbols-outlined" style={{ color: '#6b7280', cursor: 'pointer', fontSize: '24px' }}>
              social_leaderboard
            </span>
            <span className="material-symbols-outlined" style={{ color: '#6b7280', cursor: 'pointer', fontSize: '24px' }}>
              share
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
          {Object.entries(APP_CONTENT.footer.links).map(([section, links]) => (
            <div key={section} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontWeight: 700, marginBottom: '8px', color: Z.onSurface }}>{section}</p>
              {links.map((link: string, idx: number) => (
                <a
                  key={idx}
                  href="#"
                  style={{
                    color: '#6b7280',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.2s, transform 0.2s',
                    display: 'inline-block',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#dc2626';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#6b7280';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            width: '100%',
            marginTop: '48px',
            paddingTop: '32px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'center',
            fontSize: '12px',
            color: '#9ca3af',
          }}
        >
          {APP_CONTENT.footer.copyright}
        </div>
      </footer>

      {/* Load Material Symbols + Lexend font */}
      <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
    </div>
  );
}

export default function ZestyPage() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ZestyPageContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
