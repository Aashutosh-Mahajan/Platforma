import React, { useEffect, useRef } from 'react';
import { APP_CONTENT } from '../data/mockData';

const FRAME_COUNT = 43;

export const Hero: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Preload sequence
    const preloadImages = async () => {
      for (let i = 0; i < FRAME_COUNT; i++) {
        const imgIndex = (11 + i).toString().padStart(3, '0');
        const img = new Image();
        img.src = `/hero/Slice_of_pizza_202604051228_${imgIndex}.jpg`;
        imagesRef.current.push(img);
      }
      
      // Attempt to render the first frame as soon as it loads
      imagesRef.current[0].onload = () => renderFrame(0);
    };

    preloadImages();

    // 2. Scroll logic
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      // Calculate how far down the user has scrolled within the Hero section
      // sectionTop is 0 in most cases since it's the top level
      const sectionTop = sectionRef.current.offsetTop;
      const sectionHeight = sectionRef.current.offsetHeight;
      const scrollY = window.scrollY;

      // Ensure we bounded calculate scrub percentage relative to the sticky area
      // The scrubtable area is (total height - 1 viewport height)
      const scrubLength = sectionHeight - window.innerHeight;
      
      // We start scrubbing when scrollY hits sectionTop
      let fraction = (scrollY - sectionTop) / scrubLength;
      
      // Clamp bounds
      fraction = Math.max(0, Math.min(1, fraction));
      
      const frameIndex = Math.floor(fraction * (FRAME_COUNT - 1));
      
      // Hand over to rAF for smooth decoupled painting
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(() => renderFrame(frameIndex));
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const renderFrame = (index: number) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    
    if (!canvas || !img || !img.complete) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas seamlessly natively
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // object-fit: cover emulation
    const hRatio = canvas.width / img.width;
    const vRatio = canvas.height / img.height;
    const ratio = Math.max(hRatio, vRatio);
    const centerShift_x = (canvas.width - img.width * ratio) / 2;
    const centerShift_y = (canvas.height - img.height * ratio) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      0, 0, img.width, img.height,
      centerShift_x, centerShift_y, img.width * ratio, img.height * ratio
    );
  };

  return (
    <section ref={sectionRef} className="relative h-[250vh] bg-black">
      {/* Sticky Context Wrapper */}
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center text-center overflow-hidden" style={{ fontFamily: 'var(--font-poppins)' }}>
        
        {/* Canvas animated playback */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full object-cover z-0" 
        />
        
        {/* Darkening fade to read UI clearly */}
        <div className="absolute inset-0 bg-black/50 z-0"></div>

        <div className="relative z-10 max-w-4xl w-full flex flex-col items-center px-6 pt-20">
          {/* Logo */}
          <h1 className="text-white text-7xl md:text-8xl font-black italic mb-6 tracking-tighter lowercase">
            {APP_CONTENT.header.title}
          </h1>
          
          {/* Headline */}
          <h2 className="text-white text-4xl md:text-5xl font-bold mb-6 tracking-tight leading-tight whitespace-pre-line drop-shadow-lg">
            India's #1<br/>food delivery app
          </h2>
          
          {/* Subheadline */}
          <p className="text-white text-xl md:text-2xl mb-12 opacity-95 whitespace-pre-line font-medium leading-relaxed drop-shadow-md">
            Experience fast & easy online ordering<br/>on the Zesty app
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <img 
              className="h-12 w-auto cursor-pointer transition-transform hover:scale-105 shadow-xl rounded-lg" 
              alt="Google Play" 
              src={APP_CONTENT.download.playStoreImage} 
            />
            <img 
              className="h-12 w-auto cursor-pointer transition-transform hover:scale-105 shadow-xl rounded-lg" 
              alt="App Store" 
              src={APP_CONTENT.download.appStoreImage} 
            />
          </div>
        </div>
        
        {/* Scroll Down Hint with fade-out capability can be added via scroll listeners, but works dynamically sticky too! */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/90 cursor-pointer hover:text-white transition-colors z-10">
          <span className="text-sm font-medium mb-1 tracking-wide">Scroll sequence</span>
          <span className="material-symbols-outlined text-xl animate-bounce" data-icon="keyboard_arrow_down">keyboard_arrow_down</span>
        </div>
        
      </div>
    </section>
  );
};
