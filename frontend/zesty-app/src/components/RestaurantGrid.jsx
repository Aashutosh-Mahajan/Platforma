import { motion } from "framer-motion";
import { UtensilsCrossed } from "lucide-react";

import RestaurantCard from "./RestaurantCard";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function RestaurantGrid({ restaurants = [] }) {
  if (!restaurants.length) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-[#F0E0E0] bg-[#FFF7F7] text-center">
        <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-zesty-red/10 text-zesty-red">
          <UtensilsCrossed className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
        </span>
        <p className="text-base font-semibold text-[#1C1C1C]">No restaurants found</p>
        <p className="mt-1 text-sm text-[#696969]">Try a different cuisine or clear your filters.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      {restaurants.map((restaurant) => (
        <motion.div key={restaurant.id || restaurant.osm_id} variants={cardVariants}>
          <RestaurantCard restaurant={restaurant} />
        </motion.div>
      ))}
    </motion.div>
  );
}
