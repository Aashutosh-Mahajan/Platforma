import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LogOut, Menu, ShoppingBag, UserRound, X } from 'lucide-react';
import { useAuth, useCart } from '../../contexts';
import { NotificationDropdown } from './NotificationDropdown';
import { getPostAuthRedirectPath } from '../../utils';

type Section = 'zesty' | 'eventra' | 'platforma';

/**
 * Top bar for every page that doesn't bring its own chrome (landing pages,
 * dashboards, profile and auth pages render their own). It takes on the look
 * of the section you're in so it matches the page underneath.
 */
const LOOK: Record<Section, {
  bar: string;
  wordmark: React.ReactNode;
  home: string;
  link: string;
  linkActive: string;
  iconButton: string;
  primary: string;
  panel: string;
  panelMuted: string;
  panelHover: string;
  dark: boolean;
  notificationVariant: 'zesty' | 'platforma' | 'default';
}> = {
  zesty: {
    bar: 'bg-white/95 border-b border-[#efe2d4] backdrop-blur-md',
    wordmark: (
      <span className="font-zesty-display text-[26px] font-extrabold leading-none tracking-tight text-[#1c1c1c]">
        zesty<span className="text-zesty-red">.</span>
      </span>
    ),
    home: '/zesty',
    link: 'text-[#5c5048] hover:text-[#1c1c1c] hover:bg-[#fbf5ee]',
    linkActive: 'text-zesty-redDark bg-zesty-red/[0.07]',
    iconButton: 'text-[#4a4943] hover:bg-black/[0.05] hover:text-[#141414] focus-visible:ring-zesty-red/50',
    primary: 'bg-zesty-red text-white hover:bg-zesty-redDark',
    panel: 'border border-[#efe2d4] bg-white text-[#1c1c1c]',
    panelMuted: 'text-[#7a6d63]',
    panelHover: 'hover:bg-[#fbf5ee]',
    dark: false,
    notificationVariant: 'zesty',
  },
  eventra: {
    bar: 'bg-[#0a0a0a] border-b border-white/[0.07]',
    wordmark: (
      <span className="font-eventra-display text-[26px] italic leading-none text-[#f5f0e8]">
        Eventra<span className="not-italic text-[#e8824a]">.</span>
      </span>
    ),
    home: '/eventra',
    link: 'text-white/70 hover:text-white hover:bg-white/[0.06]',
    linkActive: 'text-[#f0a070] bg-[#c4621a]/15',
    iconButton: 'text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-white/50',
    primary: 'bg-[#c4621a] text-white hover:bg-[#d8712a]',
    panel: 'border border-white/10 bg-[#141414] text-[#f5f0e8]',
    panelMuted: 'text-white/55',
    panelHover: 'hover:bg-white/[0.06]',
    dark: true,
    notificationVariant: 'platforma',
  },
  platforma: {
    bar: 'bg-[#f6f4ee]/95 border-b border-[#e6e2d8] backdrop-blur-md',
    wordmark: (
      <span className="font-eventra-display text-[26px] leading-none text-[#141414]">
        Platforma<span className="text-[#8a9a5b]">.</span>
      </span>
    ),
    home: '/',
    link: 'text-[#4a4943] hover:text-[#141414] hover:bg-black/[0.04]',
    linkActive: 'text-[#141414] bg-black/[0.06]',
    iconButton: 'text-[#4a4943] hover:bg-black/[0.05] hover:text-[#141414] focus-visible:ring-[#6f7f42]/50',
    primary: 'bg-[#141414] text-white hover:bg-[#2c2c2c]',
    panel: 'border border-[#e6e2d8] bg-white text-[#141414]',
    panelMuted: 'text-[#6b6a63]',
    panelHover: 'hover:bg-[#f6f4ee]',
    dark: false,
    notificationVariant: 'default',
  },
};

const NAV: Record<Section, { to: string; label: string; end?: boolean }[]> = {
  zesty: [
    { to: '/zesty', label: 'Restaurants', end: true },
    { to: '/zesty/orders', label: 'Orders' },
    { to: '/eventra/events', label: 'Events' },
  ],
  eventra: [
    { to: '/eventra/events', label: 'Events', end: true },
    { to: '/eventra/bookings', label: 'My bookings' },
    { to: '/zesty', label: 'Food' },
  ],
  platforma: [
    { to: '/zesty', label: 'Zesty' },
    { to: '/eventra/events', label: 'Eventra' },
  ],
};

