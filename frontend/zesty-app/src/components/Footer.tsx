import React from 'react';
import { APP_CONTENT } from '../data/mockData';

export const Footer: React.FC = () => {
  return (
    <footer 
      className="w-full border-t border-surface-container px-4 sm:px-6 lg:px-8 py-8 lg:py-12"
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between gap-8 lg:gap-12">
          <div className="mb-6 lg:mb-0">
            <div className="text-xl sm:text-2xl font-black text-on-surface italic mb-3 lg:mb-4">
              {APP_CONTENT.footer.title}
            </div>
            <p className="font-lexend text-sm text-on-surface-variant mb-4 lg:mb-6 max-w-xs">
              {APP_CONTENT.footer.tagline}
            </p>
            <div className="flex gap-4" role="list" aria-label="Social media links">
              <a 
                href="#" 
                className="text-on-surface-variant hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
                aria-label="Visit our website"
              >
                <span className="material-symbols-outlined" aria-hidden="true">public</span>
              </a>
              <a 
                href="#" 
                className="text-on-surface-variant hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
                aria-label="Follow us on social media"
              >
                <span className="material-symbols-outlined" aria-hidden="true">social_leaderboard</span>
              </a>
              <a 
                href="#" 
                className="text-on-surface-variant hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
                aria-label="Share Platforma"
              >
                <span className="material-symbols-outlined" aria-hidden="true">share</span>
              </a>
            </div>
          </div>
          
          <nav 
            className="grid grid-cols-2 sm:grid-cols-3 gap-6 lg:gap-8"
            aria-label="Footer navigation"
          >
            {Object.entries(APP_CONTENT.footer.links).map(([section, links]) => (
              <div key={section} className="flex flex-col gap-2">
                <h3 className="font-bold text-on-surface mb-2 text-sm sm:text-base">
                  {section}
                </h3>
                <ul className="space-y-2">
                  {links.map((link, idx) => (
                    <li key={idx}>
                      <a 
                        href="#" 
                        className="text-sm text-on-surface-variant hover:text-primary hover:translate-x-1 transition-all focus:outline-none focus:ring-2 focus:ring-primary rounded inline-block"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        
        <div className="w-full mt-8 lg:mt-12 pt-6 lg:pt-8 border-t border-surface-container text-center">
          <p className="text-xs sm:text-sm text-on-surface-variant">
            {APP_CONTENT.footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
};
