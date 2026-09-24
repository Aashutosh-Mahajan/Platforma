export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const getDashboardRouteForRole = (role?: string | null): string | null => {
  if (role === 'restaurant_owner') {
    return '/dashboard/restaurant-owner';
  }

  if (role === 'event_organizer') {
    return '/dashboard/event-organizer';
  }

  if (role === 'admin') {
    return '/dashboard/admin';
  }

  return null;
};

export const getPostAuthRedirectPath = (role?: string | null): string => {
  return getDashboardRouteForRole(role) || '/dashboard';
};

const AUTH_PAGES = ['/', '/login', '/register', '/verify-email', '/forgot-password'];

/**
 * Where to send someone right after they sign in. A remembered "from" page is
 * honoured only for ordinary pages (checkout, seat selection, an event...).
 * Dashboards and auth pages are ignored: they may belong to whoever was
 * signed in before, and each role has exactly one home dashboard.
 */
export const resolvePostAuthPath = (role?: string | null, from?: string | null): string => {
  const home = getPostAuthRedirectPath(role);
  if (!from) return home;
  const path = from.split(/[?#]/)[0];
  if (path.startsWith('/dashboard') || AUTH_PAGES.includes(path)) return home;
  return from;
};


/**
 * Human-friendly seat code. Rows that end in a digit ("R01") would run into
 * the seat number ("R0101"), so those get a hyphen ("R01-01"); letter rows
 * stay compact ("A5").
 */
export const seatCode = (row: string | number, seatNumber: string | number): string => {
  const r = String(row ?? '').trim();
  const n = String(seatNumber ?? '').trim();
  return /\d$/.test(r) ? `${r}-${n}` : `${r}${n}`;
};
