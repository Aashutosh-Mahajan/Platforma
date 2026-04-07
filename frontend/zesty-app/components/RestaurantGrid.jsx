import RestaurantCard from "./RestaurantCard";

export default function RestaurantGrid({ restaurants = [] }) {
  if (!restaurants.length) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#F0E0E0] bg-white/80 p-10 text-center">
        <div className="mb-3 text-3xl">🍽️</div>
        <p className="text-base font-semibold text-[#E23744]">No restaurants found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {restaurants.map((restaurant) => (
        <RestaurantCard
          key={restaurant.id || restaurant.osm_id}
          restaurant={restaurant}
        />
      ))}
    </div>
  );
}