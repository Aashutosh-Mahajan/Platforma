import React from 'react';
import { Link } from 'react-router-dom';

const EventDetailsandBooking = () => {
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
<img alt="IPL Stadium" className="w-full h-[600px] object-cover transition-transform duration-700 group-hover:scale-105" data-alt="dramatic wide shot of a futuristic brightly lit cricket stadium at night filled with cheering crowds under a dark violet sky" src="https://lh3.googleusercontent.com/aida-public/AB6AXuChPHRggfiuV2J9ZtqQOXDE3Y8kRfAzLj-4hKoHaCdtSiXw9eBNB982N9Vsguvndlg_oGHqcr7F0vAE5D0QEOXiHLrdRb1E5jVrLRcoaVm9QNDLzeqmvWnrGv9-__hB7Y4GTxhtgKGwPp41Qm0lwqjK4Vtb6QRtCxQMuq9iy8sIghPYaDzam12faJPsTdD3Np-KIWqxSl1jvjsYnrFI08mraAoczeEgo8Ainrn8haO1glJ5vyPuy1lu18sZPxJYZncLH7i6MbYzfA"/>
<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
<div className="absolute bottom-8 left-8 text-white">
<span className="inline-block bg-eventra-primary px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4">Trending Now</span>
<h1 className="text-5xl font-black font-eventra-headline tracking-tight leading-tight">Championship Final: <br/>Titans vs. Knights</h1>
</div>
</div>

<div className="lg:col-span-4 sticky top-28 space-y-6">
<div className="bg-eventra-surface-container-lowest p-8 rounded-xl shadow-[0px_12px_32px_0px_rgba(84,38,228,0.04)] space-y-6">
<div className="space-y-2">
<h2 className="text-2xl font-bold font-eventra-headline tracking-tight">Event Details</h2>
<div className="flex items-center gap-3 text-eventra-on-surface-variant">
<span className="material-symbols-outlined text-eventra-primary">calendar_today</span>
<p className="font-eventra-label text-sm font-medium">Saturday, 24th May 2024</p>
</div>
<div className="flex items-center gap-3 text-eventra-on-surface-variant">
<span className="material-symbols-outlined text-eventra-primary">schedule</span>
<p className="font-eventra-label text-sm font-medium">07:30 PM Onwards</p>
</div>
<div className="flex items-center gap-3 text-eventra-on-surface-variant">
<span className="material-symbols-outlined text-eventra-primary">location_on</span>
<p className="font-eventra-label text-sm font-medium">Narendra Modi Stadium, Ahmedabad</p>
</div>
</div>
<div className="pt-6 border-t border-eventra-outline-variant/30">
<div className="flex justify-between items-end mb-6">
<div>
<p className="font-eventra-label text-xs text-eventra-on-surface-variant uppercase tracking-wider">Starts from</p>
<p className="text-3xl font-black text-eventra-primary font-eventra-headline">₹850.00</p>
</div>
<span className="font-eventra-label text-xs text-eventra-on-surface-variant">All taxes included</span>
</div>
<button className="w-full py-4 rounded-xl bg-gradient-to-r from-eventra-primary to-eventra-primary-container text-white font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-eventra-primary/20">
                            Book Tickets
                        </button>
</div>
</div>

<div className="bg-eventra-surface-container-low p-6 rounded-xl">
<p className="font-eventra-label text-sm italic leading-relaxed text-eventra-on-surface-variant">
                        "The most anticipated sporting event of the decade. A night of high-octane action and unparalleled entertainment."
                    </p>
</div>
</div>
</section>

<section className="grid grid-cols-1 md:grid-cols-3 gap-8">
<div className="md:col-span-2 space-y-6">
<h3 className="text-3xl font-black font-eventra-headline">About the Event</h3>
<div className="prose prose-on-surface max-w-none text-eventra-on-surface-variant font-eventra-label leading-relaxed space-y-4">
<p>Experience the electrifying finale of the premier league like never before. The Titans face off against the Knights in a battle for supreme glory at the iconic Ahmedabad venue. This isn't just a game; it's a spectacle of skill, strategy, and sheer will.</p>
<p>Expect a star-studded opening ceremony, immersive light shows, and a culinary experience curated by the city's finest chefs. Your ticket grants you access to the fan zones and multiple interactive entertainment booths around the stadium perimeter.</p>
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
<p className="font-eventra-label text-sm font-bold">Narendra Modi Stadium</p>
<p className="font-eventra-label text-sm text-eventra-on-surface-variant">Motera, Ahmedabad, Gujarat 380005, India</p>
</div>
</div>
</section>

<section className="space-y-8">
<div className="flex items-end justify-between">
<div>
<h3 className="text-3xl font-black font-eventra-headline">Select Tickets</h3>
<p className="font-eventra-label text-eventra-on-surface-variant">Choose your perfect view of the championship</p>
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

<div className="bg-eventra-surface-container-lowest p-6 rounded-xl border-2 border-transparent hover:border-eventra-primary/20 transition-all space-y-6 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.04)]">
<div className="flex justify-between items-start">
<div>
<h4 className="text-xl font-bold font-eventra-headline">North Stand</h4>
<p className="font-eventra-label text-xs text-eventra-on-surface-variant">Standard Entry</p>
</div>
<span className="text-2xl font-black text-eventra-on-surface">₹850</span>
</div>
<ul className="space-y-2">
<li className="flex items-center gap-2 text-xs font-eventra-label text-eventra-on-surface-variant">
<span className="material-symbols-outlined text-[16px] text-eventra-primary">check_circle</span> Unreserved Seating
                        </li>
<li className="flex items-center gap-2 text-xs font-eventra-label text-eventra-on-surface-variant">
<span className="material-symbols-outlined text-[16px] text-eventra-primary">check_circle</span> Food Court Access
                        </li>
</ul>
<div className="flex items-center justify-between pt-4">
<div className="flex items-center gap-4 bg-eventra-surface-container rounded-full px-3 py-1">
<button className="w-8 h-8 flex items-center justify-center font-bold text-eventra-on-surface">-</button>
<span className="font-eventra-label font-bold">0</span>
<button className="w-8 h-8 flex items-center justify-center font-bold text-eventra-on-surface">+</button>
</div>
<span className="font-eventra-label text-xs font-medium text-eventra-error">Only 12 left!</span>
</div>
</div>

<div className="bg-eventra-primary/5 p-6 rounded-xl border-2 border-eventra-primary/10 hover:border-eventra-primary transition-all space-y-6 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.06)] relative overflow-hidden">
<div className="absolute top-0 right-0 bg-eventra-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-tighter">Most Popular</div>
<div className="flex justify-between items-start">
<div>
<h4 className="text-xl font-bold font-eventra-headline">Grand Pavillion</h4>
<p className="font-eventra-label text-xs text-eventra-primary font-medium">Premium View</p>
</div>
<span className="text-2xl font-black text-eventra-primary">₹2,450</span>
</div>
<ul className="space-y-2">
<li className="flex items-center gap-2 text-xs font-eventra-label text-eventra-on-surface-variant">
<span className="material-symbols-outlined text-[16px] text-eventra-primary">check_circle</span> Cushioned Seats
                        </li>
<li className="flex items-center gap-2 text-xs font-eventra-label text-eventra-on-surface-variant">
<span className="material-symbols-outlined text-[16px] text-eventra-primary">check_circle</span> Priority Entry Lane
                        </li>
</ul>
<div className="flex items-center justify-between pt-4">
<div className="flex items-center gap-4 bg-white rounded-full px-3 py-1 shadow-sm">
<button className="w-8 h-8 flex items-center justify-center font-bold text-eventra-on-surface">-</button>
<span className="font-eventra-label font-bold text-eventra-primary">2</span>
<button className="w-8 h-8 flex items-center justify-center font-bold text-eventra-on-surface">+</button>
</div>
<span className="font-eventra-label text-xs font-medium text-eventra-on-surface-variant">In High Demand</span>
</div>
</div>

<div className="bg-eventra-surface-container-lowest p-6 rounded-xl border-2 border-transparent hover:border-eventra-primary/20 transition-all space-y-6 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.04)]">
<div className="flex justify-between items-start">
<div>
<h4 className="text-xl font-bold font-eventra-headline">VIP Lounge</h4>
<p className="font-eventra-label text-xs text-eventra-on-surface-variant">Ultra Luxury</p>
</div>
<span className="text-2xl font-black text-eventra-on-surface">₹7,999</span>
</div>
<ul className="space-y-2">
<li className="flex items-center gap-2 text-xs font-eventra-label text-eventra-on-surface-variant">
<span className="material-symbols-outlined text-[16px] text-eventra-primary">check_circle</span> Unlimited Buffet &amp; Drinks
                        </li>
<li className="flex items-center gap-2 text-xs font-eventra-label text-eventra-on-surface-variant">
<span className="material-symbols-outlined text-[16px] text-eventra-primary">check_circle</span> Meet &amp; Greet Opportunity
                        </li>
</ul>
<div className="flex items-center justify-between pt-4">
<div className="flex items-center gap-4 bg-eventra-surface-container rounded-full px-3 py-1">
<button className="w-8 h-8 flex items-center justify-center font-bold text-eventra-on-surface">-</button>
<span className="font-eventra-label font-bold">0</span>
<button className="w-8 h-8 flex items-center justify-center font-bold text-eventra-on-surface">+</button>
</div>
<span className="font-eventra-label text-xs font-medium text-eventra-on-surface-variant">Limited Capacity</span>
</div>
</div>
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
