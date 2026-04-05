import React from 'react';
import { APP_CONTENT } from '../data/mockData';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-surface-container px-8 flex flex-col md:flex-row justify-between max-w-7xl mx-auto py-12">
      <div className="mb-8 md:mb-0">
        <div className="text-2xl font-black text-on-surface italic mb-4">
          {APP_CONTENT.footer.title}
        </div>
        <p className="font-lexend text-sm text-on-surface-variant mb-6">
          {APP_CONTENT.footer.tagline}
        </p>
        <div className="flex gap-4">
          <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" data-icon="public">public</span>
          <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" data-icon="social_leaderboard">social_leaderboard</span>
          <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors" data-icon="share">share</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
        {Object.entries(APP_CONTENT.footer.links).map(([section, links]) => (
          <div key={section} className="flex flex-col gap-2">
            <p className="font-bold text-on-surface mb-2">{section}</p>
            {links.map((link, idx) => (
              <a key={idx} href="#" className="text-on-surface-variant hover:text-primary hover:translate-x-1 transition-transform">
                {link}
              </a>
            ))}
          </div>
        ))}
      </div>
      
      <div className="w-full mt-12 pt-8 border-t border-surface-container flex justify-center text-xs text-on-surface-variant col-span-full">
        {APP_CONTENT.footer.copyright}
      </div>
    </footer>
  );
};
