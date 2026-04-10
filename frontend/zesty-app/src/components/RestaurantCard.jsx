import { useNavigate } from "react-router-dom";

export default function RestaurantCard({ restaurant }) {
  const navigate = useNavigate();

  if (!restaurant) {
    return null;
  }

  const hasPhoto = Boolean(restaurant.image_url || restaurant.photo_url);
  const rating = Number(restaurant.rating || 0) || 4;
  const numericRating = rating.toFixed(1);
  const restaurantId = Number(restaurant.id);

  const openRestaurant = () => {
    if (!Number.isFinite(restaurantId) || restaurantId <= 0) {
      return;
    }
    navigate(`/zesty/restaurants/${restaurantId}`);
  };

  return (
    <article
      className="h-full cursor-pointer overflow-hidden rounded-2xl border border-[#ECECEC] bg-white shadow-[0_8px_18px_rgba(0,0,0,0.1)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(0,0,0,0.14)]"
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
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#E5E5E5]">
        {hasPhoto ? (
          <img
            src={restaurant.image_url || restaurant.photo_url}
            alt={restaurant.name || "Restaurant"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl" aria-label="No photo available">
            🍽️
          </div>
        )}
      </div>

      <div className="space-y-2 p-3">
        <div className="space-y-1">
          <h3 className="truncate text-[18px] font-bold text-[#1C1C1C]">{restaurant.name}</h3>
          <p className="text-[15px] font-semibold text-[#E23744]">{numericRating}</p>
        </div>
      </div>
    </article>
  );
}
