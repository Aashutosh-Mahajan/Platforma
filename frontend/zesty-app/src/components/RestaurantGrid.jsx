import RestaurantCard from "./RestaurantCard";

export default function RestaurantGrid({ restaurants = [] }) {
  if (!restaurants.length) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-[#F0E0E0] bg-[#FFF7F7] text-center">
        <div className="mb-3 text-3xl">🍽️</div>
        <p className="text-base text-[#696969]">No restaurants found</p>
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
