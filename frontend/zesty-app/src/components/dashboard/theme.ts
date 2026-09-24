// Visual worlds for the dashboard shell. Each one inherits its landing page:
//   zesty     – warm cream + ink, Zesty red with saffron gold, Poppins headings
//   eventra   – cinematic near-black, amber, Playfair headings
//   platforma – editorial paper + black sidebar, olive, Playfair headings

export type DashWorld = 'zesty' | 'eventra' | 'platforma';
export type Tone = 'success' | 'warn' | 'danger' | 'info' | 'neutral';

export interface DashTheme {
  world: DashWorld;
  dark: boolean;
  page: string;
  display: string;
  titleAccent: string;
  bannerOverlay: string;
  sidebar: string;
  sidebarText: string;
  sidebarMuted: string;
  sidebarDivider: string;
  navIdle: string;
  navActive: string;
  navBadge: string;
  panel: string;
  hairline: string;
  hairlineBg: string;
  divide: string;
  strong: string;
  muted: string;
  faint: string;
  accentText: string;
  accentHex: string;
  accentSoftHex: string;
  gridHex: string;
  input: string;
  btnPrimary: string;
  btnSecondary: string;
  btnGhost: string;
  btnDanger: string;
  btnOnImage: string;
  btnOnImagePrimary: string;
  rowHover: string;
  subtle: string;
  modalPanel: string;
  skeleton: string;
  checkbox: string;
  tones: Record<Tone, string>;
}

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const lightTones: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warn: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  danger: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  info: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  neutral: 'bg-stone-100 text-stone-700 ring-stone-500/20',
};

