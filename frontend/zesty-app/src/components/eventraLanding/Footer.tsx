import { BriefcaseBusiness, Camera, Mail, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const FOOTER_LINKS = ['PRIVACY POLICY', 'TERMS OF SERVICE', 'PARTNER WITH US', 'CAREERS'];

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-eventra-bg px-6 py-10 sm:px-10 lg:px-20">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <p className="font-eventra-display text-xl font-semibold text-white">Eventra</p>

          <div className="flex flex-wrap items-center gap-6 text-xs tracking-wide text-zinc-400">
            {FOOTER_LINKS.map((item) => (
              <Link key={item} to="/eventra" className="transition-colors hover:text-zinc-200">
                {item}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 text-zinc-400">
            <X className="h-4 w-4" />
            <Camera className="h-4 w-4" />
            <BriefcaseBusiness className="h-4 w-4" />
            <Mail className="h-4 w-4" />
          </div>
        </div>

        <p className="mt-4 font-eventra-body text-xs tracking-[0.14em] text-zinc-500">
          © 2024 EVENTRA. THE MODERN IMPRESARIO.
        </p>
      </div>
    </footer>
  );
}
