import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, LogOut, Menu, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts';
import { NotificationDropdown } from '../shared/NotificationDropdown';
import { humanize, themes, type DashTheme, type DashWorld } from './theme';

export interface DashNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string | number;
}

export interface DashNavGroup {
  label?: string;
  items: DashNavItem[];
}

interface DashboardShellProps {
  world: DashWorld;
  /** Short line under the wordmark, e.g. "Partner workspace". */
  context: string;
  nav: DashNavGroup[];
  activeKey: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  image: string;
  imagePosition?: string;
  /** Buttons rendered on the banner, next to notifications. */
  actions?: React.ReactNode;
  /** KPI ledger that overlaps the bottom edge of the banner. */
  ledger?: React.ReactNode;
  /** Extra sidebar content between nav and the account card. */
  sidebarExtra?: React.ReactNode;
  children: React.ReactNode;
}

const WORLD_HOME: Record<DashWorld, string> = { zesty: '/zesty', eventra: '/eventra', platforma: '/' };

const Wordmark: React.FC<{ world: DashWorld }> = ({ world }) => {
  if (world === 'zesty') {
    return (
      <span className="font-zesty-display text-[26px] font-extrabold leading-none tracking-tight text-white">
        zesty<span className="text-zesty-red">.</span>
      </span>
    );
  }
  if (world === 'eventra') {
    return (
      <span className="font-eventra-display text-[27px] italic leading-none text-[#f5f0e8]">
        Eventra<span className="not-italic text-[#e8824a]">.</span>
      </span>
    );
  }
  return (
    <span className="font-eventra-display text-[27px] leading-none text-[#f5f2ea]">
      Platforma<span className="text-[#8a9a5b]">.</span>
    </span>
  );
};

const initials = (first?: string, last?: string, fallback?: string) => {
  const value = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.trim();
  return (value || fallback?.[0] || '?').toUpperCase();
};

const SidebarBody: React.FC<{
  theme: DashTheme;
  context: string;
  nav: DashNavGroup[];
  activeKey: string;
  extra?: React.ReactNode;
  onNavigate?: () => void;
}> = ({ theme, context, nav, activeKey, extra, onNavigate }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const itemClass = (item: DashNavItem) =>
    `group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-35 ${
      item.key === activeKey ? theme.navActive : theme.navIdle
    }`;

  const renderItem = (item: DashNavItem) => {
    const Icon = item.icon;
    const content = (
      <>
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        {item.badge !== undefined && item.badge !== 0 && item.badge !== '' && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${theme.navBadge}`}>
            {item.badge}
          </span>
        )}
      </>
    );
    if (item.to) {
      return (
        <Link
          key={item.key}
          to={item.to}
          onClick={onNavigate}
          aria-current={item.key === activeKey ? 'page' : undefined}
          className={itemClass(item)}
        >
          {content}
        </Link>
      );
    }
    return (
      <button
        key={item.key}
        type="button"
        disabled={item.disabled}
        aria-current={item.key === activeKey ? 'page' : undefined}
        onClick={() => {
          item.onClick?.();
          onNavigate?.();
        }}
        className={itemClass(item)}
      >
        {content}
      </button>
    );
  };

  return (
    <div className={`flex h-full flex-col ${theme.sidebarText}`}>
      <div className="px-6 pb-6 pt-7">
        <Link
          to={WORLD_HOME[theme.world]}
          className="inline-block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Wordmark world={theme.world} />
        </Link>
        <p className={`mt-2 text-xs ${theme.sidebarMuted}`}>{context}</p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6" aria-label="Dashboard">
        {nav.map((group, index) => (
          <div key={group.label ?? index}>
            {group.label && (
              <p className={`px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${theme.sidebarMuted}`}>
                {group.label}
              </p>
            )}
            <div className="space-y-1">{group.items.map(renderItem)}</div>
          </div>
        ))}
        {extra}
      </nav>

      <div className={`border-t px-3 py-4 ${theme.sidebarDivider}`}>
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 pb-4 text-xs">
          {[
            { to: '/', label: 'Platforma' },
            { to: '/zesty', label: 'Zesty' },
            { to: '/eventra', label: 'Eventra' },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`inline-flex items-center gap-0.5 transition-colors hover:text-white ${theme.sidebarMuted}`}
            >
              {link.label}
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <Link
            to="/profile"
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-semibold">
              {initials(user?.first_name, user?.last_name, user?.email)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Account'}
              </span>
              <span className={`block truncate text-xs ${theme.sidebarMuted}`}>{humanize(user?.role ?? '')}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={`rounded-lg p-2 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${theme.sidebarMuted}`}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const DashboardShell: React.FC<DashboardShellProps> = ({
  world,
  context,
  nav,
  activeKey,
  title,
  subtitle,
  image,
  imagePosition = 'center',
  actions,
  ledger,
  sidebarExtra,
  children,
}) => {
  const theme = themes[world];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [image]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className={`min-h-screen ${theme.page}`}>
      {/* Desktop sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 hidden w-[264px] lg:block ${theme.sidebar}`}>
        <SidebarBody theme={theme} context={context} nav={nav} activeKey={activeKey} extra={sidebarExtra} />
      </aside>

      {/* Mobile top bar + drawer */}
      <div className={`sticky top-0 z-40 flex items-center justify-between px-4 py-3 lg:hidden ${theme.sidebar}`}>
        <Link to={WORLD_HOME[world]} aria-label="Home">
          <Wordmark world={world} />
        </Link>
        <div className="flex items-center gap-1">
          <NotificationDropdown variant="platforma" />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          />
          <div className={`absolute inset-y-0 left-0 w-[86%] max-w-[300px] shadow-2xl ${theme.sidebar}`}>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-5 z-10 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <SidebarBody
              theme={theme}
              context={context}
              nav={nav}
              activeKey={activeKey}
              extra={sidebarExtra}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="lg:pl-[264px]">
        <header className={`relative isolate overflow-hidden ${world === 'eventra' ? 'bg-[#0a0a0a]' : 'bg-[#17110f]'}`}>
          {!imageFailed && (
            <img
              src={image}
              alt=""
              onError={() => setImageFailed(true)}
              className="absolute inset-0 -z-20 h-full w-full object-cover"
              style={{ objectPosition: imagePosition }}
            />
          )}
          <div className={`absolute inset-0 -z-10 ${theme.bannerOverlay}`} aria-hidden="true" />
          <div className={`px-5 pt-6 sm:px-8 lg:px-12 lg:pt-8 ${ledger ? 'pb-24 lg:pb-28' : 'pb-10 lg:pb-12'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-white/65">{today}</p>
              <div className="flex flex-wrap items-center gap-2">
                {actions}
                <div className="hidden lg:block">
                  <NotificationDropdown variant="platforma" />
                </div>
              </div>
            </div>
            <div className="mt-14 max-w-3xl lg:mt-20">
              <h1 className={`${theme.display} text-[34px] leading-[1.05] text-white sm:text-5xl`}>{title}</h1>
              {subtitle && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/72">{subtitle}</p>}
            </div>
          </div>
        </header>

        {ledger && <div className="relative z-10 -mt-16 px-5 sm:px-8 lg:px-12">{ledger}</div>}

        <main className="px-5 pb-16 pt-8 sm:px-8 lg:px-12 lg:pt-10">{children}</main>
      </div>
    </div>
  );
};

export default DashboardShell;
