import { useEffect, useMemo, useState } from "react";

import RestaurantCard from "./RestaurantCard";

const VEG_MENU_LIBRARY = [
  { name: "Paneer Butter Masala", price: 229 },
  { name: "Veg Biryani", price: 199 },
  { name: "Masala Dosa", price: 149 },
  { name: "Chole Bhature", price: 169 },
  { name: "Margherita Pizza", price: 249 },
];

const MIXED_MENU_LIBRARY = [
  { name: "Chicken Biryani", price: 269 },
  { name: "Butter Chicken", price: 289 },
  { name: "Chicken Tikka Roll", price: 189 },
  { name: "Fish Fry Meal", price: 259 },
  { name: "Chef Special Combo", price: 299 },
];

function buildDialogMenu(restaurant) {
  const sourceList = restaurant?.veg_only ? VEG_MENU_LIBRARY : MIXED_MENU_LIBRARY;
  const prefix = restaurant?.id || restaurant?.osm_id || restaurant?.name || "restaurant";

  return sourceList.map((item, index) => ({
    ...item,
    id: `${prefix}-${index}`,
  }));
}

export default function RestaurantGrid({ restaurants = [] }) {
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [itemQuantities, setItemQuantities] = useState({});

  const dialogMenuItems = useMemo(
    () => (selectedRestaurant ? buildDialogMenu(selectedRestaurant) : []),
    [selectedRestaurant],
  );

  const totalItems = dialogMenuItems.reduce(
    (sum, item) => sum + (itemQuantities[item.id] || 0),
    0,
  );

  const totalAmount = dialogMenuItems.reduce(
    (sum, item) => sum + item.price * (itemQuantities[item.id] || 0),
    0,
  );

  const updateItemQuantity = (itemId, delta) => {
    setItemQuantities((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);

      return {
        ...prev,
        [itemId]: next,
      };
    });
  };

  const closeDialog = () => {
    setSelectedRestaurant(null);
    setItemQuantities({});
  };

  const handlePlaceOrder = () => {
    if (!totalItems) {
      return;
    }

    closeDialog();
  };

  useEffect(() => {
    if (!selectedRestaurant) {
      return;
    }

    const onEscape = (event) => {
      if (event.key === "Escape") {
        closeDialog();
      }
    };

    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [selectedRestaurant]);

  if (!restaurants.length) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-[#F0E0E0] bg-[#FFF7F7] text-center">
        <div className="mb-3 text-3xl">🍽️</div>
        <p className="text-base text-[#696969]">No restaurants found</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id || restaurant.osm_id}
            restaurant={restaurant}
            onSelect={setSelectedRestaurant}
          />
        ))}
      </div>

      {selectedRestaurant && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 px-4 pb-6 pt-20 md:items-center">
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeDialog}
            aria-label="Close order dialog"
          />

          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-[0_30px_70px_rgba(0,0,0,0.32)]">
            <div className="flex items-start justify-between border-b border-[#F0F0F0] px-5 py-4">
              <div>
                <h3 className="text-xl font-bold text-[#1C1C1C]">{selectedRestaurant.name}</h3>
                <p className="mt-1 text-sm text-[#6E6E6E]">Add items and place your order</p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-full border border-[#E5E5E5] px-3 py-1 text-sm font-semibold text-[#555]"
              >
                Close
              </button>
            </div>

            <div className="max-h-[52vh] space-y-3 overflow-y-auto px-5 py-4">
              {dialogMenuItems.map((item) => {
                const quantity = itemQuantities[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-[#ECECEC] px-4 py-3"
                  >
                    <div>
                      <p className="text-base font-semibold text-[#1C1C1C]">{item.name}</p>
                      <p className="mt-1 text-sm font-medium text-[#696969]">₹{item.price}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateItemQuantity(item.id, -1)}
                        className="h-8 w-8 rounded-full border border-[#E0E0E0] text-lg font-bold text-[#4F4F4F]"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-[#1C1C1C]">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateItemQuantity(item.id, 1)}
                        className="h-8 w-8 rounded-full bg-[#1FA463] text-lg font-bold text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#F0F0F0] bg-[#FCFCFC] px-5 py-4">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold text-[#3D3D3D]">
                <span>Total items: {totalItems}</span>
                <span>Total: ₹{totalAmount}</span>
              </div>
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={!totalItems}
                className={`w-full rounded-xl px-4 py-3 text-base font-bold transition-colors duration-200 ${
                  totalItems
                    ? "bg-[#1FA463] text-white hover:bg-[#1a8a53]"
                    : "bg-[#D9D9D9] text-[#777]"
                }`}
              >
                Order Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
