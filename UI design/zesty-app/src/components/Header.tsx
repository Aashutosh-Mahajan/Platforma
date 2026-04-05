import React from 'react';
import { APP_CONTENT } from '../data/mockData';

export const Header: React.FC = () => {
  return (
    <header className="absolute top-0 left-0 w-full z-50 flex justify-between items-center px-8 py-6 max-w-7xl mx-auto bg-transparent">
      <div className="text-3xl font-black text-white italic font-lexend tracking-tight">
        {APP_CONTENT.header.title}
      </div>
      <nav className="hidden md:flex items-center gap-8">
        {APP_CONTENT.header.navLinks.map((link, idx) => (
          <a key={idx} href="#" className="text-white/90 font-medium hover:text-red-200 transition-colors">
            {link}
          </a>
        ))}
      </nav>
    </header>
  );
};
