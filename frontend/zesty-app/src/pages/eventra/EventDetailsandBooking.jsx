import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { eventAPI } from '../../api/eventra';

const EVENT_CONTENT_BY_TYPE = {
  sports: {
    heroAlt: 'IPL Stadium',
    heroImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuChPHRggfiuV2J9ZtqQOXDE3Y8kRfAzLj-4hKoHaCdtSiXw9eBNB982N9Vsguvndlg_oGHqcr7F0vAE5D0QEOXiHLrdRb1E5jVrLRcoaVm9QNDLzeqmvWnrGv9-__hB7Y4GTxhtgKGwPp41Qm0lwqjK4Vtb6QRtCxQMuq9iy8sIghPYaDzam12faJPsTdD3Np-KIWqxSl1jvjsYnrFI08mraAoczeEgo8Ainrn8haO1glJ5vyPuy1lu18sZPxJYZncLH7i6MbYzfA',
    badge: 'Trending Now',
    title: 'Championship Final: Titans vs. Knights',
    date: 'Saturday, 24th May 2024',
    time: '07:30 PM Onwards',
    venue: 'Narendra Modi Stadium, Ahmedabad',
    price: '₹850.00',
    quote:
      'The most anticipated sporting event of the decade. A night of high-octane action and unparalleled entertainment.',
    aboutOne:
      "Experience the electrifying finale of the premier league like never before. The Titans face off against the Knights in a battle for supreme glory at the iconic Ahmedabad venue. This is not just a game; it is a spectacle of skill, strategy, and sheer will.",
    aboutTwo:
      'Expect a star-studded opening ceremony, immersive light shows, and a culinary experience curated by the city\'s finest chefs. Your ticket grants you access to fan zones and multiple interactive entertainment booths around the stadium perimeter.',
  },
  movie: {
    heroAlt: 'Cinema Hall',
    heroImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBsXrFL2YoIhunLapQ4PpIrwI-K_F07vleSbX9QjnIEYUQ5qYvqNH-efuJcQdK84_X2JGAt9jyZCMHapaVchhojvjuQ1CiTkWve_HrF5qDq1Y22hpQj8LXsxOyDYATxokfTTo5y2A9C1S5lWR2vZWQffm_Azkq0dI5fEG_4A5SYfDxvwXjiy7gvq6me6FFqi5aNt3WOWj_7Utfgbo8NbdgwXenuWj3CqvYntBsIBaWaOuKNuO_0xAHvi670OnTR6G9sWDpUc5Bb9Q',
    badge: 'Now Showing',
    title: 'Interstellar: 10th Anniversary',
    date: 'Friday, 12th July 2024',
    time: '08:45 PM Show',
    venue: 'Grand Cinema, Hall 04, New Delhi',
    price: '₹320.00',
    quote:
      'A premium big-screen experience with immersive sound, curated for movie lovers.',
    aboutOne:
      'Relive one of cinema\'s most iconic space epics in a special anniversary screening with enhanced IMAX visuals and remastered surround sound.',
    aboutTwo:
      'Choose from premium recliners, gold, and silver sections. Snacks, lounge access, and express entry are available with selected ticket tiers.',
  },
  concert: {
    heroAlt: 'Live Concert Arena',
    heroImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAhO1HteUR8e2T2AuVcWyQuoSj0HO_k2JA5KiIJSyZ3QHDDHZTmKhN1t98h2oeJ4CYvOAcjMzG01knzbxIMZ9XY8Msth6m7yVU-Y8Tk4OcjvO2naHgtzgXLQdw2u30JzJi7H88MxA6pRRarWPl8pHi0HakMifs5Jsb8ZqpChmsfatgM1qpp2ZaLMtZEWD0-Ppm2i75jxvHp7XIGYbY7O866INL3VkmtKc5uZo7OhkkRTiJZ-k2vf0ERYR4W3ayLMDlyvtdz0AlOhA',
    badge: 'Live Tonight',
    title: 'Midnight Echoes: Live in London',
    date: 'Saturday, 24th Aug 2024',
    time: '08:00 PM Gates Open',
    venue: 'Royal Arena Ground, London',
    price: '₹1,499.00',
    quote:
      'A massive open-ground concert experience with unforgettable sound and lights.',
    aboutOne:
      'Feel the energy of a full-scale live performance with fan-pit zones, panoramic stage design, and synchronized visual effects throughout the night.',
    aboutTwo:
      'Ground sections, lounge decks, and fast-track entries are available to suit every concert vibe, from front-row immersion to premium comfort.',
  },
};

