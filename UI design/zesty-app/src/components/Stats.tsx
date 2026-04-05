import React from 'react';
import { APP_CONTENT } from '../data/mockData';

export const Stats: React.FC = () => {
  return (
    <section className="relative bg-white py-24 px-8 overflow-hidden min-h-[600px] flex flex-col justify-center items-center">
      
      {/* Decorative Pink Lines (SVG) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60" viewBox="0 0 1000 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M-100,250 C150,100 300,600 500,400 C700,200 850,550 1100,350" fill="none" stroke="#fca5a5" strokeWidth="1" />
        <path d="M-50,450 C200,650 400,-100 600,100 C800,300 950,-50 1200,150" fill="none" stroke="#fca5a5" strokeWidth="1" />
        <circle cx="80" cy="150" r="3" fill="#ef4444" opacity="0.3" />
        <circle cx="900" cy="450" r="4" fill="#ef4444" opacity="0.4" />
      </svg>

      {/* Floating Images (using available mock data) */}
      <div className="absolute top-[35%] left-[10%] transform -translate-y-1/2 md:left-[15%]">
        <img alt="Burger" className="w-32 h-32 md:w-48 md:h-48 object-contain drop-shadow-2xl" src={APP_CONTENT.stats.images.burger} />
      </div>
      
      <div className="absolute top-[25%] right-[10%] transform -translate-y-1/2 md:right-[15%]">
        <img alt="Sushi" className="w-24 h-24 md:w-36 md:h-36 object-cover rounded-full shadow-lg" src={APP_CONTENT.stats.images.sushi} />
      </div>

      {/* Decorative Food Particles (Tomato & Leaves simulated) */}
      <div className="absolute top-[10%] right-[30%] w-8 h-8 rounded-full border-4 border-red-500 bg-red-400 opacity-90 blur-[0.5px]"></div>
      <div className="absolute bottom-[35%] left-[25%] w-6 h-6 rounded-full border-[3px] border-red-500 bg-red-400 opacity-90 blur-[0.5px] scale-x-[0.9] rotate-45"></div>
      <div className="absolute top-[10%] left-[30%] w-6 h-6 rounded-tl-[100%] rounded-br-[100%] bg-green-500 opacity-80 rotate-12"></div>
      
      <div className="relative z-10 text-center max-w-2xl mx-auto mb-20 mt-10">
        <h2 className="text-4xl md:text-5xl font-black text-[#f0515f] mb-6 leading-tight whitespace-pre-line tracking-tight">
          {APP_CONTENT.stats.title}
        </h2>
        <p className="text-gray-500 text-lg md:text-xl font-medium leading-relaxed max-w-sm mx-auto">
          {APP_CONTENT.stats.description}
        </p>
      </div>

      {/* Stats Card */}
      <div className="relative z-10 bg-white rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] max-w-5xl w-full flex flex-col md:flex-row justify-around items-center border border-gray-100">
        
        {/* Metric 1 */}
        <div className="flex items-center gap-6 w-full md:w-auto justify-center">
          <div className="text-left">
            <div className="text-2xl md:text-3xl font-black text-gray-700">{APP_CONTENT.stats.metrics[0].value}</div>
            <div className="text-gray-400 font-medium text-sm md:text-base">{APP_CONTENT.stats.metrics[0].label}</div>
          </div>
          <div className="p-2">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 12L12 6H36L40 12V18H8V12Z" fill="#ff4d4f" stroke="#333" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M16 12V18M24 12V18M32 12V18" stroke="#333" strokeWidth="2"/>
              <path d="M12 18V36H36V18" fill="white" stroke="#333" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M20 26H28V36H20V26Z" stroke="#333" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        
        <div className="hidden md:block w-px h-16 bg-gray-200"></div>
        <div className="block md:hidden w-full h-px bg-gray-200 my-4"></div>

        {/* Metric 2 */}
        <div className="flex items-center gap-6 w-full md:w-auto justify-center">
          <div className="text-left">
            <div className="text-2xl md:text-3xl font-black text-gray-700">{APP_CONTENT.stats.metrics[1].value}</div>
            <div className="text-gray-400 font-medium text-sm md:text-base">{APP_CONTENT.stats.metrics[1].label}</div>
          </div>
          <div className="p-2">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 44C24 44 38 32 38 20C38 12.268 31.732 6 24 6C16.268 6 10 12.268 10 20C10 32 24 44 24 44Z" fill="#ff4d4f" stroke="#333" strokeWidth="2" strokeLinejoin="round"/>
              <circle cx="24" cy="20" r="6" fill="white" stroke="#333" strokeWidth="2"/>
            </svg>
          </div>
        </div>

        <div className="hidden md:block w-px h-16 bg-gray-200"></div>
        <div className="block md:hidden w-full h-px bg-gray-200 my-4"></div>

        {/* Metric 3 */}
        <div className="flex items-center gap-6 w-full md:w-auto justify-center">
          <div className="text-left">
            <div className="text-2xl md:text-3xl font-black text-gray-700">{APP_CONTENT.stats.metrics[2].value}</div>
            <div className="text-gray-400 font-medium text-sm md:text-base">{APP_CONTENT.stats.metrics[2].label}</div>
          </div>
          <div className="p-2">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 16L16 40H32L36 16H12Z" fill="white" stroke="#333" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M20 16V10C20 7 28 7 28 10V16" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 16H26V24H22V16Z" fill="#ff4d4f" stroke="#ff4d4f" strokeWidth="1"/>
            </svg>
          </div>
        </div>

      </div>
    </section>
  );
};