export const themes: Record<DashWorld, DashTheme> = {
  zesty: {
    world: 'zesty',
    dark: false,
    page: 'bg-[#fbf5ee] text-[#1c1c1c] font-zesty-body selection:bg-zesty-red/20',
    display: 'font-zesty-display font-bold tracking-tight',
    titleAccent: 'text-zesty-gold',
    bannerOverlay:
      'bg-[linear-gradient(100deg,rgba(23,17,15,0.94)_0%,rgba(23,17,15,0.72)_42%,rgba(23,17,15,0.2)_100%)]',
    sidebar: 'bg-[#17110f]',
    sidebarText: 'text-[#f6ede4]',
    sidebarMuted: 'text-[#f6ede4]/50',
    sidebarDivider: 'border-white/[0.07]',
    navIdle: 'text-[#f6ede4]/70 hover:bg-white/[0.06] hover:text-white',
    navActive: 'bg-zesty-red text-white shadow-[0_10px_24px_-8px_rgba(226,55,68,0.7)]',
    navBadge: 'bg-zesty-gold text-[#17110f]',
    panel: 'rounded-2xl border border-[#efe2d4] bg-white',
    hairline: 'border-[#efe2d4]',
    hairlineBg: 'bg-[#efe2d4]',
    divide: 'divide-[#efe2d4]',
    strong: 'text-[#1c1c1c]',
    muted: 'text-[#7a6d63]',
    faint: 'text-[#a89a8e]',
    accentText: 'text-zesty-redDark',
    accentHex: '#e23744',
    accentSoftHex: '#ffb302',
    gridHex: '#f1e6da',
    input:
      'w-full rounded-xl border border-[#e7d9cb] bg-white px-3.5 py-2.5 text-sm text-[#1c1c1c] placeholder:text-[#b3a597] transition-colors focus:border-zesty-red focus:outline-none focus:ring-2 focus:ring-zesty-red/20 disabled:bg-[#f7efe6] disabled:text-[#8c7f74]',
    btnPrimary: `${btnBase} bg-zesty-red text-white hover:bg-zesty-redDark focus-visible:ring-zesty-red`,
    btnSecondary: `${btnBase} border border-[#e7d9cb] bg-white text-[#1c1c1c] hover:bg-[#fbf5ee] focus-visible:ring-zesty-red`,
    btnGhost: `${btnBase} text-[#5c5048] hover:bg-[#f5ebe0] hover:text-[#1c1c1c] focus-visible:ring-zesty-red`,
    btnDanger: `${btnBase} text-rose-700 hover:bg-rose-50 focus-visible:ring-rose-500`,
    btnOnImage: `${btnBase} bg-white/10 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/20 focus-visible:ring-white focus-visible:ring-offset-0`,
    btnOnImagePrimary: `${btnBase} bg-zesty-red text-white hover:bg-zesty-redDark focus-visible:ring-white focus-visible:ring-offset-0`,
    rowHover: 'hover:bg-[#fcf7f1]',
    subtle: 'bg-[#fbf5ee]',
    modalPanel: 'rounded-3xl bg-white text-[#1c1c1c] shadow-[0_40px_80px_-20px_rgba(23,17,15,0.45)]',
    skeleton: 'bg-[#f1e6da]',
    checkbox: 'accent-[#e23744]',
    tones: { ...lightTones, info: 'bg-zesty-red/10 text-zesty-redDark ring-zesty-red/20' },
  },
  eventra: {
    world: 'eventra',
    dark: true,
    page: 'bg-[#0a0a0a] text-[#f5f0e8] font-eventra-body selection:bg-[#c4621a]/40 [color-scheme:dark]',
    display: 'font-eventra-display font-medium tracking-[-0.01em]',
    titleAccent: 'italic text-[#e8824a]',
    bannerOverlay:
      'bg-[linear-gradient(180deg,rgba(10,10,10,0.35)_0%,rgba(10,10,10,0.7)_55%,#0a0a0a_100%),linear-gradient(90deg,rgba(10,10,10,0.85)_0%,rgba(10,10,10,0)_70%)]',
    sidebar: 'bg-[#0d0c0b] border-r border-white/[0.06]',
    sidebarText: 'text-[#f5f0e8]',
    sidebarMuted: 'text-[#f5f0e8]/45',
    sidebarDivider: 'border-white/[0.06]',
    navIdle: 'text-[#f5f0e8]/60 hover:bg-white/[0.05] hover:text-[#f5f0e8]',
    navActive: 'bg-[#c4621a]/15 text-[#f0a070] ring-1 ring-inset ring-[#c4621a]/35',
    navBadge: 'bg-[#c4621a] text-white',
    panel: 'rounded-2xl border border-white/[0.07] bg-[#141414]',
    hairline: 'border-white/[0.07]',
    hairlineBg: 'bg-white/[0.07]',
    divide: 'divide-white/[0.07]',
    strong: 'text-[#f5f0e8]',
    muted: 'text-[#9a9a9a]',
    faint: 'text-[#6b6b6b]',
    accentText: 'text-[#e8824a]',
    accentHex: '#e8824a',
    accentSoftHex: '#c4621a',
    gridHex: '#222222',
    input:
      'w-full rounded-xl border border-white/10 bg-[#0e0e0e] px-3.5 py-2.5 text-sm text-[#f5f0e8] placeholder:text-white/30 transition-colors focus:border-[#e8824a] focus:outline-none focus:ring-2 focus:ring-[#c4621a]/30 disabled:text-white/40',
    btnPrimary: `${btnBase} bg-[#c4621a] text-white hover:bg-[#d8712a] focus-visible:ring-[#e8824a] focus-visible:ring-offset-[#0a0a0a]`,
    btnSecondary: `${btnBase} border border-white/12 bg-white/[0.03] text-[#f5f0e8] hover:bg-white/[0.08] focus-visible:ring-[#e8824a] focus-visible:ring-offset-[#0a0a0a]`,
    btnGhost: `${btnBase} text-[#c9c3ba] hover:bg-white/[0.06] hover:text-white focus-visible:ring-[#e8824a] focus-visible:ring-offset-[#0a0a0a]`,
    btnDanger: `${btnBase} text-rose-300 hover:bg-rose-400/10 focus-visible:ring-rose-400 focus-visible:ring-offset-[#0a0a0a]`,
    btnOnImage: `${btnBase} bg-white/10 text-white ring-1 ring-white/20 backdrop-blur hover:bg-white/20 focus-visible:ring-white focus-visible:ring-offset-0`,
    btnOnImagePrimary: `${btnBase} bg-[#c4621a] text-white hover:bg-[#d8712a] focus-visible:ring-white focus-visible:ring-offset-0`,
    rowHover: 'hover:bg-white/[0.03]',
    subtle: 'bg-white/[0.03]',
    modalPanel: 'rounded-3xl border border-white/10 bg-[#121212] text-[#f5f0e8] shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9)]',
    skeleton: 'bg-white/[0.06]',
    checkbox: 'accent-[#c4621a]',
    tones: {
      success: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
      warn: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
      danger: 'bg-rose-400/10 text-rose-300 ring-rose-400/20',
      info: 'bg-[#c4621a]/15 text-[#f0a070] ring-[#c4621a]/30',
      neutral: 'bg-white/[0.05] text-white/70 ring-white/10',
    },
  },
  platforma: {
    world: 'platforma',
    dark: false,
    page: 'bg-[#f6f4ee] text-[#141414] font-zesty-body selection:bg-[#8a9a5b]/30',
    display: 'font-eventra-display font-medium tracking-[-0.01em]',
    titleAccent: 'italic text-[#c3d096]',
    bannerOverlay:
      'bg-[linear-gradient(100deg,rgba(13,13,13,0.93)_0%,rgba(13,13,13,0.7)_45%,rgba(13,13,13,0.25)_100%)]',
    sidebar: 'bg-[#0d0d0d]',
    sidebarText: 'text-[#f5f2ea]',
    sidebarMuted: 'text-[#f5f2ea]/45',
    sidebarDivider: 'border-white/[0.07]',
    navIdle: 'text-[#f5f2ea]/65 hover:bg-white/[0.05] hover:text-white',
    navActive: 'bg-[#8a9a5b] text-[#0d0d0d]',
    navBadge: 'bg-[#c3d096] text-[#0d0d0d]',
    panel: 'rounded-2xl border border-[#e6e2d8] bg-white',
    hairline: 'border-[#e6e2d8]',
    hairlineBg: 'bg-[#e6e2d8]',
    divide: 'divide-[#e6e2d8]',
    strong: 'text-[#141414]',
    muted: 'text-[#6b6a63]',
    faint: 'text-[#9c9a90]',
    accentText: 'text-[#56652f]',
    accentHex: '#6f7f42',
    accentSoftHex: '#b5c48a',
    gridHex: '#ece9e0',
    input:
      'w-full rounded-xl border border-[#dedad0] bg-white px-3.5 py-2.5 text-sm text-[#141414] placeholder:text-[#a8a69c] transition-colors focus:border-[#6f7f42] focus:outline-none focus:ring-2 focus:ring-[#8a9a5b]/25 disabled:bg-[#f3f1ea] disabled:text-[#77756c]',
    btnPrimary: `${btnBase} bg-[#141414] text-white hover:bg-[#2c2c2c] focus-visible:ring-[#6f7f42]`,
    btnSecondary: `${btnBase} border border-[#dedad0] bg-white text-[#141414] hover:bg-[#f6f4ee] focus-visible:ring-[#6f7f42]`,
    btnGhost: `${btnBase} text-[#4a4943] hover:bg-[#efece4] hover:text-[#141414] focus-visible:ring-[#6f7f42]`,
    btnDanger: `${btnBase} text-rose-700 hover:bg-rose-50 focus-visible:ring-rose-500`,
    btnOnImage: `${btnBase} bg-white/10 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/20 focus-visible:ring-white focus-visible:ring-offset-0`,
    btnOnImagePrimary: `${btnBase} bg-[#f5f2ea] text-[#0d0d0d] hover:bg-white focus-visible:ring-[#b5c48a] focus-visible:ring-offset-0`,
    rowHover: 'hover:bg-[#faf9f5]',
    subtle: 'bg-[#f6f4ee]',
    modalPanel: 'rounded-3xl bg-white text-[#141414] shadow-[0_40px_80px_-20px_rgba(13,13,13,0.45)]',
    skeleton: 'bg-[#ece9e0]',
    checkbox: 'accent-[#6f7f42]',
    tones: { ...lightTones, info: 'bg-[#8a9a5b]/15 text-[#46542a] ring-[#6f7f42]/25' },
  },
};

