import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts';

const NAV_ITEMS = [
  { label: 'Discover', to: '/eventra', isActive: true },
  { label: 'Live Music', to: '/eventra/events?category=concert', isActive: false },
  { label: 'Theater', to: '/eventra/events?category=theater', isActive: false },
  { label: 'Experience', to: '/eventra/discover', isActive: false },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleAccountClick = () => {
    navigate('/profile');
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  const handleEventraDashboardClick = () => {
    navigate('/dashboard/eventra');
  };

  const handleLogoutClick = async () => {
    await logout();
    navigate('/eventra');
  };

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed left-0 top-0 z-50 w-full border-b border-white/10 px-4 py-3 transition-all duration-300 sm:px-8 ${
        isScrolled ? 'bg-black/95 backdrop-blur-md' : 'bg-black/25 backdrop-blur-sm'
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-5">
        <Link to="/eventra" className="font-eventra-display text-xl font-semibold text-white">
          Eventra
        </Link>

        <nav className="hidden items-center gap-7 font-eventra-body text-sm text-white/85 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`relative pb-1 transition-colors hover:text-white ${
                item.isActive ? 'text-white' : 'text-white/70'
              }`}
            >
              {item.label}
              {item.isActive ? <span className="absolute inset-x-0 -bottom-0.5 h-px bg-eventra-amber" /> : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Search events"
            className="rounded-full p-2 text-white/85 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Search className="h-4 w-4" />
          </button>
          {isAuthenticated ? (
            <>
              <button
                type="button"
                className="rounded-full border border-[#c9beff]/45 bg-[rgba(109,73,253,0.22)] px-4 py-2 text-sm font-semibold text-[#f4f0ff] backdrop-blur-md transition-colors hover:bg-[rgba(109,73,253,0.34)]"
                onClick={handleDashboardClick}
              >
                Dashboard
              </button>
              <button
                type="button"
                className="hidden rounded-full border border-[#c9beff]/55 bg-[rgba(109,73,253,0.3)] px-4 py-2 text-sm font-semibold text-[#f7f3ff] transition-colors hover:bg-[rgba(109,73,253,0.4)] xl:inline-flex"
                onClick={handleEventraDashboardClick}
              >
                Eventra Dashboard
              </button>
              <button
                type="button"
                className="rounded-full border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
                onClick={handleAccountClick}
              >
                Hi, {user?.first_name || 'User'}
              </button>
              <button
                type="button"
                className="rounded-full bg-eventra-amber px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-eventra-amberLight"
                onClick={() => {
                  void handleLogoutClick();
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-full bg-eventra-amber px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-eventra-amberLight"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
