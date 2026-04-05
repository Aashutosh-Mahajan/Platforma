import React from 'react';
import { APP_CONTENT } from '../data/mockData';

export const Experience: React.FC = () => {
  return (
    <section className="bg-surface-container-low rounded-2xl p-12 mb-24 relative overflow-hidden">
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <span className="label-md uppercase tracking-widest text-primary font-bold mb-4 block">
            {APP_CONTENT.experience.eyebrow}
          </span>
          <h2 className="text-5xl font-black leading-tight mb-6 tracking-tight">
            {APP_CONTENT.experience.title}
          </h2>
          <p className="text-lg text-on-surface-variant mb-8 leading-relaxed">
            {APP_CONTENT.experience.description}
          </p>
          <div className="space-y-6">
            {APP_CONTENT.experience.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="bg-primary-container p-3 rounded-full text-on-primary">
                  <span className="material-symbols-outlined" data-icon={feature.icon}>{feature.icon}</span>
                </div>
                <div>
                  <h4 className="font-bold text-lg">{feature.title}</h4>
                  <p className="text-on-surface-variant">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
          <img 
            className="rounded-2xl ambient-shadow w-full max-w-md mx-auto transform rotate-2 hover:rotate-0 transition-transform duration-500" 
            alt="UI Mockup" 
            src={APP_CONTENT.experience.image}
          />
        </div>
      </div>
    </section>
  );
};