const STATUS_TONES: Record<string, Tone> = {
  delivered: 'success',
  completed: 'success',
  paid: 'success',
  active: 'success',
  approved: 'success',
  available: 'success',
  published: 'success',
  ready: 'success',
  confirmed: 'info',
  preparing: 'info',
  out_for_delivery: 'info',
  processing: 'info',
  pending: 'warn',
  reserved: 'warn',
  draft: 'neutral',
  inactive: 'neutral',
  blocked: 'neutral',
  booked: 'neutral',
  cancelled: 'danger',
  rejected: 'danger',
  failed: 'danger',
  refunded: 'danger',
};

export const toneForStatus = (status: string): Tone =>
  STATUS_TONES[status?.toLowerCase?.() ?? ''] ?? 'neutral';

export const humanize = (value: string): string =>
  (value || '')
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inrExact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat('en-IN');

export const formatINR = (value: unknown, exact = false): string =>
  (exact ? inrExact : inrWhole).format(toNumber(value));
export const formatInt = (value: unknown): string => intFmt.format(toNumber(value));

/** Short, readable order reference: UUIDs collapse to their first block. */
export const shortRef = (id: string | number): string => {
  const value = String(id);
  return value.length > 10 ? value.slice(0, 8).toUpperCase() : value;
};

export const plural = (count: unknown, one: string, many = `${one}s`): string => {
  const n = toNumber(count);
  return `${intFmt.format(n)} ${n === 1 ? one : many}`;
};

export const formatDate = (value?: string | null, withTime = false): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

export const greeting = (date = new Date()): string => {
  const hour = date.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

/**
 * Sums values into one bucket per calendar day. The window ends today, or at
 * the most recent record when nothing falls inside the last `days` days, so
 * older demo data still draws a real (correctly labelled) series.
 */
export function bucketByDay<T>(
  items: T[],
  getDate: (item: T) => string | undefined | null,
  getValue: (item: T) => number = () => 1,
  days = 14
): { label: string; value: number; date: Date }[] {
  const stamps = items
    .map((item) => {
      const raw = getDate(item);
      const time = raw ? new Date(raw).getTime() : NaN;
      return Number.isNaN(time) ? null : { time, value: getValue(item) };
    })
    .filter((entry): entry is { time: number; value: number } => entry !== null);

  const startOfDay = (time: number) => {
    const d = new Date(time);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const DAY = 86_400_000;
  let end = startOfDay(Date.now());
  const latest = stamps.reduce((max, s) => Math.max(max, s.time), 0);
  if (latest && latest < end - (days - 1) * DAY) end = startOfDay(latest);
  const start = end - (days - 1) * DAY;

  const buckets = Array.from({ length: days }, (_, i) => {
    const date = new Date(start + i * DAY);
    return {
      date,
      value: 0,
      label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    };
  });
  stamps.forEach(({ time, value }) => {
    const index = Math.round((startOfDay(time) - start) / DAY);
    if (index >= 0 && index < days) buckets[index].value += value;
  });
  return buckets;
}
