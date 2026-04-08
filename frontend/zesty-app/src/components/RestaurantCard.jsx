export default function RestaurantCard({ restaurant, onSelect }) {
  if (!restaurant) {
    return null;
  }

  const hasPhoto = Boolean(restaurant.image_url || restaurant.photo_url);
  const rating = Number(restaurant.rating || 0) || 4;
  const numericRating = rating.toFixed(1);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(restaurant)}
      className="block h-full w-full text-left"
    >
      <article className="h-full overflow-hidden rounded-2xl border border-[#ECECEC] bg-white shadow-[0_8px_18px_rgba(0,0,0,0.1)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(0,0,0,0.14)]">
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

        <div className="space-y-1 p-3">
          <h3 className="truncate text-[18px] font-bold text-[#1C1C1C]">{restaurant.name}</h3>
          <p className="text-[15px] font-semibold text-[#1FA463]">{numericRating}</p>
        </div>
      </article>
    </button>
  );
}
