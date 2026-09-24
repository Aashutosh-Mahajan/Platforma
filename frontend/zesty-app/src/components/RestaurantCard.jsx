import { useNavigate } from "react-router-dom";
import { Star, Clock, Leaf } from "lucide-react";

import { fallbackFoodImage } from "../utils/foodImagery";

export default function RestaurantCard({ restaurant }) {
  const navigate = useNavigate();

  if (!restaurant) {
    return null;
  }

  const photoUrl = restaurant.image || restaurant.image_url || fallbackFoodImage(restaurant.id);
  const rating = Number(restaurant.rating || 0) || 4;
  const numericRating = rating.toFixed(1);
  const restaurantId = Number(restaurant.id);
  const cuisineLabel = restaurant.cuisine_types || restaurant.cuisine || "Multi-cuisine";
  const priceRange = Number(restaurant.price_range || 2);
  const deliveryMin = restaurant.delivery_time_min ?? 20;
  const deliveryMax = restaurant.delivery_time_max ?? 40;
  const isVegOnly = Boolean(restaurant.veg_only);

  const openRestaurant = () => {
    if (!Number.isFinite(restaurantId) || restaurantId <= 0) {
      return;
    }
    navigate(`/zesty/restaurants/${restaurantId}`);
  };

  return (
    <article
      className="group h-full cursor-pointer overflow-hidden rounded-2xl border border-[#F0E0E0] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_36px_rgba(226,55,68,0.18)]"
      role="button"
      tabIndex={0}
      onClick={openRestaurant}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openRestaurant();
        }
      }}
      aria-label={`Open ${restaurant.name || "restaurant"} menu`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F5E9DD]">
        <img
          src={photoUrl}
          alt={restaurant.name || "Restaurant"}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = fallbackFoodImage(restaurantId + 1);
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />

        {isVegOnly && (
          <span className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-md border-2 border-[#1FA463] bg-white shadow">
            <Leaf className="h-3.5 w-3.5 text-[#1FA463]" strokeWidth={2.5} aria-hidden="true" />
          </span>
        )}

        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-[#1C1C1C] shadow-[0_4px_10px_rgba(0,0,0,0.18)]">
          <Star className="h-3.5 w-3.5 fill-[#1FA463] text-[#1FA463]" aria-hidden="true" />
          {numericRating}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="truncate text-lg font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
            {restaurant.name}
          </h3>
        </div>
      </div>

      <div className="space-y-2 p-3.5">
        <p className="truncate text-sm font-medium text-[#696969]">{cuisineLabel}</p>
        <div className="flex items-center justify-between text-sm font-semibold text-[#3A3F44]">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-[#E23744]" aria-hidden="true" />
            {deliveryMin}-{deliveryMax} min
          </span>
          <span className="text-[#696969]">{"₹".repeat(Math.min(Math.max(priceRange, 1), 4))}</span>
        </div>
      </div>
    </article>
  );
}
