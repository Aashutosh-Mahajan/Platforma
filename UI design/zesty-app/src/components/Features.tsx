import React from 'react';
import { APP_CONTENT } from '../data/mockData';

export const Features: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
      {APP_CONTENT.categories.map((category, idx) => (
        <div key={idx} className="group cursor-pointer rounded-2xl overflow-hidden bg-surface-container-lowest ambient-shadow transition-transform hover:-translate-y-2">
          <div className="h-48 overflow-hidden">
            <img 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              alt={category.title}
              src={category.image}
            />
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold mb-1">{category.title}</h3>
            <p className="text-on-surface-variant text-sm">{category.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
