import React from 'react';
import { useNavigate } from 'react-router-dom';

const EnhancedCinemaSeatMap = () => {
  const navigate = useNavigate();
  return (
    <div className="theme-eventra eventra-scrollbar selection:bg-eventra-primary-fixed selection:text-eventra-on-primary-fixed bg-eventra-background min-h-screen text-eventra-on-surface font-eventra-body">
      

<header className="bg-[#0d0d0f]/80 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-white/5">
<div className="flex justify-between items-center w-full px-8 py-4 max-w-[1440px] mx-auto">
<div className="flex items-center gap-8">
<span className="text-2xl font-black text-[#d0bcff] italic tracking-tight">Eventra</span>
<nav className="hidden md:flex items-center gap-6">
<a className="text-[#cac4d0] hover:text-[#d0bcff] font-medium transition-colors" href="#">For you</a>
<a className="text-[#cac4d0] hover:text-[#d0bcff] font-medium transition-colors" href="#">Dining</a>
<a className="text-[#d0bcff] font-bold border-b-2 border-eventra-primary pb-1" href="#">Movies</a>
<a className="text-[#cac4d0] hover:text-[#d0bcff] font-medium transition-colors" href="#">Events</a>
<a className="text-[#cac4d0] hover:text-[#d0bcff] font-medium transition-colors" href="#">Stores</a>
</nav>
</div>
<div className="flex items-center gap-4">
<div className="material-symbols-outlined text-[#d0bcff] cursor-pointer" data-icon="location_on">location_on</div>
<div className="material-symbols-outlined text-[#d0bcff] cursor-pointer" data-icon="account_circle">account_circle</div>
</div>
</div>
</header>
<main className="cinema-gradient min-h-screen pt-28 pb-40">

<div className="max-w-4xl mx-auto px-6 mb-12 text-center">
<h1 className="font-eventra-headline font-bold text-4xl tracking-tight text-white mb-3">Interstellar: 10th Anniversary</h1>
<div className="font-eventra-label text-eventra-on-surface-variant text-xs uppercase tracking-[0.2em] flex justify-center items-center gap-4 opacity-70">
<span>IMAX Laser 2D</span>
<span className="w-1 h-1 rounded-full bg-eventra-primary"></span>
<span>Grand Cinema, Hall 04</span>
<span className="w-1 h-1 rounded-full bg-eventra-primary"></span>
<span>Today, 20:45</span>
</div>
</div>

<div className="max-w-4xl mx-auto px-12 mb-16 relative">
<div className="h-1.5 w-full bg-eventra-primary/30 rounded-full screen-curve relative overflow-hidden">
<div className="absolute inset-0 bg-gradient-to-r from-transparent via-eventra-primary to-transparent opacity-80"></div>
</div>
<div className="text-center mt-6">
<span className="font-eventra-label text-[10px] uppercase tracking-[0.6em] text-eventra-primary/50 font-bold">SCREEN</span>
</div>

<div className="absolute top-2 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-eventra-primary/5 blur-[60px] rounded-full -z-10"></div>
</div>

<div className="flex justify-center items-center gap-10 mb-12 font-eventra-label text-[11px] font-semibold uppercase tracking-widest">
<div className="flex items-center gap-3 group">
<div className="w-5 h-5 rounded-md bg-white/10 border border-white/5 transition-colors group-hover:bg-white/20"></div>
<span className="text-[#cac4d0]">Available</span>
</div>
<div className="flex items-center gap-3">
<div className="w-5 h-5 rounded-md bg-eventra-primary shadow-[0_0_15px_rgba(84,38,228,0.6)]"></div>
<span className="text-white">Selected</span>
</div>
<div className="flex items-center gap-3">
<div className="w-5 h-5 rounded-md bg-white/5 border border-white/5 flex items-center justify-center">
<span className="material-symbols-outlined text-[10px] text-white/20" data-icon="close">close</span>
</div>
<span className="text-white/30">Sold</span>
</div>
</div>

<div className="max-w-[1200px] mx-auto px-6 seat-map-perspective">
<div className="seat-grid-container flex flex-col gap-12 pb-20">

<section>
<div className="flex items-center gap-6 mb-8">
<div className="h-px flex-grow bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
<span className="font-eventra-label text-[10px] uppercase tracking-[0.4em] text-[#d0bcff] font-bold">Platinum • $24.00</span>
<div className="h-px flex-grow bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
</div>
<div className="flex flex-col gap-4">
<div className="flex justify-center gap-3 md:gap-4">

<div className="flex gap-3">
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
</div>
<div className="w-12"></div>
<div className="flex gap-3">
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-eventra-primary shadow-[0_0_15px_rgba(84,38,228,0.6)] cursor-pointer seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-eventra-primary shadow-[0_0_15px_rgba(84,38,228,0.6)] cursor-pointer seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
</div>
<div className="w-12"></div>
<div className="flex gap-3">
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
</div>
</div>
</div>
</section>

<section>
<div className="flex items-center gap-6 mb-8">
<div className="h-px flex-grow bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
<span className="font-eventra-label text-[10px] uppercase tracking-[0.4em] text-[#d0bcff] font-bold">Gold • $18.00</span>
<div className="h-px flex-grow bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
</div>
<div className="flex flex-col gap-4">

<div className="flex justify-center gap-3 md:gap-4">
<div className="flex gap-3">
<div className="w-9 h-9 rounded-lg bg-white/5 cursor-not-allowed opacity-40"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
</div>
<div className="w-12"></div>
<div className="flex gap-3">
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
</div>
<div className="w-12"></div>
<div className="flex gap-3">
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/5 cursor-not-allowed opacity-40"></div>
<div className="w-9 h-9 rounded-lg bg-white/5 cursor-not-allowed opacity-40"></div>
</div>
</div>

<div className="flex justify-center gap-3 md:gap-4">
<div className="flex gap-3">
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
</div>
<div className="w-12"></div>
<div className="flex gap-3">
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/5 cursor-not-allowed opacity-40 flex items-center justify-center"><span className="material-symbols-outlined text-[10px] text-white/20" data-icon="close">close</span></div>
<div className="w-9 h-9 rounded-lg bg-white/5 cursor-not-allowed opacity-40 flex items-center justify-center"><span className="material-symbols-outlined text-[10px] text-white/20" data-icon="close">close</span></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
</div>
<div className="w-12"></div>
<div className="flex gap-3">
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
</div>
</div>
</div>
</section>

<section>
<div className="flex items-center gap-6 mb-8">
<div className="h-px flex-grow bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
<span className="font-eventra-label text-[10px] uppercase tracking-[0.4em] text-[#d0bcff] font-bold">Silver • $12.00</span>
<div className="h-px flex-grow bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
</div>
<div className="flex flex-col gap-4">
<div className="flex justify-center gap-3">
<div className="flex gap-3">
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
</div>
<div className="w-8"></div>
<div className="flex gap-3">
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
</div>
<div className="w-8"></div>
<div className="flex gap-3">
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
<div className="w-9 h-9 rounded-lg bg-white/10 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300 seat-hover"></div>
</div>
</div>
</div>
</section>
</div>
</div>
</main>

<footer className="fixed bottom-0 left-0 right-0 z-[60] bg-[#0d0d0f]/90 backdrop-blur-2xl border-t border-white/5 py-6 px-12">
<div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
<div className="flex items-center gap-12">
<div className="flex flex-col">
<span className="font-eventra-label text-[10px] text-white/40 uppercase tracking-[0.2em] mb-1">Seats Selected</span>
<span className="font-eventra-headline font-bold text-2xl text-white">2 Seats (P4, P5)</span>
</div>
<div className="w-px h-10 bg-white/10 hidden md:block"></div>
<div className="flex flex-col">
<span className="font-eventra-label text-[10px] text-white/40 uppercase tracking-[0.2em] mb-1">Total Payable</span>
<span className="font-eventra-headline font-bold text-2xl text-eventra-primary">$48.00</span>
</div>
</div>
<div className="flex items-center gap-4 w-full md:w-auto">
<button onClick={() => navigate('/eventra')} className="flex-grow md:flex-grow-0 px-8 py-4 rounded-xl font-eventra-headline font-bold bg-white/5 hover:bg-white/10 text-white transition-all duration-300">
                Cancel
            </button>
<button onClick={() => navigate('/eventra/checkout')} className="flex-grow md:flex-grow-0 px-12 py-4 rounded-xl font-eventra-headline font-bold text-white bg-eventra-primary hover:bg-eventra-primary-container scale-100 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_30px_rgba(84,38,228,0.4)]">
                Confirm Booking
            </button>
</div>
</div>
</footer>

    </div>
  );
};

export default EnhancedCinemaSeatMap;
