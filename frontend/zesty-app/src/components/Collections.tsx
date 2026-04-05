import React from 'react';
import { APP_CONTENT } from '../data/mockData';

export const Collections: React.FC = () => {
  return (
    <section className="mb-24">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2">{APP_CONTENT.collections.title}</h2>
          <p className="text-on-surface-variant text-lg">
            {APP_CONTENT.collections.description}
          </p>
        </div>
        <a className="text-primary font-bold flex items-center group" href="#">
          All collections 
          <span className="material-symbols-outlined ml-1 group-hover:translate-x-1 transition-transform" data-icon="arrow_right">
            arrow_right
          </span>
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {APP_CONTENT.collections.items.map((item, idx) => (
          <div key={idx} className="relative h-80 rounded-xl overflow-hidden group cursor-pointer">
            <img 
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
              alt={item.title} 
              src={item.image}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            <div className="absolute bottom-4 left-4 text-white">
              <p className="font-bold text-lg">{item.title}</p>
              <p className="text-sm opacity-90 flex items-center">
                {item.places} 
                <span className="material-symbols-outlined text-xs ml-1" data-icon="arrow_right">arrow_right</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