const ROLE_NAMES: Record<string, string> = {
  customer: 'Customer',
  restaurant_owner: 'Restaurant partner',
  event_organizer: 'Event organizer',
  admin: 'Admin',
};

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { items } = useCart();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const path = location.pathname;

  const section: Section = path.startsWith('/zesty') ? 'zesty' : path.startsWith('/eventra') ? 'eventra' : 'platforma';
  const look = LOOK[section];
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const home = getPostAuthRedirectPath(user?.role);
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';

  // Close menus on navigation.
  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [path]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Pages with their own chrome: landing pages, restaurant list/detail,
  // dashboards + profile (sidebar shell) and the auth pages.
  const hidden =
    path === '/' ||
    path === '/zesty' ||
    path === '/zesty/' ||
    path === '/zesty/restaurants' ||
    path === '/restaurants' ||
    path.startsWith('/zesty/restaurants/') ||
    path.startsWith('/restaurants/') ||
    path === '/eventra' ||
    path === '/eventra/discover' ||
    path.startsWith('/dashboard') ||
    path === '/profile' ||
    ['/login', '/register', '/verify-email', '/forgot-password'].includes(path);
  if (hidden) return null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${isActive ? look.linkActive : look.link}`;
  const iconButton = `relative grid h-10 w-10 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 ${look.iconButton}`;

  return (
    <header className={`sticky top-0 z-40 ${look.bar}`} role="banner">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8" aria-label="Main">
        <Link to={look.home} className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2" aria-label={`${section === 'platforma' ? 'Platforma' : section === 'zesty' ? 'Zesty' : 'Eventra'} home`}>
          {look.wordmark}
        </Link>

        <ul className="ml-4 hidden items-center gap-1 md:flex">
          {NAV[section].map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className={linkClass}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-1">
          {section === 'zesty' && (
            <Link to="/zesty/cart" className={iconButton} aria-label={cartCount ? `Cart, ${cartCount} items` : 'Cart'}>
              <ShoppingBag className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-zesty-red px-1 text-[10px] font-bold text-white tabular-nums">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          )}

          {isAuthenticated ? (
            <>
              <NotificationDropdown variant={look.notificationVariant} />
              <div className="relative ml-1 hidden md:block" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 ${look.iconButton}`}
                >
                  <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${look.dark ? 'bg-white/15 text-white' : 'bg-[#141414] text-white'}`}>{initials}</span>
                  <span className="max-w-[8rem] truncate text-sm font-medium">{user?.first_name || 'Account'}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {menuOpen && (
                  <div role="menu" className={`absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl p-1.5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)] ${look.panel}`}>
                    <div className="px-3 py-2.5">
                      <p className="truncate text-sm font-semibold">{[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username}</p>
                      <p className={`truncate text-xs ${look.panelMuted}`}>{user?.email}</p>
                      <p className={`mt-1 text-xs ${look.panelMuted}`}>{ROLE_NAMES[user?.role ?? ''] ?? ''}</p>
                    </div>
                    <div className={`my-1 h-px ${look.dark ? 'bg-white/10' : 'bg-[#efece4]'}`} />
                    <Link role="menuitem" to={home} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${look.panelHover}`}>
                      <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> My dashboard
                    </Link>
                    <Link role="menuitem" to="/profile" className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${look.panelHover}`}>
                      <UserRound className="h-4 w-4" aria-hidden="true" /> Profile & addresses
                    </Link>
                    <div className={`my-1 h-px ${look.dark ? 'bg-white/10' : 'bg-[#efece4]'}`} />
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => void logout(section === 'eventra' ? '/eventra' : section === 'zesty' ? '/zesty' : '/')}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${look.dark ? 'text-rose-300' : 'text-rose-700'} ${look.panelHover}`}
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" state={{ from: `${path}${location.search}` }} className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${look.link}`}>
                Sign in
              </Link>
              <Link to="/register" className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${look.primary}`}>
                Create account
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className={`md:hidden ${iconButton}`}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div id="mobile-menu" className={`border-t px-4 pb-5 pt-3 md:hidden ${look.dark ? 'border-white/[0.07]' : 'border-black/[0.06]'}`}>
          <ul className="space-y-1">
            {NAV[section].map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={({ isActive }) => `block rounded-xl px-3 py-2.5 text-[15px] font-medium ${isActive ? look.linkActive : look.link}`}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className={`my-3 h-px ${look.dark ? 'bg-white/10' : 'bg-black/[0.06]'}`} />
          {isAuthenticated ? (
            <div className="space-y-1">
              <p className={`px-3 pb-1 text-xs ${look.dark ? 'text-white/50' : 'text-[#6b6a63]'}`}>
                Signed in as {user?.email}
              </p>
              <Link to={home} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] ${look.link}`}>
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> My dashboard
              </Link>
              <Link to="/profile" className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] ${look.link}`}>
                <UserRound className="h-4 w-4" aria-hidden="true" /> Profile & addresses
              </Link>
              <button
                type="button"
                onClick={() => void logout(section === 'eventra' ? '/eventra' : section === 'zesty' ? '/zesty' : '/')}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[15px] ${look.dark ? 'text-rose-300' : 'text-rose-700'}`}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link to="/login" state={{ from: `${path}${location.search}` }} className={`rounded-full border px-4 py-2.5 text-center text-sm font-semibold ${look.dark ? 'border-white/20' : 'border-black/15'}`}>
                Sign in
              </Link>
              <Link to="/register" className={`rounded-full px-4 py-2.5 text-center text-sm font-semibold ${look.primary}`}>
                Create account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
