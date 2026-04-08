import { motion, useInView } from 'framer-motion';
import { useMemo, useRef } from 'react';

const HEADING = "LET'S GET YOU TO THE SHOW";

export default function CTASection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const headingCharacters = useMemo(() => HEADING.split(''), []);

  return (
    <section ref={sectionRef} className="relative flex min-h-96 items-center justify-center overflow-hidden px-6 py-16 sm:px-10 lg:px-20">
      <img
        src="https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1600&auto=format&fit=crop&q=80"
        alt="Crowd waiting at a concert"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
        <h2 className="font-eventra-display text-4xl font-extrabold uppercase leading-tight text-white sm:text-5xl">
          {headingCharacters.map((character, index) => (
            <motion.span
              key={`${character}-${index}`}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{ duration: 0.3, ease: 'easeOut', delay: index * 0.03 }}
              className="inline-block"
            >
              {character === ' ' ? '\u00A0' : character}
            </motion.span>
          ))}
        </h2>

        <p className="mx-auto mt-4 max-w-2xl font-eventra-body text-base leading-relaxed text-white/80">
          Have questions about premium seating or group bookings? Our concierge team is standing by to help you curate your perfect night out.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            className="rounded-full bg-white px-8 py-3 font-eventra-body text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            Contact Concierge
          </button>
          <button
            type="button"
            className="rounded-full border border-white px-8 py-3 font-eventra-body text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
          >
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}
