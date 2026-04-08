import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface Step {
  id: number;
  title: string;
  description: string;
}

interface StepCardProps {
  step: Step;
}

const STEPS: Step[] = [
  {
    id: 1,
    title: 'Find Your Event',
    description: 'Browse our curated collection of events based on your unique tastes and location.',
  },
  {
    id: 2,
    title: 'Choose Your Seat',
    description: 'Interactive venue maps let you see the view from your seat before you buy.',
  },
  {
    id: 3,
    title: 'Book Securely',
    description: 'Encrypted checkout process with multiple payment options for total peace of mind.',
  },
  {
    id: 4,
    title: 'Get Your E-Ticket',
    description: 'Instantly delivered to your phone. Simply scan at the gate and enjoy the show.',
  },
];

function StepCard({ step }: StepCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(cardRef, { once: true, margin: '-100px' });
  const [displayNumber, setDisplayNumber] = useState(0);

  useEffect(() => {
    if (!isInView) {
      return;
    }

    const durationMs = 700;
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const nextValue = Math.max(0, Math.min(step.id, Math.round(progress * step.id)));
      setDisplayNumber(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [isInView, step.id]);

  return (
    <motion.article
      ref={cardRef}
      className="relative"
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <p className="font-eventra-display text-6xl font-bold text-[#e8c4a0]">
        {String(displayNumber).padStart(2, '0')}
      </p>
      <h3 className="mt-2 font-eventra-display text-3xl font-semibold text-zinc-900">{step.title}</h3>
      <p className="mt-3 max-w-xs font-eventra-body text-sm leading-relaxed text-zinc-500">{step.description}</p>
    </motion.article>
  );
}

export default function BookingSteps() {
  return (
    <section className="bg-[#fdf8f3] px-6 py-20 sm:px-10 lg:px-20">
      <div className="mx-auto w-full max-w-7xl">
        <header className="text-center">
          <h2 className="font-eventra-display text-5xl font-bold text-zinc-900">Simple Booking</h2>
          <p className="mt-4 font-eventra-body text-sm text-zinc-500">
            From discovery to admission in four seamless steps.
          </p>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((stepItem) => (
            <StepCard key={stepItem.id} step={stepItem} />
          ))}
        </div>
      </div>
    </section>
  );
}
