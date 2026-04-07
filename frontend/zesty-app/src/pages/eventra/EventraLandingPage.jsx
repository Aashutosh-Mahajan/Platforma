import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventAPI } from '../../api/eventra';

const normalizeCategory = (rawCategory) => {
  const category = String(rawCategory || '').toLowerCase();

  if (category === 'movie' || category === 'theater' || category === 'theatre') {
    return 'movie';
  }

  if (category === 'concert' || category === 'comedy' || category === 'expo' || category === 'dining') {
    return 'concert';
  }

  return 'sports';
};

const categoryTitles = {
  sports: 'Live Sports',
  movie: 'Movies & Theater',
  concert: 'Concerts & Live Shows',
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date TBA';
  }

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const EventCard = ({ event }) => {
  const category = normalizeCategory(event.category);

  return (
    <Link
      to={`/eventra/events/${event.id}?category=${encodeURIComponent(event.category)}`}
      className="group block rounded-3xl border border-[#ddd5f7] bg-white p-4 shadow-[0px_14px_28px_rgba(84,38,228,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0px_18px_34px_rgba(84,38,228,0.14)]"
    >
      <div className="relative mb-4 h-44 overflow-hidden rounded-2xl bg-[#ece6fb]">
        {event.image ? (
          <img src={event.image} alt={event.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🎟️</div>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-[#5426e4] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          {category}
        </span>
      </div>

      <h3 className="font-eventra-headline text-xl font-black tracking-tight text-[#1f1b2d]">{event.name}</h3>
      <p className="mt-2 font-eventra-label text-sm text-[#5a5570]">{event.venue_name}</p>
      <p className="mt-1 font-eventra-label text-xs text-[#7a7591]">{formatDate(event.event_date)}</p>

      <div className="mt-4 flex items-center justify-between border-t border-[#ece7fb] pt-3">
        <span className="font-eventra-label text-xs font-semibold uppercase tracking-wide text-[#5426e4]">
          {event.available_seats > 0 ? `${event.available_seats} seats left` : 'Sold out'}
        </span>
        <span className="font-eventra-label text-sm font-bold text-[#1f1b2d]">Explore</span>
      </div>
    </Link>
  );
};

const EventraLandingPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await eventAPI.list({ ordering: 'event_date', page: 1, limit: 100 });
      setEvents(response.results || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load events right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadEvents();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, []);

  const groupedEvents = useMemo(() => {
    const groups = { sports: [], movie: [], concert: [] };

    for (const event of events) {
      const normalized = normalizeCategory(event.category);
      groups[normalized].push(event);
    }

    return groups;
  }, [events]);

  const heroEvent = events[0] || null;
  const trendingEvents = events.slice(0, 6);

  return (
    <div className="theme-eventra min-h-screen bg-[#fbf8fe] text-[#1b1b20]">
      <header className="sticky top-0 z-40 border-b border-[#ebe5fb] bg-[#fbf8fe]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/eventra" className="font-eventra-headline text-2xl font-black italic tracking-tight text-[#5426e4]">
            Eventra
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/eventra/events"
              className="rounded-full border border-[#d8cff6] px-4 py-2 font-eventra-label text-sm font-semibold text-[#5426e4] transition-colors hover:bg-[#f3efff]"
            >
              Browse All
            </Link>
            <Link
              to="/eventra/bookings"
              className="rounded-full bg-[#5426e4] px-4 py-2 font-eventra-label text-sm font-semibold text-white transition-colors hover:bg-[#4a20ca]"
            >
              My Bookings
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-[#e7e0fb] bg-white">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#5426e4]"></div>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <p className="font-eventra-label text-sm text-red-800">{error}</p>
            <button
              type="button"
              onClick={loadEvents}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 font-eventra-label text-sm font-semibold text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : null}

        {!loading && !error && heroEvent ? (
          <section className="relative overflow-hidden rounded-[2rem] border border-[#d9cff7] bg-white shadow-[0px_18px_40px_rgba(84,38,228,0.12)]">
            <div className="relative h-[360px] sm:h-[420px]">
              {heroEvent.banner || heroEvent.image ? (
                <img
                  src={heroEvent.banner || heroEvent.image}
                  alt={heroEvent.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#ece6fb] text-6xl">🎭</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-[#1a122f]/85 via-[#1a122f]/50 to-transparent"></div>
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <span className="inline-block rounded-full bg-[#5426e4] px-3 py-1 font-eventra-label text-[11px] font-bold uppercase tracking-wider text-white">
                  Featured Event
                </span>
                <h1 className="mt-3 max-w-2xl font-eventra-headline text-3xl font-black tracking-tight text-white sm:text-5xl">
                  {heroEvent.name}
                </h1>
                <p className="mt-3 max-w-2xl font-eventra-label text-sm text-white/90 sm:text-base">
                  {heroEvent.venue_name} • {formatDate(heroEvent.event_date)}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    to={`/eventra/events/${heroEvent.id}?category=${encodeURIComponent(heroEvent.category)}`}
                    className="rounded-xl bg-[#5426e4] px-5 py-3 font-eventra-label text-sm font-bold text-white transition-colors hover:bg-[#4a20ca]"
                  >
                    Book Tickets
                  </Link>
                  <Link
                    to="/eventra/events"
                    className="rounded-xl border border-white/40 bg-white/10 px-5 py-3 font-eventra-label text-sm font-bold text-white backdrop-blur-md transition-colors hover:bg-white/20"
                  >
                    Explore More
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {!loading && !error && events.length === 0 ? (
          <section className="rounded-3xl border border-[#e7e0fb] bg-white p-10 text-center">
            <h2 className="font-eventra-headline text-2xl font-black text-[#1f1b2d]">No live events yet</h2>
            <p className="mt-2 font-eventra-label text-sm text-[#6b6683]">Publish events from the organizer dashboard to see them here.</p>
          </section>
        ) : null}

        {!loading && !error && trendingEvents.length > 0 ? (
          <section>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="font-eventra-label text-xs font-bold uppercase tracking-[0.18em] text-[#7e73ab]">Discover</p>
                <h2 className="font-eventra-headline text-3xl font-black tracking-tight text-[#1f1b2d]">Trending Right Now</h2>
              </div>
              <Link to="/eventra/events" className="font-eventra-label text-sm font-bold text-[#5426e4] hover:underline">
                View all
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {trendingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        ) : null}

        {!loading && !error
          ? Object.entries(groupedEvents).map(([category, categoryEvents]) => (
              <section key={category}>
                <div className="mb-4 flex items-end justify-between">
                  <h3 className="font-eventra-headline text-2xl font-black tracking-tight text-[#1f1b2d]">
                    {categoryTitles[category]}
                  </h3>
                  <Link to={`/eventra/events?category=${category}`} className="font-eventra-label text-sm font-semibold text-[#5426e4] hover:underline">
                    See category
                  </Link>
                </div>

                {categoryEvents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d8cff6] bg-white p-5 font-eventra-label text-sm text-[#746f8c]">
                    No {categoryTitles[category].toLowerCase()} published yet.
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {categoryEvents.slice(0, 3).map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </section>
            ))
          : null}
      </main>
    </div>
  );
};

export default EventraLandingPage;
