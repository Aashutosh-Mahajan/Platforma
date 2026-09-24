import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Armchair,
  CalendarDays,
  Clapperboard,
  Drama,
  Laugh,
  MapPin,
  Music,
  Presentation,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trophy,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { eventAPI } from '../../api/eventra';
import type { Event } from '../../types';
import { useDebounce } from '../../hooks';

const CATEGORIES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'Everything', icon: Sparkles },
  { id: 'movie', label: 'Movies', icon: Clapperboard },
  { id: 'concert', label: 'Concerts', icon: Music },
  { id: 'sports', label: 'Sports', icon: Trophy },
  { id: 'theater', label: 'Theatre', icon: Drama },
  { id: 'comedy', label: 'Comedy', icon: Laugh },
  { id: 'expo', label: 'Expos', icon: Presentation },
  { id: 'dining', label: 'Dining', icon: UtensilsCrossed },
];

// Stand-in artwork for events that haven't uploaded their own.
const CATEGORY_IMAGES: Record<string, string> = {
  movie: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80',
  concert: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80',
  sports: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80',
  theater: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&q=80',
  comedy: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=1200&q=80',
  expo: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
  dining: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
};
const HERO_IMAGE = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=2000&q=80';

const SORT_OPTIONS = [
  { value: 'event_date', label: 'Soonest first' },
  { value: '-event_date', label: 'Latest first' },
  { value: '-rating', label: 'Highest rated' },
  { value: 'rating', label: 'Lowest rated' },
];

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-[#0e0e0e] px-3.5 py-2.5 text-sm text-[#f5f0e8] placeholder:text-white/30 [color-scheme:dark] transition-colors focus:border-[#e8824a] focus:outline-none focus:ring-2 focus:ring-[#c4621a]/30';

const venueOf = (event: Event) =>
  event.venue_name || (event as Event & { venue_detail?: { name?: string } }).venue_detail?.name || '';

const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id);

const EventListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCategory = searchParams.get('category') || 'all';
  const initialCategory = CATEGORIES.some((category) => category.id === requestedCategory)
    ? requestedCategory
    : 'all';
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('event_date');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Reset to first page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const nextCategory = CATEGORIES.some((category) => category.id === requestedCategory)
      ? requestedCategory
      : 'all';

    if (nextCategory !== selectedCategory) {
      setSelectedCategory(nextCategory);
      setPage(1);
    }
  }, [requestedCategory, selectedCategory]);

  const fetchEvents = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { page: pageNum };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (minPrice) params.min_price = parseFloat(minPrice);
      if (maxPrice) params.max_price = parseFloat(maxPrice);
      if (sortBy) params.ordering = sortBy;

      const response = await eventAPI.list(params);

      if (append) {
        setEvents(prev => [...prev, ...response.results]);
      } else {
        setEvents(response.results);
      }

      setHasMore(!!response.next);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, dateFrom, dateTo, minPrice, maxPrice, sortBy]);

  useEffect(() => {
    fetchEvents(1, false);
  }, [fetchEvents]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (page === 1) {
        fetchEvents(1, false);
      }
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [fetchEvents, page]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchEvents(nextPage, true);
    }
  };

  const handleEventClick = (id: number, category: string) => {
    navigate(`/eventra/events/${id}?category=${encodeURIComponent(category)}`);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ category: categoryId });
    }
    setPage(1);
  };

  const activeFilterCount = [dateFrom, dateTo, minPrice, maxPrice].filter(Boolean).length + (sortBy !== 'event_date' ? 1 : 0);

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('event_date');
    setSearchQuery('');
    setPage(1);
  };

  const activeCategory = categoryOf(selectedCategory) ?? CATEGORIES[0];
  const ActiveIcon = activeCategory.icon;
  const filtered = activeFilterCount > 0 || !!debouncedSearch;

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-eventra-body text-[#f5f0e8] selection:bg-[#c4621a]/40">
      {/* Hero */}
      <header className="relative isolate overflow-hidden">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_35%]" />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(10,10,10,0.45)_0%,rgba(10,10,10,0.75)_60%,#0a0a0a_100%),linear-gradient(90deg,rgba(10,10,10,0.8)_0%,rgba(10,10,10,0)_70%)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-7xl px-5 pb-14 pt-16 sm:px-8 lg:pb-20 lg:pt-24">
          <h1 className="max-w-3xl font-eventra-display text-5xl font-medium leading-[1.02] tracking-[-0.01em] sm:text-6xl lg:text-7xl">
            What's on <span className="italic text-[#e8824a]">tonight</span>, and every night after.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70">
            Concerts, cinema, theatre, matches and tables worth booking. Pick your seat on the map and you're in.
          </p>
          <label className="relative mt-9 block max-w-2xl">
            <span className="sr-only">Search events or venues</span>
            <Search className="pointer-events-none absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-white/45" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search an artist, a show or a venue"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-white/15 bg-black/45 py-4 pl-14 pr-5 text-base text-white placeholder:text-white/45 backdrop-blur-md transition-colors focus:border-[#e8824a] focus:outline-none focus:ring-2 focus:ring-[#c4621a]/40"
            />
          </label>
        </div>
      </header>

      {/* Category rail + filter toggle */}
      <div className="sticky top-16 z-30 border-y border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3 sm:px-8">
          <div
            className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pr-8 [mask-image:linear-gradient(90deg,#000_88%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Categories"
          >
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const selected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8824a] ${
                    selected ? 'bg-[#f5f0e8] text-[#0a0a0a]' : 'text-[#c9c3ba] hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  {category.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-controls="event-filters"
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8824a] ${
              showFilters || activeFilterCount
                ? 'border-[#c4621a]/60 bg-[#c4621a]/15 text-[#f0a070]'
                : 'border-white/12 text-[#f5f0e8] hover:bg-white/[0.06]'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#c4621a] px-1 text-[11px] font-bold tabular-nums text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showFilters && (
          <div id="event-filters" className="border-b border-white/[0.06] bg-[#0d0c0b]">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-5 py-5 sm:px-8 md:grid-cols-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#9a9a9a]">From</span>
                <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#9a9a9a]">To</span>
                <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#9a9a9a]">Min price (₹)</span>
                <input type="number" min="0" placeholder="0" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#9a9a9a]">Max price (₹)</span>
                <input type="number" min="0" placeholder="Any" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} className={fieldClass} />
              </label>
              <label className="col-span-2 block md:col-span-1">
                <span className="mb-1.5 block text-xs font-semibold text-[#9a9a9a]">Sort</span>
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className={`${fieldClass} [&>option]:bg-[#141414]`}>
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

      <main className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-eventra-display text-3xl font-medium">
            {activeCategory.id === 'all' ? 'All events' : activeCategory.label}
            {debouncedSearch && <span className="text-[#9a9a9a]"> matching “{debouncedSearch}”</span>}
          </h2>
          {(!loading || page > 1) && (
            <p className="text-sm text-[#9a9a9a]">
              {events.length}
              {hasMore ? '+' : ''} {events.length === 1 ? 'event' : 'events'}
              {filtered && (
                <button type="button" onClick={clearFilters} className="ml-3 inline-flex items-center gap-1 font-semibold text-[#e8824a] hover:text-[#f0a070]">
                  <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear filters
                </button>
              )}
            </p>
          )}
        </div>

        {error && (
          <div role="alert" className="mb-8 rounded-2xl bg-rose-400/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-inset ring-rose-400/20">
            {error}
            <button type="button" onClick={() => fetchEvents(1, false)} className="ml-3 font-semibold underline-offset-2 hover:underline">
              Try again
            </button>
          </div>
        )}

        {loading && page === 1 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading events">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-[400px] animate-pulse rounded-2xl border border-white/[0.06] bg-[#141414]" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-white/[0.06] bg-[#141414] px-6 py-20 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#c4621a]/15 text-[#e8824a]">
              <ActiveIcon className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <p className="mt-5 font-eventra-display text-2xl">Nothing on the bill</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#9a9a9a]">
              No {activeCategory.id === 'all' ? 'events' : activeCategory.label.toLowerCase()} match right now. Widen the dates or try another category.
            </p>
            {(filtered || selectedCategory !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  clearFilters();
                  handleCategoryChange('all');
                }}
                className="mt-6 rounded-full bg-[#c4621a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d8712a]"
              >
                Show everything
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event, index) => {
                const date = new Date(event.event_date);
                const validDate = !Number.isNaN(date.getTime());
                const featured = index === 0 && events.length >= 3;
                const total = Number(event.total_seats) || 0;
                const left = Number(event.available_seats) || 0;
                const soldPct = total > 0 ? ((total - left) / total) * 100 : 0;
                const venue = venueOf(event);
                const category = categoryOf(event.category);
                const CategoryIcon = category?.icon ?? Sparkles;
                const image = event.image || event.banner || CATEGORY_IMAGES[event.category] || HERO_IMAGE;
                const availability = event.is_cancelled
                  ? { label: 'Cancelled', tone: 'text-rose-300' }
                  : total === 0
                    ? { label: 'Seating opens soon', tone: 'text-[#9a9a9a]' }
                    : left === 0
                      ? { label: 'Sold out', tone: 'text-rose-300' }
                      : left / total <= 0.15
                        ? { label: `Only ${left} seats left`, tone: 'text-amber-300' }
                        : { label: `${left} seats available`, tone: 'text-emerald-300' };
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => handleEventClick(event.id, event.category)}
                    className={`group relative isolate flex flex-col justify-end overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141414] text-left transition-colors duration-200 hover:border-[#c4621a]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8824a] ${
                      featured ? 'min-h-[420px] md:col-span-2 lg:min-h-[460px]' : 'min-h-[400px]'
                    }`}
                  >
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      className={`absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${event.is_cancelled ? 'grayscale' : ''}`}
                    />
                    <div
                      className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(10,10,10,0.05)_0%,rgba(10,10,10,0.35)_40%,rgba(12,12,12,0.96)_100%)]"
                      aria-hidden="true"
                    />

                    <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
                      <CategoryIcon className="h-3.5 w-3.5 text-[#e8824a]" aria-hidden="true" />
                      {event.event_type_label || category?.label || event.category}
                    </span>
                    {validDate && (
                      <div className="absolute right-4 top-4 rounded-xl bg-black/55 px-3 py-2 text-center backdrop-blur">
                        <p className="font-eventra-display text-2xl leading-none">{date.getDate()}</p>
                        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#e8824a]">
                          {date.toLocaleDateString('en-IN', { month: 'short' })}
                        </p>
                      </div>
                    )}

                    <div className="p-5 sm:p-6">
                      <h3 className={`font-eventra-display font-medium leading-tight ${featured ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>
                        {event.name}
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70">
                        {validDate && (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4" aria-hidden="true" />
                            {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                            {date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                        {venue && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                            {venue}
                          </span>
                        )}
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm">
                        <span className={`inline-flex items-center gap-1.5 font-medium ${availability.tone}`}>
                          <Armchair className="h-4 w-4" aria-hidden="true" />
                          {availability.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-white/80">
                          <Star className="h-4 w-4 fill-[#e8824a] text-[#e8824a]" aria-hidden="true" />
                          {event.review_count > 0 ? (
                            <>
                              <span className="font-semibold tabular-nums">{Number(event.rating).toFixed(1)}</span>
                              <span className="text-white/50">({event.review_count})</span>
                            </>
                          ) : (
                            <span className="text-white/60">New</span>
                          )}
                        </span>
                      </div>
                      {total > 0 && left > 0 && !event.is_cancelled && (
                        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                          <div className="h-full rounded-full bg-[#e8824a]" style={{ width: `${soldPct}%` }} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {hasMore && (
              <div className="mt-12 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-[#f5f0e8] transition-colors hover:border-[#c4621a] hover:bg-[#c4621a] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Show more events'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default EventListPage;
