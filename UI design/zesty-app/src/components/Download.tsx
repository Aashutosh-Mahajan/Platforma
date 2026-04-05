import React from 'react';
import { APP_CONTENT } from '../data/mockData';

export const Download: React.FC = () => {
  return (
    <section className="bg-primary-container rounded-2xl p-12 flex flex-col md:flex-row items-center justify-between gap-12 text-on-primary">
      <div className="flex-1">
        <h2 className="text-4xl font-black mb-4">{APP_CONTENT.download.title}</h2>
        <p className="text-xl mb-8 opacity-90">{APP_CONTENT.download.description}</p>
        
        <div className="flex gap-4 mb-8">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="contact" defaultChecked className="text-on-primary focus:ring-on-primary" /> 
            <span>Email</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="contact" className="text-on-primary focus:ring-on-primary" /> 
            <span>Phone</span>
          </label>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <input 
            type="text" 
            placeholder="Email" 
            className="bg-white rounded-xl px-4 py-3 text-on-surface border-none flex-1 font-medium focus:outline-none"
          />
          <button className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-surface-tint transition-colors">
            Share App Link
          </button>
        </div>
        
        <p className="text-sm opacity-80 mb-4">Download app from</p>
        <div className="flex gap-4">
          <img 
            className="h-10 cursor-pointer" 
            alt="App Store" 
            src={APP_CONTENT.download.appStoreImage}
          />
          <img 
            className="h-10 cursor-pointer" 
            alt="Google Play" 
            src={APP_CONTENT.download.playStoreImage}
          />
        </div>
      </div>
      
      <div className="bg-surface-container-lowest p-6 rounded-2xl ambient-shadow flex flex-col items-center">
        <div className="bg-white w-48 h-48 rounded-xl mb-4 flex items-center justify-center border-4 border-white overflow-hidden shadow-sm">
          <img 
            src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://zesty.com/download" 
            alt="Scan to Download" 
            className="w-full h-full object-contain"
          />
        </div>
        <p className="text-on-surface text-center font-bold">Scan to Download</p>
      </div>
    </section>
  );
};
