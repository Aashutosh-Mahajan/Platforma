function getCuisinePills(cuisineValue) {
  if (!cuisineValue) {
    return [];
  }

  return cuisineValue
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2);
}

export default function RestaurantCard({ restaurant, onViewMenu }) {
  const cuisinePills = getCuisinePills(restaurant?.cuisine);
  const hasPhoto = Boolean(restaurant?.photo_url);

  return (
    <article className="h-full overflow-hidden rounded-2xl border border-[#F0E0E0] bg-white shadow-[0_8px_20px_rgba(27,27,27,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(183,18,42,0.12)]">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#EAE7E7]">
        {hasPhoto ? (
          <img
            src={restaurant.photo_url}
            alt={restaurant?.name || "Restaurant"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#EAE7E7] text-4xl" aria-label="No photo available">
            🍽️
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <h3 className="truncate text-[16px] font-bold text-[#1B1B1B]">
          {restaurant?.name || "Unnamed Restaurant"}
        </h3>

        <div className="flex flex-wrap gap-2">
          {cuisinePills.map((pill) => (
            <span
              key={`${restaurant?.id}-${pill}`}
              className="rounded-full bg-[#FFF0F0] px-2.5 py-1 text-xs font-semibold text-[#E23744]"
            >
              {pill}
            </span>
          ))}
        </div>

        <p className="flex items-center gap-1.5 text-sm text-[#5B403F]">
          <span aria-hidden="true">📍</span>
          <span className="truncate">{restaurant?.area || "Mumbai"}</span>
        </p>

        <p className="text-xs text-[#5B403F]">
          {restaurant?.opening_hours ? restaurant.opening_hours : "Hours not listed"}
        </p>

        <button
          type="button"
          onClick={() => onViewMenu?.(restaurant)}
          className="w-full rounded-xl bg-gradient-to-r from-[#ff7a28] to-[#e23744] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(226,55,68,0.28)] transition hover:from-[#ff8a3f] hover:to-[#ef4d5a]"
        >
          View Menu
        </button>
      </div>
    </article>
  );
}