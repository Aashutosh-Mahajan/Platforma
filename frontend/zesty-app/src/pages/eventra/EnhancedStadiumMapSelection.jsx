import React from 'react';
import { useNavigate } from 'react-router-dom';

const EnhancedStadiumMapSelection = () => {
  const navigate = useNavigate();
  return (
    <div className="theme-eventra eventra-scrollbar selection:bg-eventra-primary-fixed selection:text-eventra-on-primary-fixed bg-eventra-background min-h-screen text-eventra-on-surface font-eventra-body">
      

<header className="bg-[#fbf8fe]/60 dark:bg-[#1c1b1f]/60 backdrop-blur-xl docked full-width top-0 sticky z-50 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.06)]">
<nav className="flex justify-between items-center w-full px-8 py-4 max-w-[1440px] mx-auto">
<div className="flex items-center gap-8">
<span className="text-2xl font-black text-[#5426e4] dark:text-[#d0bcff] italic">Eventra</span>
<div className="hidden md:flex items-center gap-6">
<a className="text-[#5426e4] dark:text-[#d0bcff] font-bold border-b-2 border-[#5426e4] pb-1 font-eventra-label text-sm uppercase tracking-wide" href="#">Events</a>
<a className="text-[#49454f] dark:text-[#cac4d0] hover:text-[#5426e4] font-eventra-label text-sm uppercase tracking-wide" href="#">Movies</a>
<a className="text-[#49454f] dark:text-[#cac4d0] hover:text-[#5426e4] font-eventra-label text-sm uppercase tracking-wide" href="#">Dining</a>
</div>
</div>
<div className="flex items-center gap-4">
<div className="bg-eventra-surface-container-low px-4 py-2 rounded-full flex items-center gap-2 group transition-all duration-300 hover:bg-eventra-surface-container-high cursor-pointer">
<span className="material-symbols-outlined text-eventra-primary text-xl">location_on</span>
<span className="font-eventra-label text-sm font-medium">Wankhede Stadium, Mumbai</span>
</div>
<button className="w-10 h-10 flex items-center justify-center rounded-full bg-eventra-surface-container-low hover:bg-eventra-primary-fixed transition-colors">
<span className="material-symbols-outlined text-eventra-on-surface">account_circle</span>
</button>
</div>
</nav>
</header>
<main className="max-w-[1440px] mx-auto px-8 py-8 lg:py-12">
<div className="flex flex-col lg:flex-row gap-12">

<div className="flex-1 space-y-10">
<header className="space-y-2">
<div className="flex items-center gap-3 text-eventra-primary font-eventra-label font-semibold uppercase tracking-[0.2em] text-xs">
<span className="w-8 h-[2px] bg-eventra-primary"></span>
                        IPL 2024 • Final
                    </div>
<h1 className="text-5xl font-black font-eventra-headline tracking-tighter text-eventra-on-surface">Choose Your Seat</h1>
<p className="text-eventra-on-surface-variant max-w-xl font-eventra-label">Select a stand from the map below to view available seats and pricing tiers. Experience the roar of the crowd from your preferred vantage point.</p>
</header>

<div className="relative bg-eventra-surface-container-low rounded-[2rem] p-8 lg:p-16 overflow-hidden flex items-center justify-center min-h-[650px] shadow-inner">
<div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #5426e4 1px, transparent 0)", backgroundSize: "40px 40px" }}></div>
<div className="relative w-full max-w-2xl aspect-square flex items-center justify-center">

<svg className="w-full h-full drop-shadow-2xl" viewbox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">

<ellipse cx="300" cy="300" fill="#388e3c" rx="200" ry="240"></ellipse>
<ellipse cx="300" cy="300" fill="none" rx="198" ry="238" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1"></ellipse>

<rect fill="#c5ae91" height="80" rx="2" width="30" x="285" y="260"></rect>
<line stroke="#ffffff" stroke-opacity="0.6" stroke-width="2" x1="285" x2="315" y1="270" y2="270"></line>
<line stroke="#ffffff" stroke-opacity="0.6" stroke-width="2" x1="285" x2="315" y1="330" y2="330"></line>
<rect fill="none" height="80" stroke="#ffffff" stroke-opacity="0.4" stroke-width="1" width="30" x="285" y="260"></rect>

<ellipse cx="300" cy="300" fill="none" rx="100" ry="120" stroke="#ffffff" stroke-dasharray="5,5" stroke-opacity="0.4" stroke-width="1"></ellipse>


<path className="stadium-path active" d="M120,100 Q300,20 480,100 L520,140 Q300,50 80,140 Z" fill="#5426e4" id="north-stand"></path>
<text fill="white" font-family="Inter" font-size="14" font-weight="800" text-anchor="middle" x="300" y="75">NORTH STAND</text>

<path className="stadium-path" d="M120,500 Q300,580 480,500 L520,460 Q300,550 80,460 Z" fill="#5426e4" id="south-stand"></path>
<text fill="white" font-family="Inter" font-size="14" font-weight="800" text-anchor="middle" x="300" y="535">SOUTH STAND</text>

<path className="stadium-path" d="M510,180 Q580,300 510,420 L470,390 Q520,300 470,210 Z" fill="#6d49fd" id="east-stand"></path>
<text fill="white" font-family="Inter" font-size="14" font-weight="800" text-anchor="middle" transform="rotate(90, 535, 300)" x="535" y="300">EAST STAND</text>

<path className="stadium-path" d="M90,180 Q20,300 90,420 L130,390 Q80,300 130,210 Z" fill="#6d49fd" id="west-stand"></path>
<text fill="white" font-family="Inter" font-size="14" font-weight="800" text-anchor="middle" transform="rotate(-90, 65, 300)" x="65" y="300">WEST STAND</text>

<circle className="stadium-path" cx="110" cy="145" fill="#f2edff" r="30" stroke="#5426e4" stroke-width="2"></circle>
<circle className="stadium-path" cx="490" cy="145" fill="#f2edff" r="30" stroke="#5426e4" stroke-width="2"></circle>
<circle className="stadium-path" cx="110" cy="455" fill="#f2edff" r="30" stroke="#5426e4" stroke-width="2"></circle>
<circle className="stadium-path" cx="490" cy="455" fill="#f2edff" r="30" stroke="#5426e4" stroke-width="2"></circle>
</svg>

<div className="absolute bottom-8 right-8 flex flex-col gap-2">
<button className="bg-eventra-surface-container-lowest w-10 h-10 rounded-xl shadow-lg flex items-center justify-center text-eventra-primary hover:scale-105 transition-transform active:bg-eventra-primary-fixed">
<span className="material-symbols-outlined">add</span>
</button>
<button className="bg-eventra-surface-container-lowest w-10 h-10 rounded-xl shadow-lg flex items-center justify-center text-eventra-primary hover:scale-105 transition-transform active:bg-eventra-primary-fixed">
<span className="material-symbols-outlined">remove</span>
</button>
</div>
</div>
</div>

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
<div className="bg-eventra-surface-container-lowest p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:shadow-lg border-l-4 border-eventra-primary">
<div className="w-3 h-3 rounded-full bg-eventra-primary"></div>
<div>
<div className="text-[10px] uppercase font-eventra-label font-bold text-eventra-on-surface-variant tracking-wider">Premium</div>
<div className="font-eventra-headline font-bold text-lg text-eventra-on-surface">₹4,500</div>
</div>
</div>
<div className="bg-eventra-surface-container-lowest p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:shadow-lg border-l-4 border-eventra-primary-container">
<div className="w-3 h-3 rounded-full bg-eventra-primary-container"></div>
<div>
<div className="text-[10px] uppercase font-eventra-label font-bold text-eventra-on-surface-variant tracking-wider">Mid-Tier</div>
<div className="font-eventra-headline font-bold text-lg text-eventra-on-surface">₹2,800</div>
</div>
</div>
<div className="bg-eventra-surface-container-lowest p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:shadow-lg border-l-4 border-eventra-tertiary-container">
<div className="w-3 h-3 rounded-full bg-eventra-tertiary-container"></div>
<div>
<div className="text-[10px] uppercase font-eventra-label font-bold text-eventra-on-surface-variant tracking-wider">Economy</div>
<div className="font-eventra-headline font-bold text-lg text-eventra-on-surface">₹1,200</div>
</div>
</div>
<div className="bg-eventra-surface-container-lowest p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:shadow-lg border-l-4 border-eventra-surface-container-highest">
<div className="w-3 h-3 rounded-full bg-eventra-surface-container-highest"></div>
<div>
<div className="text-[10px] uppercase font-eventra-label font-bold text-eventra-on-surface-variant tracking-wider">Sold Out</div>
<div className="font-eventra-headline font-bold text-lg text-eventra-on-surface line-through decoration-error">₹900</div>
</div>
</div>
</div>
</div>

<aside className="w-full lg:w-[420px] shrink-0">
<div className="sticky top-28 space-y-6">

<div className="bg-eventra-surface-container-lowest rounded-[2rem] overflow-hidden shadow-[0px_12px_32px_0px_rgba(84,38,228,0.06)] border border-eventra-outline-variant/10">
<div className="relative h-48">
<img alt="Stadium" className="w-full h-full object-cover" data-alt="dramatic night view of a crowded cricket stadium with bright floodlights and green pitch" src="https://lh3.googleusercontent.com/aida-public/AB6AXuATwK9VQXoRtZ4XJBGP135K5Yds8ToKl9DyPjPL8Sg6fpD0dsUFAsbyxTY05A0f7EBwg-8yFY7TQDZuZUN2D3kpoWWIs0NhPnojHyqIDm0iT3Tyfu-RuB9TgJ2glnFXsSpN7bPNzl_cIyENVCN6wHAbOn5cMGz4g6zwv_pwBJZ99ZiUrASO-7f6iCAMGT1n-wE_yr66LvcjKYwtrtuFr9v1CAUErFZfVekp1RNpfE2zvdkLDAFY4EvoCbiifEgBDZXO0BesEirkvg"/>
<div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-end items-end p-6">
<div className="text-white">
<h3 className="text-2xl font-black tracking-tight leading-tight">Mumbai Indians vs<br/>Gujarat Titans</h3>
<p className="font-eventra-label text-sm opacity-90 mt-1" id="event-info-sub">28 May, 2024 • 07:30 PM IST</p>
</div>
</div>
</div>
<div className="p-8 space-y-8">

<div>
<h4 className="text-xs uppercase font-eventra-label font-bold tracking-[0.2em] text-eventra-on-surface-variant mb-4" id="selection-header">Current Selection: North Stand</h4>
<div className="space-y-3" id="selected-seats-container">

<div className="flex items-center justify-between p-4 rounded-2xl bg-eventra-surface-container-low border border-eventra-primary/10 transition-transform active:scale-95 cursor-default">
<div className="flex items-center gap-4">
<div className="w-10 h-10 rounded-xl bg-eventra-primary/10 flex items-center justify-center text-eventra-primary">
<span className="material-symbols-outlined text-xl">event_seat</span>
</div>
<div>
<div className="font-bold text-eventra-on-surface">North Stand, L-14</div>
<div className="text-[11px] font-eventra-label font-semibold text-eventra-primary uppercase">Premium Tier</div>
</div>
</div>
<div className="text-right">
<div className="font-black text-eventra-on-surface tracking-tight">₹4,500</div>
<button className="text-xs text-eventra-error font-semibold hover:underline">Remove</button>
</div>
</div>
<div className="flex items-center justify-between p-4 rounded-2xl bg-eventra-surface-container-low border border-eventra-primary/10 transition-transform active:scale-95 cursor-default">
<div className="flex items-center gap-4">
<div className="w-10 h-10 rounded-xl bg-eventra-primary/10 flex items-center justify-center text-eventra-primary">
<span className="material-symbols-outlined text-xl">event_seat</span>
</div>
<div>
<div className="font-bold text-eventra-on-surface">North Stand, L-15</div>
<div className="text-[11px] font-eventra-label font-semibold text-eventra-primary uppercase">Premium Tier</div>
</div>
</div>
<div className="text-right">
<div className="font-black text-eventra-on-surface tracking-tight">₹4,500</div>
<button className="text-xs text-eventra-error font-semibold hover:underline">Remove</button>
</div>
</div>
</div>
</div>

<div className="space-y-3 border-t border-eventra-surface-container-high pt-6">
<div className="flex justify-between text-eventra-on-surface-variant font-eventra-label text-sm">
<span>Tickets (2)</span>
<span className="font-medium text-eventra-on-surface">₹9,000.00</span>
</div>
<div className="flex justify-between text-eventra-on-surface-variant font-eventra-label text-sm">
<span>Internet Handling Fees</span>
<span className="font-medium text-eventra-on-surface">₹145.50</span>
</div>
<div className="flex justify-between items-center pt-2">
<span className="text-lg font-bold text-eventra-on-surface">Total Amount</span>
<span className="text-2xl font-black text-eventra-primary tracking-tighter">₹9,145.50</span>
</div>
</div>

<button className="w-full bg-gradient-to-r from-[#5426e4] to-[#6d49fd] text-eventra-on-primary py-5 rounded-2xl font-black tracking-tight text-lg shadow-[0px_8px_24px_rgba(84,38,228,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3">
                                Proceed to Checkout
                                <span className="material-symbols-outlined">arrow_forward</span>
</button>
</div>
</div>

<div className="flex items-center gap-4 p-4 rounded-2xl bg-eventra-surface-container-low border border-eventra-outline-variant/20">
<span className="material-symbols-outlined text-eventra-primary text-2xl">verified_user</span>
<p className="text-xs font-eventra-label text-eventra-on-surface-variant leading-relaxed">
                            Official ticket partner for IPL 2024. Your transactions are secure and encrypted. Need help? <a className="text-eventra-primary font-bold hover:underline" href="#">Contact Support</a>
</p>
</div>
</div>
</aside>
</div>
</main>

<footer className="bg-[#f5f3f9] dark:bg-[#1c1b1f] w-full mt-20">
<div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-12 py-16 max-w-[1440px] mx-auto">
<div className="space-y-6">
<span className="text-2xl font-black text-[#5426e4]">Eventra</span>
<p className="font-medium font-eventra-label text-sm text-[#49454f] max-w-xs">
                    Curating the most spectacular experiences across the digital landscape.
                </p>
</div>
<div className="space-y-4">
<h4 className="font-black text-eventra-on-surface tracking-tight uppercase text-xs">Platform</h4>
<ul className="space-y-2">
<li><a className="font-medium font-eventra-label text-sm text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline" href="#">App Download</a></li>
<li><a className="font-medium font-eventra-label text-sm text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline" href="#">Support</a></li>
<li><a className="font-medium font-eventra-label text-sm text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline" href="#">Stadium Guide</a></li>
</ul>
</div>
<div className="space-y-4">
<h4 className="font-black text-eventra-on-surface tracking-tight uppercase text-xs">Legal</h4>
<ul className="space-y-2">
<li><a className="font-medium font-eventra-label text-sm text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline" href="#">Terms &amp; Conditions</a></li>
<li><a className="font-medium font-eventra-label text-sm text-[#49454f] hover:text-[#5426e4] underline-offset-4 hover:underline" href="#">Privacy Policy</a></li>
</ul>
</div>
<div className="space-y-4">
<h4 className="font-black text-eventra-on-surface tracking-tight uppercase text-xs">Connect</h4>
<div className="flex gap-4">
<div className="w-10 h-10 rounded-full bg-eventra-surface-container-high flex items-center justify-center text-eventra-primary cursor-pointer hover:scale-110 transition-transform">
<span className="material-symbols-outlined">share</span>
</div>
<div className="w-10 h-10 rounded-full bg-eventra-surface-container-high flex items-center justify-center text-eventra-primary cursor-pointer hover:scale-110 transition-transform">
<span className="material-symbols-outlined">language</span>
</div>
</div>
<div className="pt-4">
<p className="font-medium font-eventra-label text-sm text-[#49454f]">© 2024 Eventra. The Digital Curator.</p>
</div>
</div>
</div>
</footer>


    </div>
  );
};

export default EnhancedStadiumMapSelection;
