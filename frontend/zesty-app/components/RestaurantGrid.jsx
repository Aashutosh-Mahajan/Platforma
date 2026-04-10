import { useEffect, useMemo, useState } from "react";

import RestaurantCard from "./RestaurantCard";
import { useCartStore } from "../store/cartStore";

const VEG_MENU_LIBRARY = [
  {
    name: "Paneer Tikka Bowl",
    description: "Smoky paneer cubes tossed with onions, peppers, and mint chutney.",
    price: 229,
  },
  {
    name: "Veg Dum Biryani",
    description: "Fragrant long-grain rice layered with vegetables and saffron.",
    price: 199,
  },
  {
    name: "Masala Dosa",
    description: "Crispy dosa with potato masala, chutney, and sambhar.",
    price: 149,
  },
  {
    name: "Chole Kulcha",
    description: "Punjabi-style chickpea curry with soft kulchas.",
    price: 169,
  },
];

const MIXED_MENU_LIBRARY = [
  {
    name: "Chicken Dum Biryani",
    description: "Spiced basmati rice layered with tender chicken and herbs.",
    price: 269,
  },
  {
    name: "Butter Chicken",
    description: "Tandoor-grilled chicken in a silky tomato butter gravy.",
    price: 289,
  },
  {
    name: "Chicken Kathi Roll",
    description: "Juicy chicken strips wrapped in a flaky paratha.",
    price: 189,
  },
  {
    name: "Fish Fry Meal",
    description: "Crispy fish fillets served with lemon rice and salad.",
    price: 259,
  },
];