const TICKET_CONTENT_BY_TYPE = {
  sports: [
    {
      name: 'North Stand',
      subtitle: 'Standard Entry',
      price: '₹850',
      perks: ['Unreserved Seating', 'Food Court Access'],
      availability: 'Only 12 left!',
      popular: false,
      selectedCount: 0,
    },
    {
      name: 'Grand Pavilion',
      subtitle: 'Premium View',
      price: '₹2,450',
      perks: ['Cushioned Seats', 'Priority Entry Lane'],
      availability: 'In High Demand',
      popular: true,
      selectedCount: 2,
    },
    {
      name: 'VIP Lounge',
      subtitle: 'Ultra Luxury',
      price: '₹7,999',
      perks: ['Unlimited Buffet & Drinks', 'Meet & Greet Opportunity'],
      availability: 'Limited Capacity',
      popular: false,
      selectedCount: 0,
    },
  ],
  movie: [
    {
      name: 'Silver Row',
      subtitle: 'Classic Cinema',
      price: '₹320',
      perks: ['Standard Recliner', 'Snack Counter Access'],
      availability: 'Best for groups',
      popular: false,
      selectedCount: 0,
    },
    {
      name: 'Gold Row',
      subtitle: 'Center View',
      price: '₹540',
      perks: ['Center Aligned Seats', 'Faster Entry Lane'],
      availability: 'Most Booked',
      popular: true,
      selectedCount: 2,
    },
    {
      name: 'Platinum Recliner',
      subtitle: 'Premium Comfort',
      price: '₹920',
      perks: ['Wide Recliner Seats', 'Lounge Beverage Voucher'],
      availability: 'Limited seats',
      popular: false,
      selectedCount: 0,
    },
  ],
  concert: [
    {
      name: 'General Ground',
      subtitle: 'Open Ground Access',
      price: '₹1,499',
      perks: ['Open Standing Zone', 'Food Court Access'],
      availability: 'Selling Fast',
      popular: false,
      selectedCount: 0,
    },
    {
      name: 'Fan Pit',
      subtitle: 'Closest to Stage',
      price: '₹2,999',
      perks: ['Front Zone Access', 'Early Entry Lane'],
      availability: 'Most Popular',
      popular: true,
      selectedCount: 2,
    },
    {
      name: 'VIP Lounge Deck',
      subtitle: 'Premium Deck View',
      price: '₹6,499',
      perks: ['Elevated Deck Seating', 'Dedicated Bar Counter'],
      availability: 'Limited Capacity',
      popular: false,
      selectedCount: 0,
    },
  ],
};

const normalizeEventType = (rawType) => {
  const value = (rawType || '').toLowerCase();

  if (['movie', 'movies', 'cinema', 'theater', 'theatre'].includes(value)) {
    return 'movie';
  }

  if (['concert', 'music', 'ground', 'comedy', 'expo', 'dining'].includes(value)) {
    return 'concert';
  }

  return 'sports';
};

