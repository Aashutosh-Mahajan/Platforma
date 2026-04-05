import React from 'react';
import { useNavigate } from 'react-router-dom';

const CinemaSeatSelection = () => {
  const navigate = useNavigate();
  return (
    <div className="theme-eventra eventra-scrollbar selection:bg-eventra-primary-fixed selection:text-eventra-on-primary-fixed bg-eventra-background min-h-screen text-eventra-on-surface font-eventra-body">
      

<header className="bg-[#1c1b1f]/60 backdrop-blur-xl docked full-width top-0 sticky z-50 shadow-[0px_12px_32px_0px_rgba(84,38,228,0.06)]">
<div className="flex justify-between items-center w-full px-8 py-4 max-w-[1440px] mx-auto">
<div className="flex items-center gap-8">
<span className="text-2xl font-black text-[#d0bcff] italic">Eventra</span>
<nav className="hidden md:flex items-center gap-6">
<a className="text-[#cac4d0] hover:text-[#5426e4] font-medium transition-all duration-300" href="#">For you</a>
<a className="text-[#cac4d0] hover:text-[#5426e4] font-medium transition-all duration-300" href="#">Dining</a>
<a className="text-[#d0bcff] dark:text-[#d0bcff] font-bold border-b-2 border-[#5426e4] pb-1" href="#">Movies</a>
<a className="text-[#cac4d0] hover:text-[#5426e4] font-medium transition-all duration-300" href="#">Events</a>
<a className="text-[#cac4d0] hover:text-[#5426e4] font-medium transition-all duration-300" href="#">IPL</a>
<a className="text-[#cac4d0] hover:text-[#5426e4] font-medium transition-all duration-300" href="#">Stores</a>
</nav>
</div>
<div className="flex items-center gap-4">
<div className="material-symbols-outlined text-[#d0bcff] cursor-pointer scale-105 active:scale-95 transition-transform" data-icon="location_on">location_on</div>
<div className="material-symbols-outlined text-[#d0bcff] cursor-pointer scale-105 active:scale-95 transition-transform" data-icon="account_circle">account_circle</div>
</div>
</div>
</header>
<main className="cinema-bg min-h-screen pt-12 pb-32 overflow-hidden">

<div className="max-w-4xl mx-auto px-6 mb-16 text-center">
<h1 className="font-eventra-headline font-bold text-4xl tracking-tight text-white mb-2">Interstellar: 10th Anniversary</h1>
<p className="font-eventra-label text-eventra-on-surface-variant text-sm uppercase tracking-widest flex justify-center items-center gap-3">
<span>IMAX Laser 2D</span>
<span className="w-1.5 h-1.5 rounded-full bg-eventra-primary"></span>
<span>Grand Cinema, Hall 04</span>
<span className="w-1.5 h-1.5 rounded-full bg-eventra-primary"></span>
<span>Today, 20:45</span>
</p>
</div>

<div className="max-w-3xl mx-auto px-6 mb-24">
<div className="relative h-2 w-full bg-eventra-primary/20 rounded-full screen-curve overflow-hidden">
<div className="absolute inset-0 bg-gradient-to-r from-transparent via-eventra-primary to-transparent opacity-60"></div>
</div>
<div className="text-center mt-4">
<span className="font-eventra-label text-[10px] uppercase tracking-[0.4em] text-eventra-on-surface-variant opacity-50">THE SCREEN</span>
</div>
</div>

<div className="flex justify-center items-center gap-8 mb-16 font-eventra-label text-xs font-medium">
<div className="flex items-center gap-2">
<div className="w-5 h-5 rounded-lg bg-eventra-surface-container-highest opacity-20"></div>
<span className="text-eventra-on-surface-variant">Available</span>
</div>
<div className="flex items-center gap-2">
<div className="w-5 h-5 rounded-lg bg-eventra-primary shadow-[0_0_15px_rgba(84,38,228,0.4)]"></div>
<span className="text-white">Selected</span>
</div>
<div className="flex items-center gap-2">
<div className="w-5 h-5 rounded-lg bg-eventra-on-surface-variant opacity-10 flex items-center justify-center">
<span className="material-symbols-outlined text-[10px] text-eventra-on-surface-variant" data-icon="close">close</span>
</div>
<span className="text-eventra-on-surface-variant">Sold</span>
</div>
</div>

<div className="max-w-[1200px] mx-auto px-6 seat-grid">

<div className="mb-12">
<div className="flex items-center gap-4 mb-6">
<div className="h-[1px] flex-grow bg-eventra-outline-variant/10"></div>
<span className="font-eventra-label text-[10px] uppercase tracking-widest text-[#d0bcff]">Platinum • $24.00</span>
<div className="h-[1px] flex-grow bg-eventra-outline-variant/10"></div>
</div>
<div className="grid grid-cols-12 gap-3 max-w-2xl mx-auto">

<div className="col-span-12 flex justify-center gap-3">
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300"></div>
<div className="w-12 h-8"></div> 
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-primary shadow-[0_0_12px_rgba(84,38,228,0.5)] cursor-pointer"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-primary shadow-[0_0_12px_rgba(84,38,228,0.5)] cursor-pointer"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300"></div>
<div className="w-12 h-8"></div> 
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 hover:bg-eventra-primary/40 cursor-pointer transition-all duration-300"></div>
</div>
</div>
</div>

<div className="mb-12">
<div className="flex items-center gap-4 mb-6">
<div className="h-[1px] flex-grow bg-eventra-outline-variant/10"></div>
<span className="font-eventra-label text-[10px] uppercase tracking-widest text-[#d0bcff]">Gold • $18.00</span>
<div className="h-[1px] flex-grow bg-eventra-outline-variant/10"></div>
</div>
<div className="grid gap-4 max-w-4xl mx-auto">

<div className="flex justify-center gap-3">
<div className="w-8 h-8 rounded-xl bg-eventra-on-surface-variant/10 cursor-not-allowed"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-on-surface-variant/10 cursor-not-allowed"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-12 h-8"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-12 h-8"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-on-surface-variant/10 cursor-not-allowed"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-on-surface-variant/10 cursor-not-allowed"></div>
</div>
<div className="flex justify-center gap-3">
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-12 h-8"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-12 h-8"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
</div>
<div className="flex justify-center gap-3">
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-12 h-8"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-on-surface-variant/10 cursor-not-allowed"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-on-surface-variant/10 cursor-not-allowed"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-on-surface-variant/10 cursor-not-allowed"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-on-surface-variant/10 cursor-not-allowed"></div>
<div className="w-12 h-8"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
</div>
</div>
</div>

<div>
<div className="flex items-center gap-4 mb-6">
<div className="h-[1px] flex-grow bg-eventra-outline-variant/10"></div>
<span className="font-eventra-label text-[10px] uppercase tracking-widest text-[#d0bcff]">Silver • $12.00</span>
<div className="h-[1px] flex-grow bg-eventra-outline-variant/10"></div>
</div>
<div className="grid gap-4 max-w-5xl mx-auto">

<div className="flex justify-center gap-3">
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-12 h-8"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-12 h-8"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
<div className="w-8 h-8 rounded-xl bg-eventra-surface-container-highest/20 cursor-pointer transition-all duration-300"></div>
</div>
</div>
</div>
</div>
</main>

<footer className="fixed bottom-0 left-0 right-0 z-[60] bg-[#1c1b1f]/80 backdrop-blur-2xl border-t border-white/5 py-6 px-12">
<div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
<div className="flex items-center gap-8">
<div className="flex flex-col">
<span className="font-eventra-label text-xs text-eventra-on-surface-variant uppercase tracking-wider">Seats Selected</span>
<span className="font-eventra-headline font-bold text-2xl text-white">2 Seats (P5, P6)</span>
</div>
<div className="w-[1px] h-10 bg-white/10 hidden md:block"></div>
<div className="flex flex-col">
<span className="font-eventra-label text-xs text-eventra-on-surface-variant uppercase tracking-wider">Total Price</span>
<span className="font-eventra-headline font-bold text-2xl text-eventra-primary">$48.00</span>
</div>
</div>
<div className="flex items-center gap-6 w-full md:w-auto">
<button onClick={() => navigate("/eventra/checkout")} className="flex-grow md:flex-grow-0 px-8 py-4 rounded-xl font-eventra-headline font-bold bg-eventra-surface-container-highest/10 hover:bg-eventra-surface-container-highest/20 text-white transition-all duration-300">
                    Cancel
                </button>
<button onClick={() => navigate("/eventra/checkout")} className="flex-grow md:flex-grow-0 px-12 py-4 rounded-xl font-eventra-headline font-bold text-white bg-gradient-to-br from-eventra-primary to-eventra-primary-container scale-100 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_12px_24px_rgba(84,38,228,0.3)]">
                    Confirm Seats
                </button>
</div>
</div>
</footer>

    </div>
  );
};

export default CinemaSeatSelection;