function toPrice(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeMenuItems(restaurant) {
  const explicitMenu = Array.isArray(restaurant?.menu_items)
    ? restaurant.menu_items
    : Array.isArray(restaurant?.menuItems)
      ? restaurant.menuItems
      : Array.isArray(restaurant?.menu)
        ? restaurant.menu
        : [];

  const baseId = restaurant?.id || restaurant?.osm_id || restaurant?.name || "restaurant";

  if (explicitMenu.length > 0) {
    return explicitMenu
      .map((item, index) => {
        const price = toPrice(item?.price ?? item?.amount, 0);

        return {
          id: item?.id ?? `${baseId}-menu-${index}`,
          name: item?.name || item?.title || `Menu Item ${index + 1}`,
          description: item?.description || item?.desc || "",
          price,
        };
      })
      .filter((item) => item.price > 0);
  }

  const fallbackMenu = restaurant?.veg_only ? VEG_MENU_LIBRARY : MIXED_MENU_LIBRARY;

  return fallbackMenu.map((item, index) => ({
    id: `${baseId}-fallback-${index}`,
    name: item.name,
    description: item.description,
    price: item.price,
  }));
}

export default function RestaurantGrid({ restaurants = [] }) {
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [pendingRestaurantSwitch, setPendingRestaurantSwitch] = useState(null);

  const cartRestaurantId = useCartStore((state) => state.restaurantId);
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const getSubtotal = useCartStore((state) => state.getSubtotal);

  const selectedRestaurantId = selectedRestaurant?.id ?? selectedRestaurant?.osm_id ?? null;

  const menuItems = useMemo(
    () => (selectedRestaurant ? normalizeMenuItems(selectedRestaurant) : []),
    [selectedRestaurant],
  );

  const totalCartItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const currentRestaurantName = useMemo(() => {
    if (cartRestaurantId === null) {
      return "another restaurant";
    }

    const matchedRestaurant = restaurants.find(
      (restaurant) => String(restaurant?.id ?? restaurant?.osm_id) === String(cartRestaurantId),
    );

    return matchedRestaurant?.name || `Restaurant ${cartRestaurantId}`;
  }, [cartRestaurantId, restaurants]);

  const closeMenu = () => {
    setSelectedRestaurant(null);
    setPendingRestaurantSwitch(null);
  };

  useEffect(() => {
    if (!selectedRestaurant) {
      return undefined;
    }

    const onEscape = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [selectedRestaurant]);

  const pushMenuItemToCart = (restaurantId, menuItem) => {
    addItem(restaurantId, {
      id: menuItem.id,
      name: menuItem.name,
      price: toPrice(menuItem.price, 0),
      quantity: 1,
    });
  };

  const handleAddItem = (menuItem) => {
    if (selectedRestaurantId === null) {
      return;
    }

    const isDifferentRestaurant =
      cartRestaurantId !== null && String(cartRestaurantId) !== String(selectedRestaurantId);

    if (cartItems.length > 0 && isDifferentRestaurant) {
      setPendingRestaurantSwitch({
        restaurantId: selectedRestaurantId,
        menuItem,
      });
      return;
    }

    pushMenuItemToCart(selectedRestaurantId, menuItem);
  };

  const confirmRestaurantSwitch = () => {
    if (!pendingRestaurantSwitch) {
      return;
    }

    clearCart();
    pushMenuItemToCart(
      pendingRestaurantSwitch.restaurantId,
      pendingRestaurantSwitch.menuItem,
    );
    setPendingRestaurantSwitch(null);
  };

  if (!restaurants.length) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#F0E0E0] bg-white/80 p-10 text-center">
        <div className="mb-3 text-3xl">🍽️</div>
        <p className="text-base font-semibold text-[#E23744]">No restaurants found</p>
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
            onViewMenu={setSelectedRestaurant}
          />
        ))}
      </div>

      {selectedRestaurant ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1b1b1b]/50 px-4 pb-6 pt-20 md:items-center">
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeMenu}
            aria-label="Close menu"
          />

          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-[#ffd8d7] bg-white shadow-[0_32px_70px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between border-b border-[#ffe3e2] px-5 py-4">
              <div>
                <h3 className="text-xl font-black text-[#1B1B1B]">{selectedRestaurant.name}</h3>
                <p className="mt-1 text-sm text-[#7a5a59]">Choose items and add to your cart</p>
              </div>
              <button
                type="button"
                onClick={closeMenu}
                className="rounded-full border border-[#f3cdcc] px-3 py-1 text-sm font-semibold text-[#9f2330] hover:bg-[#fff2f2]"
              >
                Close
              </button>
            </div>

            {pendingRestaurantSwitch ? (
              <div className="mx-5 mt-4 rounded-xl border border-[#fecaca] bg-[#fff5f5] p-4">
                <p className="text-sm font-semibold text-[#a61f2d]">
                  Your cart has items from {currentRestaurantName}. Clear cart and switch?
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={confirmRestaurantSwitch}
                    className="rounded-lg bg-[#d62839] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#b81f2f]"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingRestaurantSwitch(null)}
                    className="rounded-lg border border-[#f3cdcc] bg-white px-3 py-1.5 text-xs font-semibold text-[#8d3f3f] hover:bg-[#fff0f0]"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : null}

            <div className="max-h-[56vh] space-y-3 overflow-y-auto px-5 py-4">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#ffe2e1] bg-[#fffdfd] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-[#1B1B1B]">{item.name}</p>
                      {item.description ? (
                        <p className="mt-1 text-sm text-[#6d4f4e]">{item.description}</p>
                      ) : null}
                      <p className="mt-2 text-sm font-semibold text-[#b7122a]">₹{item.price.toFixed(2)}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddItem(item)}
                      className="shrink-0 rounded-lg bg-gradient-to-r from-[#ff7a28] to-[#e23744] px-3 py-1.5 text-sm font-bold text-white shadow-[0_8px_14px_rgba(226,55,68,0.24)] hover:from-[#ff8b3d] hover:to-[#ef4855]"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#ffe3e2] bg-[#fff9f9] px-5 py-4">
              <p className="text-sm font-semibold text-[#714f4f]">
                Cart: {totalCartItems} item{totalCartItems === 1 ? "" : "s"} | Subtotal ₹{getSubtotal().toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}