import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const parentVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: EASE_OUT,
      staggerChildren: 0.15,
    },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen w-full items-end overflow-hidden pt-20">
      <img
        src="/zesty/Images/Hero%204.jpeg"
        alt="Concert crowd under stage lights"
        className="absolute inset-0 h-full w-full object-cover brightness-110 saturate-110"
      />
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

      <motion.div
        className="relative z-10 w-full max-w-5xl px-6 pb-24 sm:px-10 md:pb-28 lg:px-20"
        variants={parentVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={childVariants}
          className="font-eventra-body text-xs font-semibold uppercase tracking-[0.28em] text-eventra-amber"
        >
          Premium Entertainment
        </motion.p>

        <motion.h1
          variants={childVariants}
          className="mt-4 font-eventra-display text-5xl font-bold leading-tight text-white sm:text-6xl md:text-7xl"
        >
          <span className="block">Your Next Event</span>
          <span className="block italic text-eventra-amberLight">Starts Here</span>
        </motion.h1>

        <motion.p
          variants={childVariants}
          className="mt-5 max-w-xl font-eventra-body text-base leading-relaxed text-white/80"
        >
          Discover the most exclusive live performances, from underground jazz clubs to stadium anthems.
          Curated for the modern connoisseur.
        </motion.p>

        <motion.div variants={childVariants} className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            to="/eventra/events"
            className="rounded-full bg-eventra-amber px-7 py-3 font-eventra-body text-sm font-semibold text-white transition-colors hover:bg-eventra-amberLight"
          >
            Explore Events
          </Link>
          <Link
            to="/eventra/events?ordering=event_date"
            className="rounded-full border border-white px-7 py-3 font-eventra-body text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
          >
            View Calendar
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
