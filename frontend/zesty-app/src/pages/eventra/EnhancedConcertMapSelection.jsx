import React from 'react';
import { useNavigate } from 'react-router-dom';

const EnhancedConcertMapSelection = () => {
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
<button type="button" className="material-symbols-outlined p-2 hover:bg-[#f5f3f9] rounded-full transition-all duration-300 text-eventra-on-surface-variant" data-icon="location_on">location_on</button>
<button type="button" className="material-symbols-outlined p-2 hover:bg-[#f5f3f9] rounded-full transition-all duration-300 text-eventra-on-surface-variant" data-icon="account_circle">account_circle</button>
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

<div className="bg-eventra-surface-container-low p-8 md:p-16 rounded-[2.5rem] aspect-[16/10] flex items-center justify-center relative overflow-hidden border border-eventra-surface-variant/30">

<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle,rgba(84,38,228,0.05)_0%,transparent_70%)] pointer-events-none"></div>
<svg className="w-full h-full drop-shadow-2xl overflow-visible" viewBox="0 0 800 500">

<defs>
<pattern height="40" id="grid" patternunits="userSpaceOnUse" width="40">
<path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.03)" stroke-width="1"></path>
</pattern>
<filter id="shadow">
<fedropshadow dx="0" dy="4" flood-opacity="0.1" stddeviation="4"></fedropshadow>
</filter>
</defs>
<rect fill="url(#grid)" height="500" width="800"></rect>

<g className="stage-group">
<rect className="fill-on-surface" filter="url(#shadow)" height="60" rx="12" width="340" x="230" y="20"></rect>
<path d="M230 80 L570 80 L600 100 L200 100 Z" fill="rgba(27,27,32,0.1)"></path>
<text className="fill-surface text-sm font-black font-eventra-headline tracking-widest" text-anchor="middle" x="400" y="58">THE STAGE</text>
</g>

<g className="zone-group">
<path className="venue-path active fill-primary/90" d="M210 110 H590 C610 110 620 120 620 140 V200 C620 220 610 230 590 230 H210 C190 230 180 220 180 200 V140 C180 120 190 110 210 110" filter="url(#shadow)"></path>
<text className="fill-white text-sm font-black pointer-events-none tracking-widest" text-anchor="middle" x="400" y="175">FAN PIT ZONE A</text>
<text className="fill-white/70 text-[10px] font-bold pointer-events-none uppercase" text-anchor="middle" x="400" y="195">From $249</text>
</g>

<g className="zone-group">
<path className="venue-path fill-[#d0bcff]" d="M30 110 H160 C175 110 180 120 180 135 V280 C180 295 175 305 160 305 H30 C15 305 10 295 10 280 V135 C10 120 15 110 30 110" filter="url(#shadow)"></path>
<text className="fill-primary text-[11px] font-black pointer-events-none" text-anchor="middle" transform="rotate(-90 95 210)" x="95" y="210">VIP LOUNGE LEFT</text>
</g>

<g className="zone-group">
<path className="venue-path fill-[#d0bcff]" d="M640 110 H770 C785 110 790 120 790 135 V280 C790 295 785 305 770 305 H640 C625 305 620 295 620 280 V135 C620 120 625 110 640 110" filter="url(#shadow)"></path>
<text className="fill-primary text-[11px] font-black pointer-events-none" text-anchor="middle" transform="rotate(90 705 210)" x="705" y="210">VIP LOUNGE RIGHT</text>
</g>

<g className="zone-group">
<path className="venue-path fill-surface-container-highest" d="M140 250 H660 C685 250 700 265 700 290 V410 C700 435 685 450 660 450 H140 C115 450 100 435 100 410 V290 C100 265 115 250 140 250" filter="url(#shadow)"></path>
<text className="fill-on-surface-variant text-base font-black pointer-events-none tracking-widest" text-anchor="middle" x="400" y="345">GENERAL ADMISSION</text>
<text className="fill-on-surface-variant/60 text-[11px] font-bold pointer-events-none" text-anchor="middle" x="400" y="365">SOLD OUT</text>
</g>

