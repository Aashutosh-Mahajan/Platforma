import React from 'react';

const CheckoutandTransaction = () => {
  return (
    <div className="theme-eventra eventra-scrollbar selection:bg-eventra-primary-fixed selection:text-eventra-on-primary-fixed bg-eventra-background min-h-screen text-eventra-on-surface font-eventra-body">
      

<nav className="glass-nav sticky top-0 z-50 w-full shadow-[0px_12px_32px_0px_rgba(84,38,228,0.06)]">
<div className="flex justify-between items-center w-full px-8 py-6 max-w-[1440px] mx-auto">
<div className="flex items-center gap-8">
<a className="text-2xl font-black text-eventra-primary italic" href="#">Eventra</a>
<div className="hidden md:flex gap-6 items-center border-l border-eventra-outline-variant pl-8">
<span className="flex items-center gap-2 text-eventra-primary font-bold">
<span className="w-6 h-6 rounded-full bg-eventra-primary text-white flex items-center justify-center text-xs font-bold">1</span>
<span className="label-font text-sm uppercase tracking-wider">Details</span>
</span>
<span className="w-8 h-[1px] bg-eventra-outline-variant"></span>
<span className="flex items-center gap-2 text-eventra-on-surface-variant font-medium opacity-50">
<span className="w-6 h-6 rounded-full border border-eventra-outline-variant flex items-center justify-center text-xs font-bold">2</span>
<span className="label-font text-sm uppercase tracking-wider">Review</span>
</span>
</div>
</div>
<div className="flex items-center gap-4">
<button className="flex items-center gap-2 text-eventra-on-surface-variant label-font text-sm font-medium hover:text-eventra-primary transition-colors">
<span className="material-symbols-outlined text-[20px]" data-icon="close">close</span>
                    Exit Checkout
                </button>
</div>
</div>
</nav>
<main className="max-w-[1440px] mx-auto px-8 py-12 md:py-20 lg:px-24">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

<div className="lg:col-span-7 space-y-12">

<section>
<div className="flex items-center gap-4 mb-8">
<h2 className="text-3xl font-bold tracking-tight text-eventra-on-surface">User Information</h2>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div className="space-y-2">
<label className="label-font text-sm font-semibold text-eventra-on-surface-variant">Full Name</label>
<input className="w-full px-6 py-4 rounded-xl bg-eventra-surface-container-low border-none focus:ring-2 focus:ring-eventra-primary/20 text-eventra-on-surface placeholder:text-outline/50 transition-all" placeholder="John Doe" type="text"/>
</div>
<div className="space-y-2">
<label className="label-font text-sm font-semibold text-eventra-on-surface-variant">Email Address</label>
<input className="w-full px-6 py-4 rounded-xl bg-eventra-surface-container-low border-none focus:ring-2 focus:ring-eventra-primary/20 text-eventra-on-surface placeholder:text-outline/50 transition-all" placeholder="john@example.com" type="email"/>
</div>
<div className="md:col-span-2 space-y-2">
<label className="label-font text-sm font-semibold text-eventra-on-surface-variant">Phone Number</label>
<div className="relative">
<span className="absolute left-6 top-1/2 -translate-y-1/2 text-eventra-on-surface-variant font-medium">+1</span>
<input className="w-full pl-14 pr-6 py-4 rounded-xl bg-eventra-surface-container-low border-none focus:ring-2 focus:ring-eventra-primary/20 text-eventra-on-surface placeholder:text-outline/50 transition-all" placeholder="(555) 000-0000" type="tel"/>
</div>
</div>
</div>
</section>

<section>
<div className="flex items-center gap-4 mb-8">
<h2 className="text-3xl font-bold tracking-tight text-eventra-on-surface">Payment Method</h2>
</div>
<div className="space-y-4">

<div className="p-6 rounded-2xl bg-eventra-surface-container-lowest border-2 border-eventra-primary ring-4 ring-primary/5 cursor-pointer flex items-center justify-between group">
<div className="flex items-center gap-5">
<div className="w-12 h-12 rounded-xl bg-eventra-primary-fixed flex items-center justify-center text-eventra-primary">
<span className="material-symbols-outlined" data-icon="credit_card">credit_card</span>
</div>
<div>
<h4 className="font-bold text-eventra-on-surface">Credit / Debit Card</h4>
<p className="label-font text-xs text-eventra-on-surface-variant">Visa, Mastercard, Amex</p>
</div>
</div>
<div className="w-6 h-6 rounded-full border-2 border-eventra-primary flex items-center justify-center">
<div className="w-3 h-3 rounded-full bg-eventra-primary"></div>
</div>
</div>

<div className="p-6 rounded-2xl bg-eventra-surface-container-low hover:bg-eventra-surface-container border-2 border-transparent transition-all cursor-pointer flex items-center justify-between group">
<div className="flex items-center gap-5">
<div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-eventra-on-surface-variant group-hover:text-primary transition-colors">
<span className="material-symbols-outlined" data-icon="account_balance_wallet">account_balance_wallet</span>
</div>
<div>
<h4 className="font-bold text-eventra-on-surface">UPI / Wallet</h4>
<p className="label-font text-xs text-eventra-on-surface-variant">Apple Pay, Google Pay, PayPal</p>
</div>
</div>
<div className="w-6 h-6 rounded-full border-2 border-eventra-outline-variant group-hover:border-primary transition-colors"></div>
</div>

<div className="p-6 rounded-2xl bg-eventra-surface-container-low hover:bg-eventra-surface-container border-2 border-transparent transition-all cursor-pointer flex items-center justify-between group">
<div className="flex items-center gap-5">
<div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-eventra-on-surface-variant group-hover:text-primary transition-colors">
<span className="material-symbols-outlined" data-icon="account_balance">account_balance</span>
</div>
<div>
<h4 className="font-bold text-eventra-on-surface">Net Banking</h4>
<p className="label-font text-xs text-eventra-on-surface-variant">Secure transfer from 50+ banks</p>
</div>
</div>
<div className="w-6 h-6 rounded-full border-2 border-eventra-outline-variant group-hover:border-primary transition-colors"></div>
</div>
</div>

<div className="mt-8 p-8 rounded-2xl bg-eventra-surface-container-low space-y-6">
<div className="space-y-2">
<label className="label-font text-sm font-semibold text-eventra-on-surface-variant">Card Number</label>
<div className="relative">
<input className="w-full px-6 py-4 rounded-xl bg-white border-none focus:ring-2 focus:ring-eventra-primary/20 text-eventra-on-surface placeholder:text-outline/50 transition-all" placeholder="0000 0000 0000 0000" type="text"/>
<div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-2">
<span className="material-symbols-outlined text-eventra-outline" data-icon="visa">credit_card</span>
</div>
</div>
</div>
<div className="grid grid-cols-2 gap-6">
<div className="space-y-2">
<label className="label-font text-sm font-semibold text-eventra-on-surface-variant">Expiry Date</label>
<input className="w-full px-6 py-4 rounded-xl bg-white border-none focus:ring-2 focus:ring-eventra-primary/20 text-eventra-on-surface placeholder:text-outline/50 transition-all" placeholder="MM / YY" type="text"/>
</div>
<div className="space-y-2">
<label className="label-font text-sm font-semibold text-eventra-on-surface-variant">CVV</label>
<input className="w-full px-6 py-4 rounded-xl bg-white border-none focus:ring-2 focus:ring-eventra-primary/20 text-eventra-on-surface placeholder:text-outline/50 transition-all" placeholder="123" type="password"/>
</div>
</div>
</div>
</section>
</div>

<div className="lg:col-span-5">
<div className="sticky top-32 space-y-8">

<div className="bg-eventra-surface-container-lowest rounded-2xl overflow-hidden shadow-[0px_12px_32px_0px_rgba(84,38,228,0.06)]">
<div className="h-48 relative overflow-hidden">
<img alt="Event Poster" className="w-full h-full object-cover" data-alt="wide shot of a vibrant live music concert with purple stage lights and a large crowd in silhouette" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhO1HteUR8e2T2AuVcWyQuoSj0HO_k2JA5KiIJSyZ3QHDDHZTmKhN1t98h2oeJ4CYvOAcjMzG01knzbxIMZ9XY8Msth6m7yVU-Y8Tk4OcjvO2naHgtzgXLQdw2u30JzJi7H88MxA6pRRarWPl8pHi0HakMifs5Jsb8ZqpChmsfatgM1qpp2ZaLMtZEWD0-Ppm2i75jxvHp7XIGYbY7O866INL3VkmtKc5uZo7OhkkRTiJZ-k2vf0ERYR4W3ayLMDlyvtdz0AlOhA"/>
<div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
<div>
<span className="label-font text-xs font-bold uppercase tracking-widest text-eventra-primary-fixed mb-2 inline-block">Concert &amp; Live Show</span>
<h3 className="text-white text-2xl font-bold">Midnight Echoes: Live in London</h3>
</div>
</div>
</div>
<div className="p-8 space-y-6">

<div className="space-y-4 pb-6 border-b border-eventra-surface-container">
<div className="flex justify-between items-center">
<span className="label-font text-sm font-medium text-eventra-on-surface-variant">Ticket Type</span>
<span className="font-bold text-eventra-on-surface">VIP Backstage Pass</span>
</div>
<div className="flex justify-between items-center">
<span className="label-font text-sm font-medium text-eventra-on-surface-variant">Quantity</span>
<span className="font-bold text-eventra-on-surface">02</span>
</div>
<div className="flex justify-between items-center">
<span className="label-font text-sm font-medium text-eventra-on-surface-variant">Date</span>
<span className="font-bold text-eventra-on-surface">Aug 24, 2024</span>
</div>
</div>

<div className="space-y-3">
<label className="label-font text-xs font-bold uppercase tracking-widest text-eventra-on-surface-variant">Promo Code</label>
<div className="flex gap-2">
<input className="flex-grow px-6 py-4 rounded-xl bg-eventra-surface-container-low border-none focus:ring-2 focus:ring-eventra-primary/20 text-eventra-on-surface placeholder:text-outline/50 transition-all font-mono" placeholder="EVENTRA10" type="text"/>
<button className="px-6 py-4 rounded-xl bg-eventra-on-surface text-white font-bold hover:bg-black transition-colors">Apply</button>
</div>
</div>

<div className="space-y-3 pt-4">
<div className="flex justify-between items-center text-sm">
<span className="label-font text-eventra-on-surface-variant">Subtotal</span>
<span className="font-medium text-eventra-on-surface">$240.00</span>
</div>
<div className="flex justify-between items-center text-sm">
<span className="label-font text-eventra-on-surface-variant">Service Fee (5%)</span>
<span className="font-medium text-eventra-on-surface">$12.00</span>
</div>
<div className="flex justify-between items-center text-sm text-green-600">
<span className="label-font">Discount</span>
<span className="font-medium">-$10.00</span>
</div>
<div className="pt-6 mt-4 border-t border-eventra-surface-container flex justify-between items-center">
<span className="text-lg font-bold text-eventra-on-surface">Total Amount</span>
<span className="text-3xl font-black text-eventra-primary">$242.00</span>
</div>
</div>

<button className="w-full py-6 rounded-2xl bg-gradient-to-br from-eventra-primary to-eventra-primary-container text-white font-bold text-lg shadow-[0px_8px_24px_rgba(84,38,228,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
<span className="material-symbols-outlined" data-icon="lock" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                                Proceed to Payment
                            </button>
<p className="text-center label-font text-xs text-eventra-on-surface-variant leading-relaxed">
                                By proceeding, you agree to our <a className="underline hover:text-eventra-primary" href="#">Terms of Service</a> and <a className="underline hover:text-eventra-primary" href="#">Privacy Policy</a>.
                            </p>
</div>
</div>

<div className="grid grid-cols-2 gap-4">
<div className="p-4 rounded-xl bg-eventra-surface-container-low flex flex-col items-center text-center gap-2">
<span className="material-symbols-outlined text-eventra-on-surface-variant" data-icon="verified">verified</span>
<span className="label-font text-[10px] font-bold uppercase tracking-wider text-eventra-on-surface-variant">Secure Checkout</span>
</div>
<div className="p-4 rounded-xl bg-eventra-surface-container-low flex flex-col items-center text-center gap-2">
<span className="material-symbols-outlined text-eventra-on-surface-variant" data-icon="timer">timer</span>
<span className="label-font text-[10px] font-bold uppercase tracking-wider text-eventra-on-surface-variant">10:00 Min Left</span>
</div>
</div>
</div>
</div>
</div>
</main>

<footer className="w-full bg-eventra-surface-container-low mt-20">
<div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-12 py-16 max-w-[1440px] mx-auto">
<div className="col-span-1 md:col-span-2">
<a className="text-xl font-black text-eventra-primary italic mb-4 block" href="#">Eventra</a>
<p className="label-font text-sm text-eventra-on-surface-variant max-w-xs leading-relaxed">
                    Elevating every experience. The digital curator for high-end events, dining, and premium lifestyle bookings.
                </p>
<p className="label-font text-xs text-eventra-on-surface-variant mt-8">© 2024 Eventra. The Digital Curator.</p>
</div>
<div className="space-y-4">
<h5 className="font-bold text-eventra-on-surface">Legal</h5>
<nav className="flex flex-col gap-3">
<a className="label-font text-sm text-eventra-on-surface-variant hover:text-eventra-primary underline-offset-4 hover:underline transition-all" href="#">Terms &amp; Conditions</a>
<a className="label-font text-sm text-eventra-on-surface-variant hover:text-eventra-primary underline-offset-4 hover:underline transition-all" href="#">Privacy Policy</a>
</nav>
</div>
<div className="space-y-4">
<h5 className="font-bold text-eventra-on-surface">Support</h5>
<nav className="flex flex-col gap-3">
<a className="label-font text-sm text-eventra-on-surface-variant hover:text-eventra-primary underline-offset-4 hover:underline transition-all" href="#">Help Center</a>
<a className="label-font text-sm text-eventra-on-surface-variant hover:text-eventra-primary underline-offset-4 hover:underline transition-all" href="#">Contact Us</a>
</nav>
</div>
</div>
</footer>

    </div>
  );
};

export default CheckoutandTransaction;