const parseNumericId = (rawId) => {
  const parsed = Number(rawId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const formatCurrencyInr = (rawValue) => {
  const value = Number(rawValue);
  if (Number.isNaN(value)) {
    return null;
  }

  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const splitBenefits = (benefitsText) => {
  const parsed = String(benefitsText || '')
    .split(/[,|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  return parsed.length > 0 ? parsed : ['Standard event access'];
};

const formatEventDateParts = (rawDate) => {
  if (!rawDate) {
    return { date: null, time: null };
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return { date: null, time: null };
  }

  return {
    date: date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
};

const EventDetailsandBooking = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const numericEventId = useMemo(() => parseNumericId(id), [id]);

  const [backendEvent, setBackendEvent] = useState(null);

  useEffect(() => {
    let isMounted = true;

    if (!numericEventId) {
      setBackendEvent(null);
      return () => {
        isMounted = false;
      };
    }

    eventAPI
      .retrieve(numericEventId)
      .then((eventData) => {
        if (!isMounted) {
          return;
        }
        setBackendEvent(eventData);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setBackendEvent(null);
      });

    return () => {
      isMounted = false;
    };
  }, [numericEventId]);

  const eventType = normalizeEventType(
    searchParams.get('category') || searchParams.get('type') || backendEvent?.category
  );

  const fallbackEventContent = EVENT_CONTENT_BY_TYPE[eventType];
  const dynamicDateParts = formatEventDateParts(backendEvent?.event_date);

  const startingPrice = useMemo(() => {
    const ticketTypes = backendEvent?.ticket_types || [];
    if (ticketTypes.length === 0) {
      return null;
    }

    const prices = ticketTypes
      .map((ticketType) => Number(ticketType.price))
      .filter((price) => !Number.isNaN(price));

    if (prices.length === 0) {
      return null;
    }

    return formatCurrencyInr(Math.min(...prices));
  }, [backendEvent]);

  const eventContent = useMemo(() => {
    if (!backendEvent) {
      return fallbackEventContent;
    }

    const shortDescription = backendEvent.description
      ? `${backendEvent.description.slice(0, 160)}${backendEvent.description.length > 160 ? '...' : ''}`
      : fallbackEventContent.quote;

    return {
      ...fallbackEventContent,
      heroImage: backendEvent.banner || backendEvent.image || fallbackEventContent.heroImage,
      title: backendEvent.name || fallbackEventContent.title,
      venue: backendEvent.venue_name || fallbackEventContent.venue,
      date: dynamicDateParts.date || fallbackEventContent.date,
      time: dynamicDateParts.time || fallbackEventContent.time,
      price: startingPrice || fallbackEventContent.price,
      quote: shortDescription,
      aboutOne: backendEvent.description || fallbackEventContent.aboutOne,
      aboutTwo: `Category: ${backendEvent.category || eventType} • Available seats: ${backendEvent.available_seats}`,
      badge: `${(backendEvent.category || eventType).toUpperCase()} EVENT`,
    };
  }, [backendEvent, dynamicDateParts.date, dynamicDateParts.time, eventType, fallbackEventContent, startingPrice]);

  const ticketCards = useMemo(() => {
    if (!backendEvent?.ticket_types?.length) {
      return TICKET_CONTENT_BY_TYPE[eventType];
    }

    return backendEvent.ticket_types.map((ticketType, index) => {
      const availabilityCount = Number(ticketType.quantity_available);
      const availability =
        Number.isNaN(availabilityCount)
          ? 'Limited availability'
          : availabilityCount > 0
            ? `${availabilityCount} left`
            : 'Sold Out';

      return {
        name: ticketType.name,
        subtitle: ticketType.description || 'Ticket Access',
        price: formatCurrencyInr(ticketType.price) || fallbackEventContent.price,
        perks: splitBenefits(ticketType.benefits),
        availability,
        popular: index === 0,
        selectedCount: 0,
      };
    });
  }, [backendEvent, eventType, fallbackEventContent.price]);

  const handleBookTickets = () => {
    const eventId = numericEventId ? String(numericEventId) : id || 'featured-event';
    navigate(`/eventra/events/${eventId}/seats?category=${eventType}`);
  };

  return (
    <div className="theme-eventra eventra-scrollbar selection:bg-eventra-primary-fixed selection:text-eventra-on-primary-fixed bg-eventra-background min-h-screen text-eventra-on-surface font-eventra-body">
      

<header className="bg-[#fbf8fe]/60 dark:bg-[#1c1b1f]/60 backdrop-blur-xl dock full-width top-0 sticky z-50 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.06)]">
<div className="flex justify-between items-center w-full px-8 py-4 max-w-[1440px] mx-auto">
<div className="flex items-center gap-12">
<span className="text-2xl font-black text-[#5426e4] dark:text-[#d0bcff] italic">Eventra</span>
<nav className="hidden md:flex gap-8 items-center">
<a className="font-medium Be Vietnam Pro text-[#49454f] dark:text-[#cac4d0] hover:text-[#5426e4] hover:bg-[#f5f3f9] dark:hover:bg-[#49454f] transition-all duration-300" href="#">For you</a>
<a className="font-medium Be Vietnam Pro text-[#49454f] dark:text-[#cac4d0] hover:text-[#5426e4] hover:bg-[#f5f3f9] dark:hover:bg-[#49454f] transition-all duration-300" href="#">Dining</a>
<a className="font-medium Be Vietnam Pro text-[#49454f] dark:text-[#cac4d0] hover:text-[#5426e4] hover:bg-[#f5f3f9] dark:hover:bg-[#49454f] transition-all duration-300" href="#">Movies</a>
<a className="font-bold border-b-2 border-[#5426e4] pb-1 text-[#5426e4] dark:text-[#d0bcff] transition-all duration-300" href="#">Events</a>
<a className="font-medium Be Vietnam Pro text-[#49454f] dark:text-[#cac4d0] hover:text-[#5426e4] hover:bg-[#f5f3f9] dark:hover:bg-[#49454f] transition-all duration-300" href="#">IPL</a>
<a className="font-medium Be Vietnam Pro text-[#49454f] dark:text-[#cac4d0] hover:text-[#5426e4] hover:bg-[#f5f3f9] dark:hover:bg-[#49454f] transition-all duration-300" href="#">Stores</a>
</nav>
</div>
<div className="flex items-center gap-6">
<div className="hidden lg:flex items-center bg-eventra-surface-container rounded-full px-4 py-2">
<span className="material-symbols-outlined text-eventra-on-surface-variant mr-2">search</span>
<input className="bg-transparent border-none focus:ring-0 text-sm w-48" placeholder="Search events..." type="text"/>
</div>
<div className="flex gap-4 items-center">
<button className="material-symbols-outlined text-[#49454f] scale-105 active:scale-95 transition-transform">location_on</button>
<button className="material-symbols-outlined text-[#49454f] scale-105 active:scale-95 transition-transform">account_circle</button>
</div>
</div>
</div>
</header>
<main className="max-w-[1440px] mx-auto px-8 py-12 space-y-24">

<section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
<div className="lg:col-span-8 group relative overflow-hidden rounded-xl shadow-[0px_12px_32px_0px_rgba(84,38,228,0.1)]">
<img alt={eventContent.heroAlt} className="w-full h-[600px] object-cover transition-transform duration-700 group-hover:scale-105" data-alt="featured event artwork" src={eventContent.heroImage}/>
<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
<div className="absolute bottom-8 left-8 text-white">
<span className="inline-block bg-eventra-primary px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4">{eventContent.badge}</span>
<h1 className="text-5xl font-black font-eventra-headline tracking-tight leading-tight">{eventContent.title}</h1>
</div>
</div>

<div className="lg:col-span-4 sticky top-28 space-y-6">
<div className="bg-eventra-surface-container-lowest p-8 rounded-xl shadow-[0px_12px_32px_0px_rgba(84,38,228,0.04)] space-y-6">
<div className="space-y-2">
<h2 className="text-2xl font-bold font-eventra-headline tracking-tight">Event Details</h2>
<div className="flex items-center gap-3 text-eventra-on-surface-variant">
<span className="material-symbols-outlined text-eventra-primary">calendar_today</span>
<p className="font-eventra-label text-sm font-medium">{eventContent.date}</p>
</div>
<div className="flex items-center gap-3 text-eventra-on-surface-variant">
<span className="material-symbols-outlined text-eventra-primary">schedule</span>
<p className="font-eventra-label text-sm font-medium">{eventContent.time}</p>
</div>
<div className="flex items-center gap-3 text-eventra-on-surface-variant">
<span className="material-symbols-outlined text-eventra-primary">location_on</span>
<p className="font-eventra-label text-sm font-medium">{eventContent.venue}</p>
</div>
</div>
<div className="pt-6 border-t border-eventra-outline-variant/30">
<div className="flex justify-between items-end mb-6">
<div>
<p className="font-eventra-label text-xs text-eventra-on-surface-variant uppercase tracking-wider">Starts from</p>
<p className="text-3xl font-black text-eventra-primary font-eventra-headline">{eventContent.price}</p>
</div>
<span className="font-eventra-label text-xs text-eventra-on-surface-variant">All taxes included</span>
</div>
<button onClick={handleBookTickets} className="w-full py-4 rounded-xl bg-gradient-to-r from-eventra-primary to-eventra-primary-container text-white font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-eventra-primary/20">
                            Book Tickets
                        </button>
</div>
</div>

<div className="bg-eventra-surface-container-low p-6 rounded-xl">
<p className="font-eventra-label text-sm italic leading-relaxed text-eventra-on-surface-variant">
            "{eventContent.quote}"
                    </p>
</div>
</div>
</section>

<section className="grid grid-cols-1 md:grid-cols-3 gap-8">
<div className="md:col-span-2 space-y-6">
<h3 className="text-3xl font-black font-eventra-headline">About the Event</h3>
<div className="prose prose-on-surface max-w-none text-eventra-on-surface-variant font-eventra-label leading-relaxed space-y-4">
<p>{eventContent.aboutOne}</p>
<p>{eventContent.aboutTwo}</p>
</div>
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8">
<div className="flex flex-col items-center p-4 bg-eventra-surface-container-low rounded-xl text-center space-y-2">
<span className="material-symbols-outlined text-eventra-primary">fastfood</span>
<span className="font-eventra-label text-xs font-semibold">Food Court</span>
</div>
<div className="flex flex-col items-center p-4 bg-eventra-surface-container-low rounded-xl text-center space-y-2">
<span className="material-symbols-outlined text-eventra-primary">local_parking</span>
<span className="font-eventra-label text-xs font-semibold">Valet Parking</span>
</div>
<div className="flex flex-col items-center p-4 bg-eventra-surface-container-low rounded-xl text-center space-y-2">
<span className="material-symbols-outlined text-eventra-primary">medical_services</span>
<span className="font-eventra-label text-xs font-semibold">First Aid</span>
</div>
<div className="flex flex-col items-center p-4 bg-eventra-surface-container-low rounded-xl text-center space-y-2">
<span className="material-symbols-outlined text-eventra-primary">wifi</span>
<span className="font-eventra-label text-xs font-semibold">High-speed Wi-Fi</span>
</div>
</div>
</div>
<div className="space-y-6">
<h3 className="text-3xl font-black font-eventra-headline">Venue Location</h3>
<div className="h-64 rounded-xl overflow-hidden shadow-sm relative group">
<img alt="Map location" className="w-full h-full object-cover" data-alt="clean minimal stylized map of Ahmedabad city showing major roads and stadium marker in soft violet and white tones" data-location="Ahmedabad" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUCD1lRlLXgenbEJzmWmpEWuqlYSaRCkDjBxUAadvaAObRKkGox6KbTaKJZutlGI39Ns5Ak3G8CaEaftE77lPmQ_pt9AiaqhSK7KJAHinbWV6eu-KLy8xMw-YOdb80Ra59HoH1jk7MR3M9h8lY73cEDod9w_CC6ZO_2Up3o8sU3vLwF9jHrO_2qwlxbr2PmaXWy8-d_c76vEdY2zgzBtoMW-XpAhNkq5UkAWN9plkuTa3xtc7F2GGU5cGvVUYwJ7QLUwRtOUBccQ"/>
<div className="absolute inset-0 bg-eventra-primary/10 group-hover:bg-transparent transition-colors"></div>
<div className="absolute bottom-4 left-4 right-4">
<a className="block w-full text-center py-3 bg-eventra-surface-container-lowest/90 backdrop-blur-md rounded-lg font-eventra-label text-sm font-bold text-eventra-primary shadow-lg" href="#">Get Directions</a>
</div>
</div>
<div className="space-y-2">
<p className="font-eventra-label text-sm font-bold">{eventContent.venue}</p>
<p className="font-eventra-label text-sm text-eventra-on-surface-variant">Verified venue listing on Eventra</p>
</div>
</div>
</section>

<section className="space-y-8">
<div className="flex items-end justify-between">
<div>
<h3 className="text-3xl font-black font-eventra-headline">Select Tickets</h3>
<p className="font-eventra-label text-eventra-on-surface-variant">Choose your perfect view of the event</p>
</div>
<div className="hidden sm:flex gap-4">
<span className="flex items-center gap-2 font-eventra-label text-xs text-eventra-on-surface-variant">
<span className="w-3 h-3 rounded-full bg-eventra-primary/20"></span> Available
                    </span>
<span className="flex items-center gap-2 font-eventra-label text-xs text-eventra-on-surface-variant">
<span className="w-3 h-3 rounded-full bg-eventra-error/20"></span> Selling Fast
                    </span>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
{ticketCards.map((ticketCard) => (
<div key={ticketCard.name} className={`p-6 rounded-xl border-2 transition-all space-y-6 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.04)] ${ticketCard.popular ? 'bg-eventra-primary/5 border-eventra-primary/10 hover:border-eventra-primary relative overflow-hidden' : 'bg-eventra-surface-container-lowest border-transparent hover:border-eventra-primary/20'}`}>
{ticketCard.popular ? <div className="absolute top-0 right-0 bg-eventra-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-tighter">Most Popular</div> : null}
<div className="flex justify-between items-start">
<div>
<h4 className="text-xl font-bold font-eventra-headline">{ticketCard.name}</h4>
<p className={`font-eventra-label text-xs ${ticketCard.popular ? 'text-eventra-primary font-medium' : 'text-eventra-on-surface-variant'}`}>{ticketCard.subtitle}</p>
</div>
<span className={`text-2xl font-black ${ticketCard.popular ? 'text-eventra-primary' : 'text-eventra-on-surface'}`}>{ticketCard.price}</span>
</div>
<ul className="space-y-2">
{ticketCard.perks.map((perk) => (
<li key={perk} className="flex items-center gap-2 text-xs font-eventra-label text-eventra-on-surface-variant">
<span className="material-symbols-outlined text-[16px] text-eventra-primary">check_circle</span> {perk}
                        </li>
))}
</ul>
<div className="flex items-center justify-between pt-4">
<div className={`flex items-center gap-4 rounded-full px-3 py-1 ${ticketCard.popular ? 'bg-white shadow-sm' : 'bg-eventra-surface-container'}`}>
<button type="button" className="w-8 h-8 flex items-center justify-center font-bold text-eventra-on-surface">-</button>
<span className={`font-eventra-label font-bold ${ticketCard.popular ? 'text-eventra-primary' : ''}`}>{ticketCard.selectedCount}</span>
<button type="button" className="w-8 h-8 flex items-center justify-center font-bold text-eventra-on-surface">+</button>
</div>
<span className={`font-eventra-label text-xs font-medium ${ticketCard.availability.includes('left') ? 'text-eventra-error' : 'text-eventra-on-surface-variant'}`}>{ticketCard.availability}</span>
</div>
</div>
))}
</div>
</section>
</main>

<footer className="bg-[#f5f3f9] dark:bg-[#1c1b1f] w-full mt-20">
<div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-12 py-16 max-w-[1440px] mx-auto">
<div className="space-y-4">
<span className="text-xl font-black text-[#5426e4]">Eventra</span>
<p className="font-medium Be Vietnam Pro text-sm text-[#49454f]">Curating the world's most exclusive experiences. Your gateway to culture, entertainment, and sport.</p>
</div>
<div className="space-y-4">
<h5 className="font-bold text-[#5426e4] text-sm uppercase tracking-widest">Company</h5>
<ul className="space-y-2">
<li><a className="font-medium Be Vietnam Pro text-sm text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline opacity-80 hover:opacity-100 transition-all" href="#">About Us</a></li>
<li><a className="font-medium Be Vietnam Pro text-sm text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline opacity-80 hover:opacity-100 transition-all" href="#">Careers</a></li>
<li><a className="font-medium Be Vietnam Pro text-sm text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline opacity-80 hover:opacity-100 transition-all" href="#">Support</a></li>
</ul>
</div>
<div className="space-y-4">
<h5 className="font-bold text-[#5426e4] text-sm uppercase tracking-widest">Legal</h5>
<ul className="space-y-2">
<li><a className="font-medium Be Vietnam Pro text-sm text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline opacity-80 hover:opacity-100 transition-all" href="#">Terms &amp; Conditions</a></li>
<li><a className="font-medium Be Vietnam Pro text-sm text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline opacity-80 hover:opacity-100 transition-all" href="#">Privacy Policy</a></li>
<li><a className="font-medium Be Vietnam Pro text-sm text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline opacity-80 hover:opacity-100 transition-all" href="#">Cookie Policy</a></li>
</ul>
</div>
<div className="space-y-4">
<h5 className="font-bold text-[#5426e4] text-sm uppercase tracking-widest">Stay Updated</h5>
<div className="flex">
<input className="bg-eventra-surface-container-high border-none rounded-l-xl px-4 py-2 text-sm w-full focus:ring-1 focus:ring-eventra-primary" placeholder="Email address" type="email"/>
<button className="bg-eventra-primary text-white px-4 py-2 rounded-r-xl material-symbols-outlined">send</button>
</div>
</div>
</div>
<div className="border-t border-eventra-outline-variant/20 max-w-[1440px] mx-auto py-8 px-12 flex flex-col md:flex-row justify-between items-center gap-4">
<p className="font-medium Be Vietnam Pro text-sm text-[#49454f]">© 2024 Eventra. The Digital Curator.</p>
<div className="flex gap-6">
<span className="material-symbols-outlined text-[#49454f] hover:text-[#5426e4] cursor-pointer">social_leaderboard</span>
<span className="material-symbols-outlined text-[#49454f] hover:text-[#5426e4] cursor-pointer">brand_awareness</span>
<span className="material-symbols-outlined text-[#49454f] hover:text-[#5426e4] cursor-pointer">public</span>
</div>
</div>
</footer>

    </div>
  );
};

export default EventDetailsandBooking;
