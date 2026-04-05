import React from 'react';
import { useNavigate } from 'react-router-dom';

const ConcertSeatSelection = () => {
  const navigate = useNavigate();
  return (
    <div className="theme-eventra eventra-scrollbar selection:bg-eventra-primary-fixed selection:text-eventra-on-primary-fixed bg-eventra-background min-h-screen text-eventra-on-surface font-eventra-body">
      

<header className="bg-[#fbf8fe]/60 dark:bg-[#1c1b1f]/60 backdrop-blur-xl dock full-width top-0 sticky z-50 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.06)]">
<nav className="flex justify-between items-center w-full px-8 py-4 max-w-[1440px] mx-auto">
<div className="text-2xl font-black text-[#5426e4] dark:text-[#d0bcff] italic">Eventra</div>
<div className="hidden md:flex items-center gap-8">
<a className="text-[#5426e4] dark:text-[#d0bcff] font-bold border-b-2 border-[#5426e4] pb-1 font-eventra-label text-sm uppercase tracking-wider" href="#">Events</a>
<a className="text-[#49454f] dark:text-[#cac4d0] hover:text-[#5426e4] transition-all duration-300 font-eventra-label text-sm uppercase tracking-wider" href="#">Dining</a>
<a className="text-[#49454f] dark:text-[#cac4d0] hover:text-[#5426e4] transition-all duration-300 font-eventra-label text-sm uppercase tracking-wider" href="#">Movies</a>
</div>
<div className="flex items-center gap-4">
<button onClick={() => navigate("/eventra/checkout")} className="material-symbols-outlined p-2 hover:bg-[#f5f3f9] rounded-full transition-all duration-300 text-eventra-on-surface-variant" data-icon="location_on">location_on</button>
<button onClick={() => navigate("/eventra/checkout")} className="material-symbols-outlined p-2 hover:bg-[#f5f3f9] rounded-full transition-all duration-300 text-eventra-on-surface-variant" data-icon="account_circle">account_circle</button>
</div>
</nav>
</header>
<main className="max-w-[1440px] mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">

<section className="lg:col-span-8 flex flex-col gap-10">
<div className="flex items-center justify-between">
<div>
<h1 className="text-4xl font-black font-eventra-headline tracking-tight text-eventra-on-surface mb-2">Select Your Section</h1>
<p className="font-eventra-label text-eventra-on-surface-variant text-sm">Choose a zone to view available seating and pricing</p>
</div>
<div className="flex gap-4">
<div className="flex items-center gap-2">
<span className="w-3 h-3 rounded-full bg-eventra-primary-container"></span>
<span className="text-xs font-eventra-label text-eventra-on-surface-variant uppercase tracking-tighter">Available</span>
</div>
<div className="flex items-center gap-2">
<span className="w-3 h-3 rounded-full bg-eventra-surface-container-highest"></span>
<span className="text-xs font-eventra-label text-eventra-on-surface-variant uppercase tracking-tighter">Sold Out</span>
</div>
</div>
</div>

<div className="bg-eventra-surface-container-low p-12 rounded-[2rem] aspect-[16/10] flex items-center justify-center relative overflow-hidden">

<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-gradient-to-br from-eventra-primary/5 via-transparent to-transparent pointer-events-none"></div>
<svg className="w-full h-full drop-shadow-2xl" viewbox="0 0 800 500">

<rect className="fill-on-surface" height="60" rx="8" width="300" x="250" y="20"></rect>
<text className="fill-surface text-xs font-bold font-eventra-headline" text-anchor="middle" x="400" y="55">STAGE</text>

<path className="venue-path cursor-pointer transition-all duration-300 fill-primary-container" d="M220 100 H580 Q600 100 600 120 V180 Q600 200 580 200 H220 Q200 200 200 180 V120 Q200 100 220 100"></path>
<text className="fill-white text-sm font-bold pointer-events-none" text-anchor="middle" x="400" y="155">FAN PIT</text>

<path className="venue-path cursor-pointer transition-all duration-300 fill-[#d0bcff]" d="M40 120 H160 Q180 120 180 140 V240 Q180 260 160 260 H40 Q20 260 20 240 V140 Q20 120 40 120"></path>
<text className="fill-primary text-xs font-black pointer-events-none" text-anchor="middle" x="100" y="200">VIP LOUNGE L</text>

<path className="venue-path cursor-pointer transition-all duration-300 fill-[#d0bcff]" d="M640 120 H760 Q780 120 780 140 V240 Q780 260 760 260 H640 Q620 260 620 240 V140 Q620 120 640 120"></path>
<text className="fill-primary text-xs font-black pointer-events-none" text-anchor="middle" x="700" y="200">VIP LOUNGE R</text>

<path className="venue-path cursor-pointer transition-all duration-300 fill-surface-container-highest" d="M120 240 H680 Q700 240 700 260 V400 Q700 420 680 420 H120 Q100 420 100 400 V260 Q100 240 120 240"></path>
<text className="fill-on-surface-variant text-sm font-bold pointer-events-none" text-anchor="middle" x="400" y="340">GENERAL ADMISSION</text>

<path className="venue-path cursor-pointer transition-all duration-300 fill-tertiary-fixed" d="M50 440 H750 Q770 440 770 450 V480 H30 V450 Q30 440 50 440"></path>
<text className="fill-tertiary text-xs font-bold pointer-events-none" text-anchor="middle" x="400" y="465">BALCONY TIER 1</text>
</svg>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div className="bg-eventra-surface-container-lowest p-6 rounded-2xl flex items-center gap-6 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.04)] hover:scale-[1.02] transition-transform">
<img className="w-24 h-24 rounded-xl object-cover shrink-0" data-alt="vibrant blue and purple lights from a concert stage perspective standing in the front row fan pit area" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-vZZDZLy6kzHfi2hb1q3WPwmW-c2gmsU1wIfWb7QnxOcxULyXQbHcPADCNANNMolFSUanmWBlOkdbGBMWIPoL8axT4NTZ8KHoXrxDosw4mc7H0pMnliWfxpfcuPF8doolgtUHrAgQIGZ5t7ulpNmlitL_3HmJZZEa-4fnA50mYpS5vvO3t6iAMTPPUDNkvtkVZBI2j03YfYpx2_T0dJaFbv8LpwAI1-5ol1srxdkiMMY40InwLjM06_of-T5YAa1NGCWHU7U46g"/>
<div>
<h3 className="font-eventra-headline font-bold text-lg text-eventra-on-surface">Fan Pit Experience</h3>
<p className="font-eventra-label text-sm text-eventra-on-surface-variant">Front row immersive access with premium acoustics.</p>
<p className="mt-2 font-eventra-headline font-black text-eventra-primary">$249.00</p>
</div>
</div>
<div className="bg-eventra-surface-container-lowest p-6 rounded-2xl flex items-center gap-6 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.04)] hover:scale-[1.02] transition-transform">
<img className="w-24 h-24 rounded-xl object-cover shrink-0" data-alt="elegant empty vip lounge seating area in a luxury arena with gold accents and plush purple chairs" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXIB480ShxuFNw_WfYA3XQM1-sYapWLpTOiIzmfKGU-8MRj7rrOTEGgj2l1CHW8KqBb07lCVxJ_UEALlx5sBeAFOoh3KNMl3hRGuUwgFXhjT7iDOjz_gJZ74htVp1G2QU7h05KPNnkSK90e1bqKAxzIJlm_YwyuDdbwp-hR1G17Qg9k4CFGk45qSU34htdRzC-Kc7ICrGbPuJCLp2Avp3qr4la1lVP1iAgxj_f_xlu259vJT3nvexPE-1Nbkrf8t45xqu27UWgHg"/>
<div>
<h3 className="font-eventra-headline font-bold text-lg text-eventra-on-surface">Private VIP Lounge</h3>
<p className="font-eventra-label text-sm text-eventra-on-surface-variant">Elevated side views with dedicated bar service.</p>
<p className="mt-2 font-eventra-headline font-black text-eventra-primary">$399.00</p>
</div>
</div>
</div>
</section>

<aside className="lg:col-span-4">
<div className="sticky top-28 bg-eventra-surface-container-lowest rounded-[2rem] p-8 shadow-[0px_12px_48px_0px_rgba(84,38,228,0.08)]">

<div className="mb-8 border-b-2 border-eventra-surface-container pb-8">
<div className="flex items-center gap-2 text-eventra-primary font-eventra-label text-xs font-bold uppercase tracking-widest mb-3">
<span className="material-symbols-outlined text-sm" data-icon="confirmation_number">confirmation_number</span>
                        Live Concert
                    </div>
<h2 className="text-3xl font-black font-eventra-headline tracking-tight text-eventra-on-surface leading-tight mb-2">Midnight Echoes: Live in London</h2>
<div className="flex items-center gap-4 text-eventra-on-surface-variant font-eventra-label text-sm">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-base" data-icon="calendar_today">calendar_today</span> Oct 24, 2024</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-base" data-icon="schedule">schedule</span> 20:00</span>
</div>
<div className="mt-4 flex items-center gap-2 text-eventra-on-surface-variant font-eventra-label text-sm">
<span className="material-symbols-outlined text-base" data-icon="location_on">location_on</span>
                        Royal Albert Hall, Kensington
                    </div>
</div>

<div className="space-y-6 mb-10">
<div className="flex justify-between items-start">
<div>
<p className="font-eventra-label text-xs text-eventra-on-surface-variant uppercase tracking-wider mb-1">Selected Section</p>
<p className="font-eventra-headline font-bold text-eventra-on-surface">Fan Pit Zone A</p>
<p className="font-eventra-label text-xs text-eventra-primary font-semibold mt-1">Best availability</p>
</div>
<button onClick={() => navigate("/eventra/checkout")} className="text-xs font-bold text-eventra-primary hover:underline font-eventra-label uppercase">Change</button>
</div>
<div className="flex justify-between items-center bg-eventra-surface-container-low p-4 rounded-xl">
<div className="flex items-center gap-3">
<button onClick={() => navigate("/eventra/checkout")} className="w-8 h-8 flex items-center justify-center bg-eventra-surface-container-highest rounded-full text-eventra-on-surface hover:bg-eventra-surface-variant transition-colors">
<span className="material-symbols-outlined text-lg" data-icon="remove">remove</span>
</button>
<span className="font-eventra-headline font-bold text-lg w-6 text-center">2</span>
<button onClick={() => navigate("/eventra/checkout")} className="w-8 h-8 flex items-center justify-center bg-eventra-primary rounded-full text-white hover:bg-eventra-primary-container transition-colors">
<span className="material-symbols-outlined text-lg" data-icon="add">add</span>
</button>
</div>
<div className="text-right">
<p className="font-eventra-label text-xs text-eventra-on-surface-variant uppercase">Subtotal</p>
<p className="font-eventra-headline font-black text-xl text-eventra-on-surface">$498.00</p>
</div>
</div>
</div>

<div className="space-y-3 mb-8 px-1">
<div className="flex justify-between text-sm font-eventra-label text-eventra-on-surface-variant">
<span>Tickets (2 × $249.00)</span>
<span>$498.00</span>
</div>
<div className="flex justify-between text-sm font-eventra-label text-eventra-on-surface-variant">
<span>Service Fee</span>
<span>$24.50</span>
</div>
<div className="flex justify-between text-lg font-eventra-headline font-black text-eventra-on-surface pt-4 border-t border-eventra-surface-container">
<span>Total Price</span>
<span className="text-eventra-primary">$522.50</span>
</div>
</div>

<button onClick={() => navigate("/eventra/checkout")} className="w-full bg-gradient-to-br from-[#5426e4] to-[#6d49fd] text-white py-5 rounded-2xl font-eventra-headline font-bold text-lg shadow-[0px_12px_24px_-8px_rgba(84,38,228,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                    Proceed to Checkout
                    <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
<p className="text-center mt-6 font-eventra-label text-xs text-eventra-on-surface-variant px-4">
                    By clicking proceed, you agree to our <a className="underline" href="#">Terms of Purchase</a> and booking policies.
                </p>
</div>
</aside>
</main>

<footer className="w-full mt-20 bg-[#f5f3f9] dark:bg-[#1c1b1f] tonal-shift-bg">
<div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-12 py-16 max-w-[1440px] mx-auto">
<div className="flex flex-col gap-4">
<div className="text-xl font-black text-[#5426e4]">Eventra</div>
<p className="font-eventra-label text-sm text-[#49454f] max-w-[200px]">Curating the world's most breathtaking live experiences.</p>
</div>
<div>
<h4 className="font-eventra-headline font-bold text-eventra-on-surface mb-6 uppercase text-xs tracking-widest">Navigation</h4>
<ul className="space-y-4 font-eventra-label text-sm text-[#49454f]">
<li><a className="hover:text-[#5426e4] underline-offset-4 hover:underline opacity-80 hover:opacity-100 transition-all" href="#">For you</a></li>
<li><a className="hover:text-[#5426e4] underline-offset-4 hover:underline opacity-80 hover:opacity-100 transition-all" href="#">Events</a></li>
<li><a className="hover:text-[#5426e4] underline-offset-4 hover:underline opacity-80 hover:opacity-100 transition-all" href="#">Support</a></li>
</ul>
</div>
<div>
<h4 className="font-eventra-headline font-bold text-eventra-on-surface mb-6 uppercase text-xs tracking-widest">Legal</h4>
<ul className="space-y-4 font-eventra-label text-sm text-[#49454f]">
<li><a className="hover:text-[#5426e4] underline-offset-4 hover:underline opacity-80 hover:opacity-100 transition-all" href="#">Terms &amp; Conditions</a></li>
<li><a className="hover:text-[#5426e4] underline-offset-4 hover:underline opacity-80 hover:opacity-100 transition-all" href="#">Privacy Policy</a></li>
<li><a className="hover:text-[#5426e4] underline-offset-4 hover:underline opacity-80 hover:opacity-100 transition-all" href="#">Cookie Policy</a></li>
</ul>
</div>
<div>
<h4 className="font-eventra-headline font-bold text-eventra-on-surface mb-6 uppercase text-xs tracking-widest">Connect</h4>
<div className="flex gap-4">
<span className="material-symbols-outlined text-[#49454f] hover:text-[#5426e4] cursor-pointer" data-icon="share">share</span>
<span className="material-symbols-outlined text-[#49454f] hover:text-[#5426e4] cursor-pointer" data-icon="public">public</span>
<span className="material-symbols-outlined text-[#49454f] hover:text-[#5426e4] cursor-pointer" data-icon="mail">mail</span>
</div>
<div className="mt-8">
<p className="font-eventra-label text-xs text-[#49454f]">© 2024 Eventra. The Digital Curator.</p>
</div>
</div>
</div>
</footer>

    </div>
  );
};

export default ConcertSeatSelection;