<g className="zone-group">
<path className="venue-path fill-tertiary-fixed/60" d="M40 470 H760 C775 470 780 475 780 485 V500 H20 V485 C20 475 25 470 40 470" filter="url(#shadow)"></path>
<text className="fill-tertiary text-[10px] font-bold pointer-events-none uppercase tracking-widest" text-anchor="middle" x="400" y="488">Balcony Seating</text>
</g>
</svg>

<div className="absolute bottom-6 right-6 bg-eventra-surface-container-lowest/90 backdrop-blur border border-eventra-surface-variant/20 p-4 rounded-xl hidden md:block">
<div className="flex flex-col gap-2">
<div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-eventra-primary"></span><span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Selection</span></div>
<div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#d0bcff]"></span><span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Premium</span></div>
</div>
</div>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div className="bg-eventra-surface-container-lowest p-6 rounded-2xl flex items-center gap-6 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.04)] border border-eventra-primary/10 hover:scale-[1.02] transition-all cursor-pointer">
<img className="w-24 h-24 rounded-xl object-cover shrink-0" data-alt="vibrant blue and purple lights from a concert stage perspective standing in the front row fan pit area" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-vZZDZLy6kzHfi2hb1q3WPwmW-c2gmsU1wIfWb7QnxOcxULyXQbHcPADCNANNMolFSUanmWBlOkdbGBMWIPoL8axT4NTZ8KHoXrxDosw4mc7H0pMnliWfxpfcuPF8doolgtUHrAgQIGZ5t7ulpNmlitL_3HmJZZEa-4fnA50mYpS5vvO3t6iAMTPPUDNkvtkVZBI2j03YfYpx2_T0dJaFbv8LpwAI1-5ol1srxdkiMMY40InwLjM06_of-T5YAa1NGCWHU7U46g"/>
<div>
<h3 className="font-eventra-headline font-bold text-lg text-eventra-on-surface">Fan Pit Experience</h3>
<p className="font-eventra-label text-sm text-eventra-on-surface-variant">Front row immersive access with premium acoustics.</p>
<p className="mt-2 font-eventra-headline font-black text-eventra-primary">$249.00</p>
</div>
</div>
<div className="bg-eventra-surface-container-lowest p-6 rounded-2xl flex items-center gap-6 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.04)] border border-transparent hover:border-eventra-surface-variant hover:scale-[1.02] transition-all cursor-pointer">
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
<div className="sticky top-28 bg-eventra-surface-container-lowest rounded-[2rem] p-8 shadow-[0px_12px_48px_0px_rgba(84,38,228,0.08)] border border-eventra-surface-variant/20">

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
<p className="font-eventra-label text-xs text-eventra-primary font-semibold mt-1 flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-eventra-primary animate-pulse"></span>
                            Available now
                        </p>
</div>
<button type="button" className="text-xs font-bold text-eventra-primary hover:underline font-eventra-label uppercase">Change</button>
</div>
<div className="flex justify-between items-center bg-eventra-surface-container-low p-4 rounded-xl border border-eventra-surface-variant/20">
<div className="flex items-center gap-3">
<button type="button" className="w-8 h-8 flex items-center justify-center bg-eventra-surface-container-highest rounded-full text-eventra-on-surface hover:bg-eventra-surface-variant transition-colors">
<span className="material-symbols-outlined text-lg" data-icon="remove">remove</span>
</button>
<span className="font-eventra-headline font-bold text-lg w-6 text-center">2</span>
<button type="button" className="w-8 h-8 flex items-center justify-center bg-eventra-primary rounded-full text-white hover:bg-eventra-primary-container transition-colors">
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

<button onClick={() => navigate('/eventra/checkout')} className="w-full bg-gradient-to-br from-[#5426e4] to-[#6d49fd] text-white py-5 rounded-2xl font-eventra-headline font-bold text-lg shadow-[0px_12px_24px_-8px_rgba(84,38,228,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                Proceed to Checkout
                <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
<p className="text-center mt-6 font-eventra-label text-xs text-eventra-on-surface-variant px-4">
                By clicking proceed, you agree to our <a className="underline" href="#">Terms of Purchase</a> and booking policies.
            </p>
</div>
</aside>
</main>

<footer className="w-full mt-20 bg-[#f5f3f9] dark:bg-[#1c1b1f] tonal-shift-bg border-t border-eventra-surface-variant/20">
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

export default EnhancedConcertMapSelection;
