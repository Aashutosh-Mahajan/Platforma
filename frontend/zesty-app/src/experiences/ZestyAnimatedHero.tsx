import { useEffect, useRef, type FC } from 'react';

const FRAME_COUNT = 43;
const START_FRAME = 11;
const MAX_UPLIFT = 110;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const ZestyAnimatedHero: FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  const framesRef = useRef<HTMLImageElement[]>([]);
  const isReadyRef = useRef(false);
  const lastFrameRef = useRef<number>(-1);
  const progressRef = useRef<number>(0);
  const requestRef = useRef<number | null>(null);

  const drawFrame = (index: number, progress: number) => {
    const canvas = canvasRef.current;
    const image = framesRef.current[index];

    if (!canvas || !image || !image.complete || image.naturalWidth === 0) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    const width = window.innerWidth;
    const height = window.innerHeight;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Keep full coverage while allowing upward motion without exposing black bars.
    const baseRatio = Math.max(width / image.width, height / image.height);
    const safeRatio = (height + MAX_UPLIFT * 2) / image.height;
    const ratio = Math.max(baseRatio, safeRatio) * (1 + progress * 0.06);
    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;

    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2 - progress * MAX_UPLIFT;

    context.clearRect(0, 0, width, height);
    context.drawImage(image, x, y, drawWidth, drawHeight);

    if (textLayerRef.current) {
      const textLift = progress * -30;
      const textScale = 1 - progress * 0.04;
      textLayerRef.current.style.transform = `translateY(${textLift}px) scale(${textScale})`;
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleScroll = () => {
      if (!sectionRef.current || !isReadyRef.current) {
        return;
      }

      const sectionTop = sectionRef.current.offsetTop;
      const sectionHeight = sectionRef.current.offsetHeight;
      const scrubLength = Math.max(1, sectionHeight - window.innerHeight);

      const fraction = clamp((window.scrollY - sectionTop) / scrubLength, 0, 1);
      const frameIndex = Math.round(fraction * (FRAME_COUNT - 1));

      if (
        frameIndex === lastFrameRef.current &&
        Math.abs(fraction - progressRef.current) < 0.0008
      ) {
        return;
      }

      progressRef.current = fraction;
      lastFrameRef.current = frameIndex;

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }

      requestRef.current = requestAnimationFrame(() => {
        drawFrame(frameIndex, fraction);
      });
    };

    const handleResize = () => {
      if (!isReadyRef.current) {
        return;
      }

      const frameIndex = Math.max(0, lastFrameRef.current);
      drawFrame(frameIndex, progressRef.current);
      handleScroll();
    };

    const preloadFrames = async () => {
      const framePromises = Array.from({ length: FRAME_COUNT }, (_, offset) => {
        return new Promise<HTMLImageElement>((resolve) => {
          const frame = new Image();
          const frameNumber = (START_FRAME + offset).toString().padStart(3, '0');

          frame.src = `/hero/Slice_of_pizza_202604051228_${frameNumber}.jpg`;
          frame.onload = () => resolve(frame);
          frame.onerror = () => resolve(frame);
        });
      });

      const loadedFrames = await Promise.all(framePromises);

      if (!mounted) {
        return;
      }

      framesRef.current = loadedFrames;
      isReadyRef.current = true;
      drawFrame(0, 0);
      handleScroll();
    };

    preloadFrames();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      mounted = false;
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-[260vh] min-h-[1300px] w-full overflow-hidden bg-[#fcf9f8]"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/28 via-black/38 to-black/52" />

        <div
          ref={textLayerRef}
          className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white transition-transform duration-150 ease-out"
        >
          <p className="mb-4 text-lg font-black italic tracking-tight text-[#ff9aa5] md:text-2xl">
            zesty
          </p>
          <h2 className="max-w-3xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
            India&apos;s #1 food delivery app
          </h2>
          <p className="mt-5 max-w-2xl text-xl font-semibold text-white/90 md:text-4xl">
            Experience fast and easy online ordering on the Zesty app
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:mt-10">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-black/75 px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-transform hover:scale-105"
            >
              <span className="material-symbols-outlined text-lg">shop_two</span>
              Get it on Google Play
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-black/75 px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-transform hover:scale-105"
            >
              <span className="material-symbols-outlined text-lg">phone_iphone</span>
              Download on the App Store
            </button>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-center text-white/90">
          <p className="text-xs font-semibold uppercase tracking-[0.22em]">
            Scroll to animate
          </p>
          <span className="material-symbols-outlined mt-1 animate-bounce text-2xl">
            keyboard_arrow_down
          </span>
        </div>
      </div>
    </section>
  );
};
