import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Compass, UtensilsCrossed } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f6f4ee] px-5 py-16 font-zesty-body text-[#141414]">
      <div className="w-full max-w-xl text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-[#56652f] ring-1 ring-[#e6e2d8]">
          <Compass className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <p className="mt-6 font-mono text-sm text-[#9c9a90]">404</p>
        <h1 className="mt-2 font-eventra-display text-5xl font-medium leading-tight">
          This page took a <span className="italic text-[#6f7f42]">wrong turn</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[#6b6a63]">
          We couldn't find <span className="break-all font-mono text-[13px] text-[#141414]">{pathname}</span>. It may have moved, or the link has a typo.
        </p>

        <div className="mt-10 grid gap-3 text-left sm:grid-cols-2">
          <Link to="/zesty" className="group flex items-center gap-3 rounded-2xl border border-[#e6e2d8] bg-white p-4 transition-colors hover:border-[#141414]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e23744]/10 text-[#b7122a]">
              <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold">Order food</span>
              <span className="text-sm text-[#6b6a63]">Restaurants on Zesty</span>
            </span>
          </Link>
          <Link to="/eventra/events" className="group flex items-center gap-3 rounded-2xl border border-[#e6e2d8] bg-white p-4 transition-colors hover:border-[#141414]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#c4621a]/12 text-[#9a4a10]">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold">Find events</span>
              <span className="text-sm text-[#6b6a63]">What's on with Eventra</span>
            </span>
          </Link>
        </div>

        <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#141414] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2c2c2c]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Platforma
        </Link>
      </div>
    </main>
  );
};

export default NotFoundPage;
