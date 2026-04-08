import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useRef } from 'react';

import EventCard, { type EventCardProps } from './EventCard';

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface EventSeed extends EventCardProps {
  id: number;
}

const EVENT_SEED: EventSeed[] = [
  {
    id: 1,
    title: 'Neon Horizon Tour',
    price: '$120',
    category: 'LIVE MUSIC',
    date: 'Oct 24, 2024',
    time: '8:00 PM',
    venue: 'Madison Square Garden',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&auto=format&fit=crop&q=80',
    categoryColor: 'bg-eventra-amber',
  },
  {
    id: 2,
    title: 'The Grand Opera',
    price: '$85',
    category: 'THEATER',
    date: 'Nov 12, 2024',
    time: '7:30 PM',
    venue: 'Royal Opera House',
    image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=900&auto=format&fit=crop&q=80',
    categoryColor: 'bg-zinc-700',
  },
  {
    id: 3,
    title: 'Echoes in the Valley',
    price: '$210',
    category: 'EXPERIENCE',
    date: 'Dec 05, 2024',
    time: '10:00 PM',
    venue: 'Shadow Valley Park',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&auto=format&fit=crop&q=80',
    categoryColor: 'bg-zinc-900',
  },
  {
    id: 4,
    title: 'Midnight Sessions',
    price: '$45',
    category: 'LIVE MUSIC',
    date: 'Dec 15, 2024',
    time: '11:00 PM',
    venue: 'The Blue Note Club',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900&auto=format&fit=crop&q=80',
    categoryColor: 'bg-eventra-amber',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

export default function RecentEvents() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section ref={sectionRef} className="bg-white px-6 py-16 sm:px-10 lg:px-20">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4 font-eventra-body">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900">Recent Events</h2>
            <p className="mt-2 text-sm text-zinc-500">Highly anticipated shows available now.</p>
          </div>
          <Link
            to="/eventra/events"
            className="text-sm font-medium text-eventra-amber transition-colors hover:text-eventra-amberLight"
          >
            View All →
          </Link>
        </div>

        <motion.div
          className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {EVENT_SEED.map((eventItem) => (
            <motion.div key={eventItem.id} variants={cardVariants}>
              <EventCard {...eventItem} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
