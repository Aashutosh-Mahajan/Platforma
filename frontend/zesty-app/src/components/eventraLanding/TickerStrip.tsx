import { motion } from 'framer-motion';
import { Rocket, Star, Ticket } from 'lucide-react';

function TickerContent() {
  return (
    <div className="flex min-w-max items-center gap-5 px-6">
      <span className="font-eventra-display text-xs font-bold uppercase tracking-[0.15em] text-white">Get Your Ticket</span>
      <Star className="h-4 w-4 text-white" />
      <span className="font-eventra-display text-xs font-bold uppercase tracking-[0.15em] text-white">Reach Your Dream</span>
      <Rocket className="h-4 w-4 text-white" />
      <span className="font-eventra-display text-xs font-bold uppercase tracking-[0.15em] text-white">Front Row Access</span>
      <Ticket className="h-4 w-4 text-white" />
    </div>
  );
}

export default function TickerStrip() {
  return (
    <section className="overflow-hidden bg-eventra-tickerBg py-4">
      <motion.div
        className="flex w-max items-center"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
      >
        <TickerContent />
        <TickerContent />
        <TickerContent />
        <TickerContent />
      </motion.div>
    </section>
  );
}
